/**
 * 基于规则的自然语言转SQL解析器
 * 支持多表类型，根据表类型推断列名，关键词直接生成SQL
 */

export interface ParsedQuery {
  sql: string
  confidence: number
  matchedPattern?: string
  error?: string
}

interface FieldMap {
  [keyword: string]: string[]  // 关键词 → 可能的列名列表（按优先级）
}

interface TableContext {
  tableName: string
  tableType: string           // 'transaction' | 'ecommerce' | 'user' | 'support' | ...
  fields: string[]             // 实际列名
  typeHints?: {               // 可选的类型提示
    amount?: string
    date?: string
    user?: string
    category?: string
    status?: string
    payment?: string
    product?: string
  }
}

interface NLPattern {
  // 支持中文 + 英文关键词
  keywords: RegExp
  // 模糊关键词列表（优先级更高，分数达标则跳过 regex）
  terms?: string[]
  tableTypes: string[]         // 适用的表类型，'*' 表示全部
  describe: (ctx: TableContext) => string | null  // 返回SQL或null
  confidence: number
  hint: string                // 示例问法
}

// ─── 模糊匹配器 ────────────────────────────────────────────────────────

/**
 * 计算 query 对 terms 列表的匹配分数
 * - 完全包含：+2 分（中文按完整词匹配，英文大小写不敏感）
 * - 包含任意 2 个连续字符：+1 分（捕获同义词碎片，如"退"在"退款"中）
 */
function termScore(query: string, term: string): number {
  const q = query.toLowerCase()
  const t = term.toLowerCase()
  if (q.includes(t)) return 2
  // 中文碎片匹配：term 至少 2 个连续字符出现在 query 中
  if (t.length >= 2) {
    for (let i = 0; i <= t.length - 2; i++) {
      const frag = t.slice(i, i + 2)
      if (q.includes(frag)) return 1
    }
  }
  return 0
}

function fuzzyMatch(query: string, terms: string[]): number {
  return terms.reduce((best, term) => Math.max(best, termScore(query, term)), 0)
}

function bestMatch(patterns: NLPattern[], query: string, tableType: string): NLPattern | null {
  let best: NLPattern | null = null
  let bestScore = 0
  for (const p of patterns) {
    if (p.tableTypes[0] !== '*' && !p.tableTypes.includes(tableType)) continue
    if (!p.terms?.length) continue
    const score = fuzzyMatch(query, p.terms)
    if (score >= bestScore) {
      bestScore = score
      best = p
    }
  }
  // 分数 >= 1 才算有效匹配（即至少有一个完整词匹配，或至少一个碎片词匹配）
  return bestScore >= 1 ? best : null
}

// ─── 关键词 → 列名映射（按表类型）──────────────────────────────────────

function buildFieldMap(fields: string[]): FieldMap {
  const f = fields.map(c => c.toLowerCase())
  const result: FieldMap = {}
  for (const field of fields) {
    const lower = field.toLowerCase()
    // 金额
    if (/^(amount|amt|total|price|cost|fee|revenue|income|sales|gmv|profit|expense|budget|margin|tvl|volume|charge|payment_amount|order_amount|order_total)$/i.test(lower))
      (result['金额'] ??= []).push(field)
    // 时间
    if (/(^|_)(date|time|created|updated|at$|timestamp|period|dt|day|month|year|week|txn_time|created_at|updated_at)$/i.test(lower))
      (result['时间'] ??= []).push(field)
    // 用户
    if (/(^|_)(user|customer|member|account|uid|customer|client|visitor)(_?)(id|no)?$/i.test(lower))
      (result['用户'] ??= []).push(field)
    // 分类
    if (/(^|_)(category|type$|tag|segment|industry|grade|level|channel|source|medium|platform|region|city|province|area)$/i.test(lower))
      (result['分类'] ??= []).push(field)
    // 状态
    if (/status|state|step|stage|result|flag|condition/i.test(lower))
      (result['状态'] ??= []).push(field)
    // 支付
    if (/payment|method|pay|bank|card|wallet|currency/i.test(lower))
      (result['支付方式'] ??= []).push(field)
    // 商品
    if (/(^|_)(product|item|sku|goods|article|title|name)(_?)(id|name)?$/i.test(lower))
      (result['商品'] ??= []).push(field)
    // ID类
    if (/^(id|uuid|txn_id|order_id|user_id|ticket_id|msg_id)$/i.test(lower))
      (result['ID'] ??= []).push(field)
    // 错误/异常
    if (/error|exception|bug|fail|issue|complaint/i.test(lower))
      (result['错误'] ??= []).push(field)
    // 搜索词
    if (/keyword|search|query|term/i.test(lower))
      (result['搜索词'] ??= []).push(field)
    // 评分/NPS
    if (/nps|score|rating|star|point|satisfaction/i.test(lower))
      (result['评分'] ??= []).push(field)
    // 通知类型
    if (/channel|type|method/i.test(lower))
      (result['通知方式'] ??= []).push(field)
  }
  return result
}

function col(fields: string[], fm: FieldMap, key: string): string | null {
  const candidates = fm[key] || []
  // 优先用 fields 中实际存在的
  return candidates.find(c => fields.includes(c)) || candidates[0] || null
}

function q(name: string): string {
  return `"${name}"`
}

// ─── SQL 生成函数 ───────────────────────────────────────────────────────

function genCount(ctx: TableContext, where?: string): string {
  return `SELECT COUNT(*) AS count FROM ${q(ctx.tableName)}${where ? ' WHERE ' + where : ''};`
}

function genSum(ctx: TableContext, valCol: string, groupBy?: string, where?: string): string {
  const select = groupBy
    ? `${q(groupBy)} AS name, SUM(${q(valCol)}) AS value`
    : `SUM(${q(valCol)}) AS total`
  const group = groupBy ? ` GROUP BY ${q(groupBy)} ORDER BY value DESC` : ''
  const cond = where ? ` WHERE ${where}` : ''
  return `SELECT ${select} FROM ${q(ctx.tableName)}${cond}${group};`
}

function genGroupBy(ctx: TableContext, groupCol: string, valCol?: string, where?: string, limit = 20): string {
  const select = valCol
    ? `${q(groupCol)} AS name, SUM(${q(valCol)}) AS value`
    : `${q(groupCol)} AS name, COUNT(*) AS value`
  const cond = where ? ` WHERE ${where}` : ''
  return `SELECT ${select} FROM ${q(ctx.tableName)}${cond} GROUP BY ${q(groupCol)} ORDER BY value DESC LIMIT ${limit};`
}

function genTimeTrend(ctx: TableContext, valCol: string, dateCol: string, where?: string): string {
  const valExpr = valCol ? `SUM(${q(valCol)})` : 'COUNT(*)'
  const valName = valCol || 'count'
  const cond = where ? ` WHERE ${where}` : ''
  return `SELECT DATE(${q(dateCol)}) AS period, ${valExpr} AS value FROM ${q(ctx.tableName)}${cond} GROUP BY DATE(${q(dateCol)}) ORDER BY period ASC LIMIT 100;`
}

function genMonthlyTrend(ctx: TableContext, valCol: string, dateCol: string, where?: string): string {
  const valExpr = valCol ? `SUM(${q(valCol)})` : 'COUNT(*)'
  const valName = valCol || 'count'
  const cond = where ? ` WHERE ${where}` : ''
  return `SELECT strftime('%Y-%m', ${q(dateCol)}) AS period, ${valExpr} AS value FROM ${q(ctx.tableName)}${cond} GROUP BY period ORDER BY period ASC LIMIT 24;`
}

function genTopN(ctx: TableContext, groupCol: string, valCol: string, limit = 20): string {
  return `SELECT ${q(groupCol)} AS name, SUM(${q(valCol)}) AS value FROM ${q(ctx.tableName)} WHERE ${q(groupCol)} IS NOT NULL GROUP BY ${q(groupCol)} ORDER BY value DESC LIMIT ${limit};`
}

function genTimeWhere(dateCol: string, days?: number): string {
  if (days) return `${q(dateCol)} >= date('now', '-${days} days')`
  return `${q(dateCol)} >= date('now', '-30 days')`
}

function genStatusDist(ctx: TableContext, statusCol: string, where?: string): string {
  const cond = where ? ` WHERE ${where}` : ''
  return `SELECT ${q(statusCol)} AS name, COUNT(*) AS value FROM ${q(ctx.tableName)}${cond} GROUP BY ${q(statusCol)} ORDER BY value DESC;`
}

// ─── 通用解析规则 ───────────────────────────────────────────────────────

const GENERIC_PATTERNS: NLPattern[] = [
  // 计数
  {
    keywords: /总共有多少|有多少|记录数|共多少条/i,
    terms: ['多少', '总数', '记录', '共', '数量', 'count'],
    tableTypes: ['*'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const where = col(ctx.fields, fm, '时间')
      return genCount(ctx, where ? `${q(where)} >= date('now', '-30 days')` : undefined)
    },
    confidence: 0.95,
    hint: '"总共有多少记录"',
  },
  // TOP N
  {
    keywords: /(?:前|top|排行)\s*(\d+)\s*(?:名|个|条)?|排名\s*前\s*(\d+)/i,
    terms: ['前', 'top', '排行', '排名', '第', 'n'],
    tableTypes: ['*'],
    describe: (ctx) => {
      const limit = parseInt(/(\d+)/.exec(ctx.tableName + '1')?.[1] || '10')
      const fm = buildFieldMap(ctx.fields)
      const groupCol = col(ctx.fields, fm, '分类') || col(ctx.fields, fm, '用户')
      const valCol = col(ctx.fields, fm, '金额')
      if (!groupCol) return null
      return genTopN(ctx, groupCol, valCol || 'id', limit)
    },
    confidence: 0.85,
    hint: '"前10名"',
  },
  // 按X分组统计
  {
    keywords: /按(.+?)(?:分组|分类|统计)/,
    terms: ['按', '分组', '分类', '统计', '汇总', '分布'],
    tableTypes: ['*'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const valCol = col(ctx.fields, fm, '金额') || col(ctx.fields, fm, '用户')
      const groupCol = col(ctx.fields, fm, '分类')
      if (!groupCol) return null
      return genGroupBy(ctx, groupCol, valCol || undefined)
    },
    confidence: 0.85,
    hint: '"按渠道分组统计"',
  },
  // 趋势
  {
    keywords: /趋势|变化|走势/i,
    terms: ['趋势', '变化', '走势', '趋势变化'],
    tableTypes: ['*'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const dateCol = col(ctx.fields, fm, '时间')
      const valCol = col(ctx.fields, fm, '金额')
      if (!dateCol) return null
      return genMonthlyTrend(ctx, valCol || 'id', dateCol)
    },
    confidence: 0.9,
    hint: '"查看趋势变化"',
  },
  // 时间筛选
  {
    keywords: /(?:最近|过去|这)(?:(\d+)天?|一个月|三个月|一年)/i,
    terms: ['最近', '过去', '这', '天', '月', '年', '日内'],
    tableTypes: ['*'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const dateCol = col(ctx.fields, fm, '时间')
      if (!dateCol) return null
      return genMonthlyTrend(ctx, col(ctx.fields, fm, '金额') || 'id', dateCol)
    },
    confidence: 0.9,
    hint: '"最近7天"',
  },
]

// ─── 记账交易表规则 ─────────────────────────────────────────────────────

const TRANSACTION_PATTERNS: NLPattern[] = [
  {
    keywords: /总(收入|支出|交易|消费|流水)|交易总(额|数)|总(金额|流水)/i,
    terms: ['总收入', '总支出', '总金额', '交易', '流水', '消费额', '收支'],
    tableTypes: ['transaction'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const amtCol = col(ctx.fields, fm, '金额')
      const dateCol = col(ctx.fields, fm, '时间')
      if (!amtCol) return null
      const where = dateCol ? genTimeWhere(dateCol, 30) : undefined
      return amtCol ? genSum(ctx, amtCol, undefined, where) : null
    },
    confidence: 0.95,
    hint: '"总收入是多少"',
  },
  {
    keywords: /退款|退款的?|退款率|refund/i,
    terms: ['退款', '退钱', '退款率', '退了多少钱', '退了多少', 'refund'],
    tableTypes: ['transaction', 'ecommerce'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const statusCol = col(ctx.fields, fm, '状态')
      if (!statusCol) return null
      return genStatusDist(ctx, statusCol)
    },
    confidence: 0.95,
    hint: '"退款率多少"',
  },
  {
    keywords: /按(品类|分类|类型|支付方式|渠道)(?:统计|分析|分组)?/i,
    terms: ['按品类', '按分类', '按类型', '按渠道', '按状态', '按来源'],
    tableTypes: ['transaction'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const groupCol = col(ctx.fields, fm, '分类') || col(ctx.fields, fm, '支付方式')
      const amtCol = col(ctx.fields, fm, '金额')
      if (!groupCol) return null
      return genGroupBy(ctx, groupCol, amtCol || undefined)
    },
    confidence: 0.9,
    hint: '"按支付方式统计"',
  },
  {
    keywords: /每月|按月|月份|月度/,
    terms: ['每月', '按月', '月份', '月度', '月统计'],
    tableTypes: ['transaction'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const dateCol = col(ctx.fields, fm, '时间')
      const amtCol = col(ctx.fields, fm, '金额')
      if (!dateCol) return null
      return genMonthlyTrend(ctx, amtCol || 'id', dateCol)
    },
    confidence: 0.9,
    hint: '"按月统计"',
  },
  {
    keywords: /支付方式|付款方式|收款方式|用什么付/i,
    terms: ['支付', '付款', '收款', '用什么付', '支付方式', '微信', '支付宝', '银行卡'],
    tableTypes: ['transaction'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const payCol = col(ctx.fields, fm, '支付方式')
      const amtCol = col(ctx.fields, fm, '金额')
      if (!payCol) return null
      return genGroupBy(ctx, payCol, amtCol || undefined)
    },
    confidence: 0.95,
    hint: '"支付方式分布"',
  },
  {
    keywords: /最大|最高|峰值|top\s*1/i,
    terms: ['最大', '最高', '峰值', '最大金额', '最多'],
    tableTypes: ['transaction'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const amtCol = col(ctx.fields, fm, '金额')
      if (!amtCol) return null
      return `SELECT MAX(${q(amtCol)}) AS max_value FROM ${q(ctx.tableName)};`
    },
    confidence: 0.9,
    hint: '"最大金额"',
  },
]

// ─── 电商/订单表规则 ───────────────────────────────────────────────────

const ECOMMERCE_PATTERNS: NLPattern[] = [
  {
    keywords: /订单数|总订单|成交|成交额|gmv|销售额/i,
    terms: ['订单', '成交', '销售额', 'gmv', '成交额', '卖了多少', '卖出去', '卖了'],
    tableTypes: ['ecommerce'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const amtCol = col(ctx.fields, fm, '金额')
      const dateCol = col(ctx.fields, fm, '时间')
      if (!amtCol) return null
      const where = dateCol ? genTimeWhere(dateCol, 30) : undefined
      return genSum(ctx, amtCol, undefined, where)
    },
    confidence: 0.95,
    hint: '"总销售额"',
  },
  {
    keywords: /客单价|人均消费|平均(订单)?金额/i,
    terms: ['客单', '人均', '平均金额', '每单多少', '平均每单', '人均消费'],
    tableTypes: ['ecommerce'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const amtCol = col(ctx.fields, fm, '金额')
      const userCol = col(ctx.fields, fm, '用户')
      if (!amtCol) return null
      if (userCol) {
        return `SELECT ROUND(SUM(${q(amtCol)}) / COUNT(DISTINCT ${q(userCol)}), 2) AS avg_per_user FROM ${q(ctx.tableName)};`
      }
      return `SELECT ROUND(AVG(${q(amtCol)}), 2) AS avg_amount FROM ${q(ctx.tableName)};`
    },
    confidence: 0.9,
    hint: '"客单价"',
  },
  {
    keywords: /复购|重复购买|回头客|复购率/i,
    terms: ['复购', '回头', '重复购买', '买多次', '买了几次', '回头客'],
    tableTypes: ['ecommerce'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const userCol = col(ctx.fields, fm, '用户')
      if (!userCol) return null
      return `SELECT ${q(userCol)}, COUNT(*) AS order_count FROM ${q(ctx.tableName)} GROUP BY ${q(userCol)} HAVING order_count > 1 ORDER BY order_count DESC LIMIT 20;`
    },
    confidence: 0.9,
    hint: '"复购率"',
  },
  {
    keywords: /按(商品|品类|类目|分类)(?:销售|统计|分析)?/i,
    terms: ['按商品', '按品类', '按类目', '按分类', '商品销量', '品类销售'],
    tableTypes: ['ecommerce'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const catCol = col(ctx.fields, fm, '商品') || col(ctx.fields, fm, '分类')
      const amtCol = col(ctx.fields, fm, '金额')
      if (!catCol) return null
      return genGroupBy(ctx, catCol, amtCol || undefined)
    },
    confidence: 0.9,
    hint: '"按品类统计销售额"',
  },
]

// ─── 工单/客服表规则 ──────────────────────────────────────────────────

const SUPPORT_PATTERNS: NLPattern[] = [
  {
    keywords: /工单|客服|问题|投诉|ticket|issue/i,
    terms: ['工单', '客服', '问题', '投诉', 'case', 'issue', '售后', '咨询', '请求'],
    tableTypes: ['support'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const statusCol = col(ctx.fields, fm, '状态')
      const dateCol = col(ctx.fields, fm, '时间')
      if (!statusCol) return null
      const where = dateCol ? genTimeWhere(dateCol, 30) : undefined
      return genStatusDist(ctx, statusCol, where)
    },
    confidence: 0.9,
    hint: '"工单统计"',
  },
  {
    keywords: /处理中|待处理|已完成|已关闭|未回复/i,
    terms: ['处理中', '待处理', '已完成', '已关闭', '未回复', '待回复', '挂起', '进行中'],
    tableTypes: ['support'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const statusCol = col(ctx.fields, fm, '状态')
      if (!statusCol) return null
      return `SELECT ${q(statusCol)} AS name, COUNT(*) AS value FROM ${q(ctx.tableName)} GROUP BY ${q(statusCol)} ORDER BY value DESC;`
    },
    confidence: 0.95,
    hint: '"处理中的工单"',
  },
  {
    keywords: /按(类型|类目|优先级|来源)(?:统计|分类)?/i,
    terms: ['按类型', '按优先级', '按来源', '类型分布', '优先级分布'],
    tableTypes: ['support'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const catCol = col(ctx.fields, fm, '分类')
      if (!catCol) return null
      return genGroupBy(ctx, catCol)
    },
    confidence: 0.9,
    hint: '"按类型统计工单"',
  },
  {
    keywords: /响应|回复|解决|耗时|时效/i,
    terms: ['响应', '回复', '解决', '耗时', '时效', '处理时间', '多久', '响应速度'],
    tableTypes: ['support'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const statusCol = col(ctx.fields, fm, '状态')
      if (!statusCol) return null
      return genStatusDist(ctx, statusCol)
    },
    confidence: 0.85,
    hint: '"工单响应时效"',
  },
]

// ─── 通知/消息表规则 ───────────────────────────────────────────────────

const NOTIFICATION_PATTERNS: NLPattern[] = [
  {
    keywords: /发送|推送|通知|消息|发送量|发送统计/i,
    terms: ['发送', '推送', '通知', '消息', '发送量', '发出去', '已发送', '送达'],
    tableTypes: ['notification'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const dateCol = col(ctx.fields, fm, '时间')
      const typeCol = col(ctx.fields, fm, '通知方式') || col(ctx.fields, fm, '分类')
      if (!dateCol) return null
      if (typeCol) return genGroupBy(ctx, typeCol)
      return `SELECT DATE(${q(dateCol)}) AS period, COUNT(*) AS value FROM ${q(ctx.tableName)} GROUP BY period ORDER BY period DESC LIMIT 30;`
    },
    confidence: 0.95,
    hint: '"发送量统计"',
  },
  {
    keywords: /打开|点击|转化|阅读|已读/i,
    terms: ['打开', '点击', '转化', '阅读', '已读', '阅读量', '点开', '阅读率'],
    tableTypes: ['notification'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const statusCol = col(ctx.fields, fm, '状态')
      if (!statusCol) return null
      return genStatusDist(ctx, statusCol)
    },
    confidence: 0.9,
    hint: '"通知打开率"',
  },
  {
    keywords: /(?:哪种|哪个|什么)(?:类型|渠道|方式)最多|最常用/i,
    terms: ['哪种', '哪个', '什么', '最多', '最常用', '常用', '哪个最多', '什么渠道'],
    tableTypes: ['notification'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const typeCol = col(ctx.fields, fm, '通知方式') || col(ctx.fields, fm, '分类')
      if (!typeCol) return null
      return `SELECT ${q(typeCol)} AS name, COUNT(*) AS value FROM ${q(ctx.tableName)} GROUP BY ${q(typeCol)} ORDER BY value DESC LIMIT 10;`
    },
    confidence: 0.9,
    hint: '"哪种通知方式最多"',
  },
]

// ─── 评价/评分表规则 ───────────────────────────────────────────────────

const REVIEW_PATTERNS: NLPattern[] = [
  {
    keywords: /评分|nps|满意度|好评|差评|星级|score|rating/i,
    terms: ['评分', '满意度', '好评', '差评', '星级', 'nps', '分数', '几分', '评价'],
    tableTypes: ['review'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const scoreCol = col(ctx.fields, fm, '评分')
      if (!scoreCol) return null
      return `SELECT ROUND(AVG(${q(scoreCol)}), 2) AS avg_score, MIN(${q(scoreCol)}) AS min_score, MAX(${q(scoreCol)}) AS max_score FROM ${q(ctx.tableName)};`
    },
    confidence: 0.95,
    hint: '"平均评分"',
  },
  {
    keywords: /好评率|差评率|评分分布|各星级/i,
    terms: ['好评率', '差评率', '评分分布', '各星级', '五星', '四星', '三星', '评分占比'],
    tableTypes: ['review'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const scoreCol = col(ctx.fields, fm, '评分')
      if (!scoreCol) return null
      return `SELECT ${q(scoreCol)} AS name, COUNT(*) AS value FROM ${q(ctx.tableName)} GROUP BY ${q(scoreCol)} ORDER BY name DESC;`
    },
    confidence: 0.9,
    hint: '"评分分布"',
  },
  {
    keywords: /按(商品|品类|类型|商家)(?:统计|分析)?/i,
    terms: ['按商品', '按品类', '按商家', '按类型', '商品统计', '商家评分'],
    tableTypes: ['review'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const catCol = col(ctx.fields, fm, '商品') || col(ctx.fields, fm, '分类')
      const scoreCol = col(ctx.fields, fm, '评分')
      if (!catCol) return null
      if (scoreCol) return `SELECT ${q(catCol)} AS name, ROUND(AVG(${q(scoreCol)}), 2) AS value FROM ${q(ctx.tableName)} GROUP BY ${q(catCol)} ORDER BY value DESC LIMIT 20;`
      return genGroupBy(ctx, catCol)
    },
    confidence: 0.9,
    hint: '"按商品统计评分"',
  },
]

// ─── 会话/登录表规则 ───────────────────────────────────────────────────

const SESSION_PATTERNS: NLPattern[] = [
  {
    keywords: /登录|会话|在线|活跃|session|login|online/i,
    terms: ['登录', '会话', '在线', '活跃', 'login', 'logout', '登出', '登录记录'],
    tableTypes: ['session'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const dateCol = col(ctx.fields, fm, '时间')
      if (!dateCol) return null
      return `SELECT DATE(${q(dateCol)}) AS period, COUNT(*) AS value FROM ${q(ctx.tableName)} GROUP BY period ORDER BY period DESC LIMIT 30;`
    },
    confidence: 0.9,
    hint: '"登录趋势"',
  },
{
    keywords: /(?:每|各)?小时|高峰|时段|几点/i,
    terms: ['小时', '高峰', '时段', '几点', '几点高峰', '几点登录', '几点活跃', '几点在线'],
    tableTypes: ['session'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const dateCol = col(ctx.fields, fm, '时间')
      if (!dateCol) return null
      return `SELECT strftime('%H', ${q(dateCol)}) AS hour, COUNT(*) AS value FROM ${q(ctx.tableName)} GROUP BY hour ORDER BY value DESC;`
    },
    confidence: 0.9,
    hint: '"高峰时段"',
  },
]

// ─── 用户行为表规则 ─────────────────────────────────────────────────────

const BEHAVIOR_PATTERNS: NLPattern[] = [
  {
    keywords: /(?:功能|页面|事件|行为)(?:使用|访问|点击)?(?:最多|排行|统计)?/i,
    terms: ['功能', '页面', '事件', '行为', '使用', '访问', '点击', '最多', '排行', '统计'],
    tableTypes: ['conversion', 'operations'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const catCol = col(ctx.fields, fm, '分类') || col(ctx.fields, fm, '用户')
      if (!catCol) return null
      return genGroupBy(ctx, catCol)
    },
    confidence: 0.9,
    hint: '"功能使用排行"',
  },
{
    keywords: /错误|异常|失败|bug|error/i,
    terms: ['错误', '异常', '失败', 'bug', 'error', '报错', '出问题', '故障'],
    tableTypes: ['operations'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const errCol = col(ctx.fields, fm, '错误')
      if (!errCol) return null
      return genGroupBy(ctx, errCol)
    },
    confidence: 0.95,
    hint: '"错误排行榜"',
  },
]

// ─── 库存表规则 ─────────────────────────────────────────────────────────

const INVENTORY_PATTERNS: NLPattern[] = [
  {
    keywords: /库存|备货|缺货|入库|出库|inventory|stock/i,
    terms: ['库存', '备货', '缺货', '入库', '出库', 'stock', '库存量', '库存统计'],
    tableTypes: ['inventory', 'inventory_log'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const catCol = col(ctx.fields, fm, '商品') || col(ctx.fields, fm, '分类')
      if (catCol) return genGroupBy(ctx, catCol)
      return genCount(ctx)
    },
    confidence: 0.9,
    hint: '"库存统计"',
  },
  {
    keywords: /入库|入库量|采购|inbound|receive/i,
    terms: ['入库', '入库量', '采购', '进货', '收货'],
    tableTypes: ['inventory_log'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const catCol = col(ctx.fields, fm, '分类')
      if (!catCol) return null
      return genGroupBy(ctx, catCol)
    },
    confidence: 0.9,
    hint: '"入库统计"',
  },
  {
    keywords: /出库|出库量|发货|销售出库|outbound|ship/i,
    terms: ['出库', '出库量', '发货', 'ship'],
    tableTypes: ['inventory_log'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const catCol = col(ctx.fields, fm, '分类')
      if (!catCol) return null
      return genGroupBy(ctx, catCol)
    },
    confidence: 0.9,
    hint: '"出库统计"',
  },
]

// ─── 用户分析表规则 ────────────────────────────────────────────────────

const USER_PATTERNS: NLPattern[] = [
  {
    keywords: /新增|新用户|注册|sign\s*up|signup|register/i,
    terms: ['新增', '新用户', '注册', 'sign up', 'signup', 'register', '新注册', '新增用户'],
    tableTypes: ['retention', 'growth'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const dateCol = col(ctx.fields, fm, '时间')
      if (!dateCol) return null
      return `SELECT DATE(${q(dateCol)}) AS period, COUNT(*) AS value FROM ${q(ctx.tableName)} GROUP BY period ORDER BY period DESC LIMIT 30;`
    },
    confidence: 0.95,
    hint: '"新增用户趋势"',
  },
  {
    keywords: /活跃|活跃用户|日活|DAU|dau/i,
    terms: ['活跃', '活跃用户', '日活', 'DAU', 'dau', '在线人数', '在线用户'],
    tableTypes: ['retention', 'growth'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const dateCol = col(ctx.fields, fm, '时间')
      const userCol = col(ctx.fields, fm, '用户')
      if (!dateCol) return null
      const userExpr = userCol ? `COUNT(DISTINCT ${q(userCol)})` : 'COUNT(*)'
      return `SELECT DATE(${q(dateCol)}) AS period, ${userExpr} AS value FROM ${q(ctx.tableName)} GROUP BY period ORDER BY period DESC LIMIT 30;`
    },
    confidence: 0.95,
    hint: '"DAU是多少"',
  },
  {
    keywords: /留存|留存率|retention/i,
    terms: ['留存', '留存率', 'retention', '次日留存', '七日留存', '月留存'],
    tableTypes: ['retention'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const dateCol = col(ctx.fields, fm, '时间')
      if (!dateCol) return null
      return `SELECT DATE(${q(dateCol)}) AS period, COUNT(*) AS value FROM ${q(ctx.tableName)} WHERE ${q(dateCol)} >= date('now', '-30 days') GROUP BY period ORDER BY period DESC;`
    },
    confidence: 0.9,
    hint: '"留存率"',
  },
  {
    keywords: /流失|流失率|churn/i,
    terms: ['流失', '流失率', 'churn', '用户流失', '流失用户'],
    tableTypes: ['retention', 'saas'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const statusCol = col(ctx.fields, fm, '状态')
      if (!statusCol) return null
      return genStatusDist(ctx, statusCol)
    },
    confidence: 0.9,
    hint: '"流失率"',
  },
]

// ─── 搜索词规则 ─────────────────────────────────────────────────────────

const SEARCH_PATTERNS: NLPattern[] = [
  {
    keywords: /热搜|热词|搜索词|关键词|搜索排行|keyword|search\s*term/i,
    terms: ['热搜', '热词', '搜索词', '关键词', '搜索排行', 'keyword', '热词排行', '搜索热词'],
    tableTypes: ['content'],
    describe: (ctx) => {
      const fm = buildFieldMap(ctx.fields)
      const kwCol = col(ctx.fields, fm, '搜索词')
      if (!kwCol) return null
      return `SELECT ${q(kwCol)} AS name, COUNT(*) AS value FROM ${q(ctx.tableName)} WHERE ${q(kwCol)} IS NOT NULL AND ${q(kwCol)} != '' GROUP BY ${q(kwCol)} ORDER BY value DESC LIMIT 20;`
    },
    confidence: 0.95,
    hint: '"热搜词排行"',
  },
]

// ─── 主解析器 ───────────────────────────────────────────────────────────

export class RuleBasedNL2SQLParser {
  private context: TableContext = { tableName: 'data', tableType: '', fields: [] }
  private patterns: NLPattern[] = []

  constructor() {
    this.patterns = [
      ...GENERIC_PATTERNS,
      ...TRANSACTION_PATTERNS,
      ...ECOMMERCE_PATTERNS,
      ...SUPPORT_PATTERNS,
      ...NOTIFICATION_PATTERNS,
      ...REVIEW_PATTERNS,
      ...SESSION_PATTERNS,
      ...BEHAVIOR_PATTERNS,
      ...INVENTORY_PATTERNS,
      ...USER_PATTERNS,
      ...SEARCH_PATTERNS,
    ]
  }

  /**
   * 设置表上下文
   */
  public setTableContext(
    tableName: string,
    tableType: string,
    fields: string[],
    typeHints?: TableContext['typeHints']
  ) {
    this.context = { tableName, tableType, fields, typeHints }
  }

  /**
   * 从表名推断表类型
   */
  public inferTableTypeFromName(name: string): string {
    const n = name.toLowerCase()
    if (/transaction|txn|payment|bill|invoice|charge|ledger|entry/.test(n)) return 'transaction'
    if (/order|orders|trade|purchase|cart|checkout/.test(n)) return 'ecommerce'
    if (/event|log|action|activity|audit|click|visit/.test(n)) return 'conversion'
    if (/user|customer|member|account|signup|register/.test(n)) return 'retention'
    if (/ticket|support|issue|complaint|case/.test(n)) return 'support'
    if (/notification|message|email_log|sms|push_log|alert/.test(n)) return 'notification'
    if (/review|rating|comment|feedback/.test(n)) return 'review'
    if (/session|login_log|access_log|online/.test(n)) return 'session'
    if (/inventory_log|stock_log|movement|warehouse|fulfillment/.test(n)) return 'inventory_log'
    if (/product|sku|inventory|stock|goods/.test(n)) return 'inventory'
    if (/revenue|income|profit|sales|gmv/.test(n)) return 'revenue'
    if (/mrr|arr|subscription|trial|churn/.test(n)) return 'saas'
    if (/campaign|channel|seo|ads|marketing/.test(n)) return 'marketing'
    if (/ab_test|experiment|nps|feedback/.test(n)) return 'product'
    if (/employee|staff|hire|headcount/.test(n)) return 'hr'
    if (/page|view|traffic|content|article/.test(n)) return 'content'
    return ''
  }

  /**
   * 解析自然语言查询
   * 优先级：模糊匹配(terms) > 正则匹配(keywords) > 列名兜底
   */
  public parse(nl: string): ParsedQuery {
    const query = nl.trim()

    // 1. 模糊匹配：遍历所有规则的 terms，找最高分
    const fuzzyPattern = bestMatch(this.patterns, query, this.context.tableType)
    if (fuzzyPattern) {
      const sql = fuzzyPattern.describe(this.context)
      if (sql) {
        return { sql, confidence: fuzzyPattern.confidence, matchedPattern: fuzzyPattern.hint }
      }
    }

    // 2. 正则精确匹配
    for (const rule of this.patterns) {
      if (rule.tableTypes[0] !== '*' && !rule.tableTypes.includes(this.context.tableType)) continue
      if (!rule.keywords.test(query)) continue
      const sql = rule.describe(this.context)
      if (sql) {
        return { sql, confidence: rule.confidence, matchedPattern: rule.hint }
      }
    }

    // 3. 兜底：列名猜测（通用 GROUP BY）
    const fm = buildFieldMap(this.context.fields)
    const catCol = col(this.context.fields, fm, '分类')
    if (catCol) {
      const amtCol = col(this.context.fields, fm, '金额')
      return {
        sql: genGroupBy(this.context, catCol, amtCol || undefined),
        confidence: 0.6,
        matchedPattern: `按${catCol}分组统计`,
      }
    }

    // 4. 无法理解
    return {
      sql: '',
      confidence: 0,
      error: `无法理解 "${query}"。支持的问法例如：\n${this.getExamples().join('\n')}`,
    }
  }

  /**
   * 获取当前表类型的示例问法
   */
  public getExamples(): string[] {
    const examples: string[] = ['总共有多少记录', '按X分组统计', '前10名', '最近7天']
    if (!this.context.tableType) return examples

    const tableExamples: Record<string, string[]> = {
      transaction: ['总收入多少', '按支付方式统计', '退款率多少', '按月统计趋势'],
      ecommerce: ['总销售额', '客单价', '按品类统计', '复购率'],
      support: ['工单统计', '处理中的工单', '按类型分组'],
      notification: ['发送量统计', '哪种方式最多', '打开率'],
      review: ['平均评分多少', '好评率', '评分分布'],
      session: ['登录趋势', '高峰时段'],
      conversion: ['功能使用排行', '事件统计'],
      operations: ['错误排行榜', '异常分析'],
      inventory: ['库存统计', '入库出库'],
      inventory_log: ['入库统计', '出库统计'],
      retention: ['新增用户趋势', 'DAU', '留存率'],
      revenue: ['收入趋势', '按月统计'],
      content: ['热搜词排行', '内容流量'],
      marketing: ['渠道ROI', '活动效果'],
      product: ['A/B测试结果', 'NPS评分'],
      hr: ['人员规模', '离职率'],
    }

    return tableExamples[this.context.tableType] || examples
  }

  /**
   * 检查是否支持该查询
   */
  public isSupported(query: string): boolean {
    return this.patterns.some(rule => {
      if (rule.tableTypes[0] !== '*' && !rule.tableTypes.includes(this.context.tableType)) return false
      return rule.keywords.test(query.trim())
    })
  }
}

export const ruleBasedParser = new RuleBasedNL2SQLParser()
