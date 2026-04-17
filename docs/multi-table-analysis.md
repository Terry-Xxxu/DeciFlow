# 多表关联分析功能文档

## 📋 概述

DeciFlow 支持复杂的多表关联分析，能够自动识别表关系、生成 JOIN 查询，并提供深度业务洞察。

## 🚀 核心功能

### 1. 自动表关系识别

系统内置了常见表关系的映射：

```typescript
const predefinedRelationships = [
  {
    fromTable: 'orders',
    fromColumn: 'user_id',
    toTable: 'users',
    toColumn: 'id',
    type: 'many_to_one',
    joinType: 'LEFT JOIN'
  },
  {
    fromTable: 'order_items',
    fromColumn: 'order_id',
    toTable: 'orders',
    toColumn: 'id',
    type: 'many_to_one',
    joinType: 'INNER JOIN'
  },
  {
    fromTable: 'order_items',
    fromColumn: 'product_id',
    toTable: 'products',
    toColumn: 'id',
    type: 'many_to_one',
    joinType: 'INNER JOIN'
  }
]
```

### 2. 自然语言转多表 SQL

支持以下类型的分析：

#### 用户订单分析
- **查询**: "分析每个用户的订单总数和消费金额"
- **生成的 SQL**:
```sql
SELECT 
  t0.id, 
  t0.name, 
  COUNT(t1.id) as order_count,
  SUM(t1.amount) as total_amount
FROM users t0
LEFT JOIN orders t1 ON t0.id = t1.user_id
GROUP BY t0.id, t0.name
ORDER BY order_count DESC
LIMIT 1000
```

#### 产品销售分析
- **查询**: "统计每个产品类别的销售收入"
- **生成的 SQL**:
```sql
SELECT 
  t2.category, 
  t2.name, 
  SUM(t1.quantity * t1.price) as revenue,
  COUNT(DISTINCT t0.id) as order_count
FROM products t2
INNER JOIN order_items t1 ON t2.id = t1.product_id
INNER JOIN orders t0 ON t1.order_id = t0.id
GROUP BY t2.category, t2.name
ORDER BY revenue DESC
LIMIT 1000
```

#### 用户行为分析
- **查询**: "分析用户的购买频率和活跃度"
- **生成的 SQL**:
```sql
SELECT 
  t0.id,
  t0.name,
  COUNT(DISTINCT t1.id) as order_count,
  COUNT(DISTINCT DATE(t1.created_at)) as active_days,
  SUM(t1.amount) as total_spent,
  AVG(t3.quantity) as avg_quantity
FROM users t0
LEFT JOIN orders t1 ON t0.id = t1.user_id
LEFT JOIN order_items t3 ON t1.id = t3.order_id
WHERE t1.created_at >= NOW() - INTERVAL '3 months'
GROUP BY t0.id, t0.name
ORDER BY total_spent DESC
LIMIT 1000
```

## 📊 支持的分析类型

### 1. 基础关联分析
- 单表 → 单表关联
- 单表 → 多表关联
- 多表 → 多表关联

### 2. 复杂业务分析
- 用户生命周期价值 (LTV)
- 产品销售趋势
- 用户留存率分析
- 订单转化率

### 3. 聚合分析
- COUNT() - 计数
- SUM() - 求和
- AVG() - 平均值
- MAX() - 最大值
- MIN() - 最小值

## 🔧 配置选项

### 初始化表关系
```typescript
const analyzer = new MultiTableAnalyzer()
await analyzer.initializeRelationships(databaseConfig)
```

### 自定义关系
```typescript
// 可以根据数据库实际情况添加关系
const customRelationships: TableRelationship[] = [
  {
    fromTable: 'user_sessions',
    fromColumn: 'user_id',
    toTable: 'users',
    toColumn: 'id',
    type: 'many_to_one',
    joinType: 'LEFT JOIN'
  }
]

// 添加到分析器
customRelationships.forEach(rel => {
  analyzer.addRelationship(rel)
})
```

## 🚨 性能优化

### 1. JOIN 顺序优化
```typescript
// 自动优化 JOIN 顺序
const tables = ['users', 'orders', 'order_items', 'products']
const optimizedOrder = analyzer.optimizeJoinOrder(tables)
console.log(optimizedOrder.join(' -> ')) // users -> orders -> order_items -> products
```

### 2. 循环引用检测
```typescript
const hasCircular = analyzer.detectCircularRelationships(['users', 'orders', 'order_items'])
if (hasCircular) {
  console.warn('检测到循环引用，请检查表关系配置')
}
```

### 3. 查询缓存
```typescript
// 查询结果会自动缓存
const query = await analyzer.analyzeQuery('用户订单分析', databaseConfig)

// 清除缓存
analyzer.clearCache()
```

## 📈 使用示例

### 前端集成
```typescript
// 在 React 组件中使用
import { MultiTableAnalyzer } from '@/main/analysis/multi-table-analyzer'

const analyzer = new MultiTableAnalyzer()

const handleQuery = async (naturalLanguage: string) => {
  const query = await analyzer.analyzeQuery(naturalLanguage, databaseConfig)
  
  // 执行查询并显示结果
  const result = await databaseManager.query(databaseConfig, query.sql)
  setAnalysisResult(result)
}
```

### 批量分析
```typescript
const queries = [
  '分析每个用户的订单总数',
  '统计产品类别的销量',
  '计算用户的平均订单金额',
  '分析用户的购买频率'
]

const results = await Promise.all(
  queries.map(query => analyzer.analyzeQuery(query, databaseConfig))
)
```

## 🧪 测试

### 运行测试脚本
```bash
# 测试多表分析功能
node scripts/test-multi-table.ts

# 运行单元测试
npm run test src/test/multi-table-analysis.test.ts
```

### 测试覆盖
- ✅ 自然语言解析
- ✅ SQL 生成
- ✅ 表关系管理
- ✅ 循环引用检测
- ✅ 性能优化
- ✅ 错误处理

## 🔄 扩展功能

### 1. 自定义表关系
```typescript
analyzer.addRelationship({
  fromTable: 'custom_table',
  fromColumn: 'foreign_key',
  toTable: 'target_table',
  toColumn: 'primary_key',
  type: 'many_to_one',
  joinType: 'LEFT JOIN'
})
```

### 2. 复杂指标定义
```typescript
const complexMetrics = {
  customer_lifetime_value: {
    tables: ['users', 'orders'],
    sql: 'AVG(total_amount) * COUNT(DISTINCT session_id) as ltv',
    filters: ['created_at >= NOW() - INTERVAL \'1 year\'']
  }
}

analyzer.addMetric('customer_lifetime_value', complexMetrics)
```

### 3. 自定义查询模板
```typescript
const templates = {
  user_retention: {
    name: '用户留存率',
    sql: `WITH first_orders AS (...),
          second_orders AS (...)
          SELECT retention_rate FROM calculation`,
    description: '计算用户30天留存率'
  }
}

analyzer.addTemplate('user_retention', templates.user_retention)
```

## ⚠️ 注意事项

1. **性能考虑**: 复杂的多表查询可能会影响性能，建议使用 LIMIT 限制结果集大小
2. **权限管理**: 确保数据库用户有足够的权限访问相关表
3. **索引优化**: 建议在关联字段上创建索引以提高查询性能
4. **数据量**: 大数据量查询建议使用分页或分批处理

## 📚 相关文档

- [数据库连接管理](../src/main/database/manager.ts)
- [NL2SQL 服务](../src/main/nl2sql/hybrid-nl2sql-service.ts)
- [分析引擎](../src/main/ai/analysis-engine-v2.ts)
- [数据字典](../src/main/dictionary/data-dictionary.ts)

---

**最后更新**: 2024-04-14  
**维护者**: Terry  
**版本**: 1.0.0