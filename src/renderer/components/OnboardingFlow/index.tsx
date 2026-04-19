/**
 * OnboardingFlow - 数据接入引导流程（支持双模式）
 * 首次使用时的引导，帮助用户快速接入数据
 * v0.app design system - Linear + Vercel styling
 * Updated: 2025-04-18
 */

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, BarChart2, Bot, Lightbulb, FileText, Database, Table2, Lock, CheckCircle2, Server, Cloud, GitBranch, Wand2, Loader2 } from 'lucide-react'
import { SecurityDeclaration } from '../SecurityDeclaration'
import { ConnectionTest } from '../ConnectionTest'
import { useDatabase } from '../../stores/DatabaseStore'

type OnboardingStep = 'welcome' | 'choose-method' | 'sample-data' | 'upload-csv' | 'security-declaration' | 'db-connect-method' | 'connection-test' | 'complete'
type DbConnectMethod = 'direct' | 'ssh' | 'cloud'

interface DbConfig {
  type: string
  host: string
  port: number
  database: string
  username: string
  password?: string
  connectMethod?: DbConnectMethod
  ssl?: boolean
  isSRV?: boolean
  rawConnectionString?: string
  // SSH
  sshHost?: string
  sshPort?: number
  sshUsername?: string
  sshPassword?: string
  sshKey?: string
  sshAuthMode?: 'password' | 'key'
  // Cloud
  provider?: string
  connectionString?: string
}

// ─── 连接字符串解析 & 智能检测 ───────────────────────────────────────────────

/** 已知需要 SSL 的云数据库主机名特征 */
const CLOUD_SSL_PATTERNS = [
  '.neon.tech',           // Neon
  '.supabase.co',         // Supabase
  '.supabase.in',
  '.mongodb.net',         // MongoDB Atlas
  '.planetscale.com',     // PlanetScale
  '.psdb.cloud',
  '.tidbcloud.com',       // TiDB Cloud
  '.cockroachlabs.cloud', // CockroachDB
  '.railway.app',         // Railway
  '.render.com',          // Render
  '.aivencloud.com',      // Aiven
  '.rds.amazonaws.com',   // AWS RDS
  '.database.azure.com',  // Azure Database
  '.database.windows.net',
  '.cloud.google.com',    // Google Cloud SQL
]

function isCloudHost(hostname: string): boolean {
  return CLOUD_SSL_PATTERNS.some(p => hostname.includes(p))
}

interface ParsedConn {
  type: string; host: string; port: number; database: string
  username: string; password: string; ssl: boolean
  isSRV: boolean; rawConnectionString: string
}

const DEFAULT_PORTS: Record<string, number> = {
  postgresql: 5432, postgres: 5432, mysql: 3306,
  mongodb: 27017, redis: 6379,
}

function parseConnectionString(str: string): ParsedConn | null {
  try {
    const url = new URL(str.trim())
    const proto = url.protocol.replace(':', '').toLowerCase()
    const isSRV = proto === 'mongodb+srv'

    let type = 'postgresql'
    if (proto === 'postgresql' || proto === 'postgres') type = 'postgresql'
    else if (proto === 'mysql') type = 'mysql'
    else if (proto === 'mongodb' || isSRV) type = 'mongodb'
    else if (proto === 'redis' || proto === 'rediss') type = 'redis'
    else return null

    const params = new URLSearchParams(url.search)
    const sslMode = params.get('sslmode')
    const ssl = isSRV || proto === 'rediss' ||
                ['require', 'verify-full', 'verify-ca'].includes(sslMode || '') ||
                isCloudHost(url.hostname)

    return {
      type,
      host: url.hostname,
      port: url.port ? parseInt(url.port) : (DEFAULT_PORTS[proto] || 5432),
      database: url.pathname.replace(/^\//, ''),
      username: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
      ssl, isSRV,
      rawConnectionString: str.trim(),
    }
  } catch { return null }
}

// ─── 连接方式选择 Step ────────────────────────────────────────────────────────

interface DbConnectMethodStepProps {
  onSelect: (method: DbConnectMethod) => void
  onBack: () => void
}

const DbConnectMethodStep: React.FC<DbConnectMethodStepProps> = ({ onSelect, onBack }) => {
  const methods = [
    {
      id: 'direct' as const,
      icon: <Server className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      title: '直接连接',
      desc: '直接填写主机、端口、账号连接数据库',
      tags: ['适合内网 / 本地', '配置简单'],
    },
    {
      id: 'ssh' as const,
      icon: <GitBranch className="w-6 h-6 text-violet-600 dark:text-violet-400" />,
      title: 'SSH 隧道',
      desc: '通过跳板机安全连接生产服务器上的数据库',
      tags: ['适合生产环境', '更安全', '需要 SSH 权限'],
    },
    {
      id: 'cloud' as const,
      icon: <Cloud className="w-6 h-6 text-sky-600 dark:text-sky-400" />,
      title: '云数据库',
      desc: '连接 AWS RDS、阿里云、腾讯云等托管数据库服务',
      tags: ['AWS / 阿里云 / 腾讯云', '支持连接字符串', 'SSL 加密'],
    },
  ]

  return (
    <motion.div
      key="db-connect-method"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4 py-2"
    >
      <p className="text-center text-zinc-600 dark:text-zinc-400">请选择你的数据库连接方式</p>

      <div className="space-y-3">
        {methods.map((m) => (
          <motion.button
            key={m.id}
            onClick={() => onSelect(m.id)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full p-5 rounded-xl border text-left transition-all bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold mb-1 text-zinc-900 dark:text-zinc-100">{m.title}</h4>
                <p className="text-sm mb-2 text-zinc-500 dark:text-zinc-400">{m.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {m.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <svg className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        返回
      </button>
    </motion.div>
  )
}

// ─── 数据库配置表单 Step ───────────────────────────────────────────────────────

interface DbFormStepProps {
  connectMethod: DbConnectMethod
  onSubmit: (config: DbConfig) => void
  onBack: () => void
}

const DbFormStep: React.FC<DbFormStepProps> = ({ connectMethod, onSubmit, onBack }) => {
  const [dbType, setDbType] = useState('postgresql')
  const [direct, setDirect] = useState({ host: '', port: 5432, database: '', username: '', password: '', ssl: false, isSRV: false, rawStr: '' })
  const [ssh, setSsh] = useState({ sshHost: '', sshPort: 22, sshUsername: '', sshAuth: 'password' as 'password' | 'key', sshPassword: '', sshKey: '', dbHost: '127.0.0.1', dbPort: 5432, dbName: '', dbUsername: '', dbPassword: '' })
  const [cloud, setCloud] = useState({ provider: 'aws-rds', inputMode: 'fields' as 'fields' | 'string', connectionString: '', host: '', port: 5432, database: '', username: '', password: '', ssl: true })

  // AI 辅助配置
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [showAiHelper, setShowAiHelper] = useState(false)

  const inputCls = `w-full px-3 py-2.5 rounded-xl focus:outline-none focus:border-blue-500/50 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm`
  const labelCls = `block text-xs font-medium mb-1.5 text-zinc-600 dark:text-zinc-400`

  // 自动从连接字符串解析并填充表单
  const applyParsed = (parsed: ParsedConn) => {
    setDbType(parsed.type)
    setDirect({
      host: parsed.host,
      port: parsed.port,
      database: parsed.database,
      username: parsed.username,
      password: parsed.password,
      ssl: parsed.ssl,
      isSRV: parsed.isSRV,
      rawStr: parsed.rawConnectionString,
    })
  }

  const handleConnStrChange = (val: string) => {
    setDirect(prev => ({ ...prev, rawStr: val }))
    if (!val.includes('://')) return
    const parsed = parseConnectionString(val)
    if (parsed) applyParsed(parsed)
  }

  // 主机变化时自动检测是否需要 SSL
  const handleHostChange = (host: string) => {
    const autoSsl = isCloudHost(host)
    setDirect(prev => ({ ...prev, host, ssl: autoSsl || prev.ssl }))
  }

  // SSL 切换
  const SslToggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button type="button" onClick={onChange}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
    >
      <div className="flex items-center gap-3">
        <Lock className="w-4 h-4 text-zinc-400" />
        <div className="text-left">
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">SSL/TLS 加密连接</div>
          <div className="text-xs text-zinc-400">Neon、Supabase、RDS、Atlas 等云数据库需要</div>
        </div>
      </div>
      <div className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </button>
  )

  // AI 辅助配置：让 AI 解析自然语言 / 连接字符串 → 结构化配置
  const handleAiParse = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    setAiError('')
    try {
      const prompt = `你是数据库连接配置助手。请根据用户描述，提取连接参数并返回 JSON，不要有任何解释文字。

用户输入: "${aiQuery}"

JSON 格式（严格遵守，字段均为小写）:
{
  "type": "postgresql|mysql|mongodb|redis|clickhouse",
  "host": "...",
  "port": 数字,
  "database": "...",
  "username": "...",
  "password": "...",
  "ssl": true|false,
  "isSRV": true|false,
  "rawConnectionString": "原始连接字符串（如有）"
}

如果是 mongodb+srv:// 则 isSRV=true，rawConnectionString 填原始字符串。
如果主机含 .neon.tech/.supabase.co/.mongodb.net/.rds.amazonaws.com 等则 ssl=true。`

      const res = await (window as any).electronAPI?.ai?.chat(prompt)
      const text = typeof res === 'string' ? res : (res?.content || '')
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('AI 返回格式有误，请重试')

      const cfg = JSON.parse(match[0])
      setDbType(cfg.type || 'postgresql')
      setDirect({
        host: cfg.host || '',
        port: cfg.port || 5432,
        database: cfg.database || '',
        username: cfg.username || '',
        password: cfg.password || '',
        ssl: !!cfg.ssl,
        isSRV: !!cfg.isSRV,
        rawStr: cfg.rawConnectionString || '',
      })
      setShowAiHelper(false)
      setAiQuery('')
    } catch (e: any) {
      setAiError(e.message || 'AI 解析失败，请检查 AI 配置')
    } finally {
      setAiLoading(false)
    }
  }

  const canSubmit = () => {
    if (connectMethod === 'direct') return !!(direct.host && direct.database && direct.username)
    if (connectMethod === 'ssh') return !!(ssh.sshHost && ssh.sshUsername && ssh.dbName && ssh.dbUsername)
    if (connectMethod === 'cloud') return cloud.inputMode === 'string' ? !!cloud.connectionString : !!(cloud.host && cloud.database && cloud.username)
    return false
  }

  const handleSubmit = () => {
    if (!canSubmit()) return
    if (connectMethod === 'direct') {
      onSubmit({
        type: dbType, host: direct.host, port: direct.port, database: direct.database,
        username: direct.username, password: direct.password,
        ssl: direct.ssl, isSRV: direct.isSRV,
        rawConnectionString: direct.isSRV ? direct.rawStr : undefined,
        connectMethod: 'direct',
      })
    } else if (connectMethod === 'ssh') {
      onSubmit({ type: dbType, host: ssh.dbHost, port: ssh.dbPort, database: ssh.dbName, username: ssh.dbUsername, password: ssh.dbPassword, connectMethod: 'ssh', sshHost: ssh.sshHost, sshPort: ssh.sshPort, sshUsername: ssh.sshUsername, sshAuthMode: ssh.sshAuth, sshPassword: ssh.sshPassword, sshKey: ssh.sshKey })
    } else {
      onSubmit({ type: dbType, host: cloud.host, port: cloud.port, database: cloud.database, username: cloud.username, password: cloud.password, connectMethod: 'cloud', provider: cloud.provider, ssl: cloud.ssl, connectionString: cloud.connectionString })
    }
  }

  const dbTypeSelector = (
    <div>
      <label className={labelCls}>数据库类型</label>
      <select value={dbType} onChange={(e) => setDbType(e.target.value)} className={inputCls}>
        <option value="postgresql">PostgreSQL</option>
        <option value="mysql">MySQL</option>
        <option value="mongodb">MongoDB</option>
        <option value="clickhouse">ClickHouse</option>
        <option value="redis">Redis</option>
        <option value="sqlite">SQLite</option>
      </select>
    </div>
  )

  return (
    <motion.div
      key={`db-form-${connectMethod}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4 py-1"
    >
      {/* 直接连接表单 */}
      {connectMethod === 'direct' && (
        <div className="space-y-3">
          {/* 连接字符串快捷输入 */}
          <div>
            <label className={labelCls}>连接字符串（可选，粘贴后自动解析）</label>
            <input
              type="text"
              placeholder="postgresql://user:pass@host:5432/db?sslmode=require"
              value={direct.rawStr}
              onChange={(e) => handleConnStrChange(e.target.value)}
              className={inputCls}
            />
            <p className="text-xs text-zinc-400 mt-1">支持 postgresql:// mysql:// mongodb+srv:// redis:// 等格式</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            <span className="text-xs text-zinc-400">或逐项填写</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          </div>

          {dbTypeSelector}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>主机地址</label>
              <input type="text" placeholder="localhost 或 ep-xxx.neon.tech" value={direct.host}
                onChange={(e) => handleHostChange(e.target.value)} className={inputCls} />
              {direct.host && isCloudHost(direct.host) && (
                <p className="text-xs text-blue-500 mt-1">检测到云数据库主机，已自动开启 SSL</p>
              )}
            </div>
            <div>
              <label className={labelCls}>端口</label>
              <input type="number" placeholder="5432" value={direct.port} onChange={(e) => setDirect({ ...direct, port: parseInt(e.target.value) || 5432 })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>数据库名</label>
            <input type="text" placeholder="mydb" value={direct.database} onChange={(e) => setDirect({ ...direct, database: e.target.value })} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>用户名</label>
              <input type="text" placeholder="postgres" value={direct.username} onChange={(e) => setDirect({ ...direct, username: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>密码</label>
              <input type="password" placeholder="••••••" value={direct.password} onChange={(e) => setDirect({ ...direct, password: e.target.value })} className={inputCls} />
            </div>
          </div>
          <SslToggle value={direct.ssl} onChange={() => setDirect({ ...direct, ssl: !direct.ssl })} />
        </div>
      )}

      {/* SSH 隧道表单 */}
      {connectMethod === 'ssh' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">SSH 跳板机</span>
            </div>
            <div className="space-y-3 pl-6 border-l-2 border-violet-200 dark:border-violet-800">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>SSH 主机地址</label>
                  <input type="text" placeholder="jump.example.com" value={ssh.sshHost} onChange={(e) => setSsh({ ...ssh, sshHost: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>SSH 端口</label>
                  <input type="number" placeholder="22" value={ssh.sshPort} onChange={(e) => setSsh({ ...ssh, sshPort: parseInt(e.target.value) || 22 })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>SSH 用户名</label>
                <input type="text" placeholder="ubuntu" value={ssh.sshUsername} onChange={(e) => setSsh({ ...ssh, sshUsername: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>认证方式</label>
                <div className="flex gap-2">
                  {(['password', 'key'] as const).map((mode) => (
                    <button key={mode} onClick={() => setSsh({ ...ssh, sshAuth: mode })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${ssh.sshAuth === mode ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-400 dark:border-violet-600 text-violet-700 dark:text-violet-300' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'}`}
                    >{mode === 'password' ? '密码' : '私钥'}</button>
                  ))}
                </div>
              </div>
              {ssh.sshAuth === 'password' ? (
                <div><label className={labelCls}>SSH 密码</label>
                  <input type="password" placeholder="••••••" value={ssh.sshPassword} onChange={(e) => setSsh({ ...ssh, sshPassword: e.target.value })} className={inputCls} /></div>
              ) : (
                <div><label className={labelCls}>私钥内容（PEM 格式）</label>
                  <textarea rows={3} placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;..." value={ssh.sshKey} onChange={(e) => setSsh({ ...ssh, sshKey: e.target.value })} className={`${inputCls} resize-none font-mono text-xs`} /></div>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">数据库（隧道内访问）</span>
            </div>
            <div className="space-y-3 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
              {dbTypeSelector}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>数据库主机</label>
                  <input type="text" placeholder="127.0.0.1" value={ssh.dbHost} onChange={(e) => setSsh({ ...ssh, dbHost: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>端口</label>
                  <input type="number" placeholder="5432" value={ssh.dbPort} onChange={(e) => setSsh({ ...ssh, dbPort: parseInt(e.target.value) || 5432 })} className={inputCls} />
                </div>
              </div>
              <div><label className={labelCls}>数据库名</label>
                <input type="text" placeholder="mydb" value={ssh.dbName} onChange={(e) => setSsh({ ...ssh, dbName: e.target.value })} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>用户名</label>
                  <input type="text" placeholder="postgres" value={ssh.dbUsername} onChange={(e) => setSsh({ ...ssh, dbUsername: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>密码</label>
                  <input type="password" placeholder="••••••" value={ssh.dbPassword} onChange={(e) => setSsh({ ...ssh, dbPassword: e.target.value })} className={inputCls} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 云数据库表单 */}
      {connectMethod === 'cloud' && (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>云服务商</label>
            <select value={cloud.provider} onChange={(e) => setCloud({ ...cloud, provider: e.target.value })} className={inputCls}>
              <option value="aws-rds">AWS RDS</option>
              <option value="gcp-cloudsql">Google Cloud SQL</option>
              <option value="azure-db">Azure Database</option>
              <option value="neon">Neon (PostgreSQL)</option>
              <option value="supabase">Supabase</option>
              <option value="planetscale">PlanetScale (MySQL)</option>
              <option value="tidb-cloud">TiDB Cloud</option>
              <option value="cockroachdb">CockroachDB</option>
              <option value="mongodb-atlas">MongoDB Atlas</option>
              <option value="aiven">Aiven</option>
              <option value="railway">Railway</option>
              <option value="aliyun-rds">阿里云 RDS</option>
              <option value="tencent-db">腾讯云数据库</option>
              <option value="other">其他托管服务</option>
            </select>
          </div>
          {dbTypeSelector}
          <div>
            <label className={labelCls}>填写方式</label>
            <div className="flex gap-2">
              {(['fields', 'string'] as const).map((mode) => (
                <button key={mode} onClick={() => setCloud({ ...cloud, inputMode: mode })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${cloud.inputMode === mode ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-400 dark:border-sky-600 text-sky-700 dark:text-sky-300' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'}`}
                >{mode === 'fields' ? '逐项填写' : '连接字符串'}</button>
              ))}
            </div>
          </div>
          {cloud.inputMode === 'string' ? (
            <div>
              <label className={labelCls}>连接字符串</label>
              <input type="text" placeholder="postgresql://user:pass@host:5432/dbname?sslmode=require" value={cloud.connectionString} onChange={(e) => setCloud({ ...cloud, connectionString: e.target.value })} className={inputCls} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>主机地址</label>
                  <input type="text" placeholder="xxx.rds.amazonaws.com" value={cloud.host} onChange={(e) => setCloud({ ...cloud, host: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>端口</label>
                  <input type="number" placeholder="5432" value={cloud.port} onChange={(e) => setCloud({ ...cloud, port: parseInt(e.target.value) || 5432 })} className={inputCls} />
                </div>
              </div>
              <div><label className={labelCls}>数据库名</label>
                <input type="text" placeholder="mydb" value={cloud.database} onChange={(e) => setCloud({ ...cloud, database: e.target.value })} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>用户名</label>
                  <input type="text" placeholder="admin" value={cloud.username} onChange={(e) => setCloud({ ...cloud, username: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>密码</label>
                  <input type="password" placeholder="••••••" value={cloud.password} onChange={(e) => setCloud({ ...cloud, password: e.target.value })} className={inputCls} /></div>
              </div>
            </>
          )}
          <SslToggle value={cloud.ssl} onChange={() => setCloud({ ...cloud, ssl: !cloud.ssl })} />
        </div>
      )}

      {/* AI 辅助配置面板 */}
      {showAiHelper && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">AI 帮你配置连接</span>
          </div>
          <textarea
            rows={3}
            placeholder="描述你的数据库，或粘贴连接字符串，AI 会自动解析并填写配置。&#10;例：我用的是 Neon PostgreSQL，连接字符串是 postgresql://neondb_owner:xxx@ep-xxx.neon.tech/neondb?sslmode=require"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            className={`${inputCls} resize-none text-xs`}
          />
          {aiError && <p className="text-xs text-red-500">{aiError}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setShowAiHelper(false); setAiQuery(''); setAiError('') }}
              className="flex-1 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">取消</button>
            <button onClick={handleAiParse} disabled={aiLoading || !aiQuery.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />解析中…</> : '让 AI 解析'}
            </button>
          </div>
        </motion.div>
      )}

      {/* 安全提示 + AI 提示 */}
      <div className="space-y-2">
        <div className="p-3 rounded-xl text-xs bg-blue-50 dark:bg-zinc-900 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-zinc-700 flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
          <span className="opacity-80">连接仅使用只读权限验证，不会修改任何数据</span>
        </div>
        {!showAiHelper && (
          <div className="p-3 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2">
            <span className="text-zinc-500 dark:text-zinc-400">连接方式不确定？配置 AI 后可让 AI 帮你分析并自动填写</span>
            <button onClick={() => setShowAiHelper(true)}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors font-medium">
              <Wand2 className="w-3 h-3" />AI 配置
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800">返回</button>
        <button onClick={handleSubmit} disabled={!canSubmit()}
          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-500/20">
          下一步：连接数据库
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  onComplete: (csvFiles?: { name: string; path?: string }[]) => void
  onClose: () => void
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onClose }) => {
  const { addDatabase } = useDatabase()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [selectedMethod, setSelectedMethod] = useState<'sample' | 'csv' | 'database' | null>(null)
  const [connectMethod, setConnectMethod] = useState<DbConnectMethod | null>(null)
  const [csvFile, setCsvFile] = useState<{ name: string; path?: string }[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dbConfig, setDbConfig] = useState<DbConfig | null>(null)
  const [manualPath, setManualPath] = useState('')

  const steps = [
    { id: 'welcome',              title: '欢迎使用 DeciFlow',  progress: 0   },
    { id: 'choose-method',        title: '选择数据接入方式',   progress: 20  },
    { id: 'sample-data',          title: '使用示例数据',       progress: 50  },
    { id: 'upload-csv',           title: '上传 CSV 文件',      progress: 50  },
    { id: 'security-declaration', title: '安全性声明',         progress: 40  },
    { id: 'db-connect-method',    title: '选择连接方式',       progress: 55  },
    { id: 'connection-test',      title: '连接数据库',         progress: 70  },
    { id: 'complete',             title: '准备就绪',           progress: 100 },
  ]

  const currentStepInfo = steps.find(s => s.id === currentStep)!

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="rounded-2xl border w-full max-w-[720px] h-[560px] flex flex-col overflow-hidden bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 shadow-2xl"
      >
        {/* 顶部进度条 */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{currentStepInfo.title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              ✕
            </button>
          </div>
          <div className="h-1 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${currentStepInfo.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <AnimatePresence mode="wait">

            {/* 欢迎页 */}
            {currentStep === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col justify-center space-y-6"
              >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-blue-50 dark:bg-zinc-900 flex items-center justify-center border border-blue-100 dark:border-zinc-800">
                    <Target className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">开始你的数据分析之旅</h3>
                    <p className="text-zinc-600 dark:text-zinc-400">只需 3 步，即可开始使用 AI 分析你的数据</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: <BarChart2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />, title: '选择数据源', desc: '示例数据 / CSV / 数据库' },
                    { icon: <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />,      title: 'AI 智能分析', desc: '自然语言查询，自动生成洞察' },
                    { icon: <Lightbulb className="w-6 h-6 text-blue-600 dark:text-blue-400" />, title: '获得洞察', desc: '可视化图表，actionable 建议' },
                  ].map((step, i) => (
                    <div key={i} className="text-center p-4 rounded-xl border bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
                      <div className="flex justify-center mb-2">{step.icon}</div>
                      <div className="text-sm font-medium mb-1 text-zinc-900 dark:text-zinc-100">{step.title}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{step.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 选择接入方式 */}
            {currentStep === 'choose-method' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col justify-center space-y-4"
              >
                <p className="text-center mb-4 text-zinc-600 dark:text-zinc-400">请选择最适合你的数据接入方式</p>

                {[
                  {
                    id: 'csv' as const,
                    icon: <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
                    title: '上传 CSV 文件',
                    desc: '从本地文件导入数据',
                    features: ['支持大文件', '自动识别列类型', '本地处理，安全可靠']
                  },
                  {
                    id: 'database' as const,
                    icon: <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
                    title: '连接数据库',
                    desc: '直连、SSH 隧道或云数据库',
                    features: ['支持 PostgreSQL/MySQL 等', '直连 / SSH / 云数据库', '适合持续使用']
                  },
                  {
                    id: 'sample' as const,
                    icon: <BarChart2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
                    title: '使用示例数据',
                    desc: '快速体验产品功能，无需准备数据',
                    features: ['即时可用', '包含电商分析场景', '适合产品体验']
                  },
                ].map((method) => (
                  <motion.button
                    key={method.id}
                    onClick={() => {
                      setSelectedMethod(method.id)
                      if (method.id === 'database') setCurrentStep('security-declaration')
                      else if (method.id === 'sample') setCurrentStep('sample-data')
                      else setCurrentStep('upload-csv')
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`relative p-5 rounded-xl border text-left transition-all ${
                      selectedMethod === method.id
                        ? 'bg-blue-50 dark:bg-zinc-800 border-blue-300 dark:border-blue-500'
                        : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-zinc-800 border border-blue-100 dark:border-zinc-700 flex items-center justify-center">
                        {method.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold mb-1 text-zinc-900 dark:text-zinc-100">{method.title}</h4>
                        <p className="text-sm mb-2 text-zinc-600 dark:text-zinc-400">{method.desc}</p>
                        <div className="flex flex-wrap gap-2">
                          {method.features.map((f, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* 示例数据 */}
            {currentStep === 'sample-data' && (
              <motion.div
                key="sample"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col justify-center space-y-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-blue-50 dark:bg-zinc-900 flex items-center justify-center border border-blue-100 dark:border-zinc-800">
                    <BarChart2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">电商数据分析示例</h4>
                  <p className="text-zinc-600 dark:text-zinc-400">包含用户、订单、产品等核心数据表</p>
                </div>

                <div className="space-y-3">
                  {[
                    { name: 'users',    desc: '用户信息表，包含注册时间、渠道等', rows: '500' },
                    { name: 'orders',   desc: '订单数据，包含金额、状态等',       rows: '2,000' },
                    { name: 'products', desc: '产品目录，包含分类、价格等',       rows: '20'  },
                    { name: 'events',   desc: '用户行为事件，包含浏览、点击等',   rows: '5,000'},
                  ].map((table, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-zinc-800 border border-blue-200 dark:border-zinc-700">
                        <Table2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{table.name}</div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap">{table.desc}</div>
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 flex-shrink-0 ml-2">{table.rows} 行</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 上传 CSV */}
            {currentStep === 'upload-csv' && (
              <motion.div
                key="csv"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar"
              >
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => {
                    e.preventDefault()
                    setIsDragging(false)
                    const files = Array.from(e.dataTransfer.files)
                    const validFiles = files.filter(f => {
                      const ext = f.name.split('.').pop()?.toLowerCase()
                      return ['csv', 'xlsx', 'xls', 'json'].includes(ext || '')
                    })
                    if (validFiles.length > 0) {
                      setCsvFile(prev => [...prev, ...validFiles.map(f => ({ name: f.name }))])
                    }
                  }}
                  className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-[1.02]'
                      : csvFile.length > 0
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                  onClick={async () => {
                    const api = (window as any).electronAPI
                    if (api?.dialog) {
                      const result = await api.dialog.openFile({
                        filters: [{ name: '数据文件', extensions: ['csv', 'xlsx', 'xls', 'json'] }],
                        properties: ['openFile', 'multiSelections'] as any,
                      })
                      if (result) {
                        const filePaths = Array.isArray(result) ? result : [result]
                        const validFiles = filePaths.filter(p => p).map(p => ({
                          name: (p as string).split(/[\\/]/).pop() || p as string,
                          path: p as string,
                        }))
                        if (validFiles.length > 0) {
                          setCsvFile(prev => [...prev, ...validFiles])
                        }
                      }
                    } else {
                      fileInputRef.current?.click()
                    }
                  }}
                >
                  <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all ${
                    isDragging
                      ? 'bg-blue-100 dark:bg-blue-900/50 scale-110'
                      : csvFile.length > 0
                      ? 'bg-emerald-100 dark:bg-emerald-900/50'
                      : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}>
                    <FileText className={`w-10 h-10 ${
                      isDragging ? 'text-blue-600' : csvFile.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
                    }`} />
                  </div>

                  <h4 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
                    {isDragging
                      ? '松开鼠标放入文件'
                      : csvFile.length > 0
                      ? `已选择 ${csvFile.length} 个文件`
                      : '拖拽文件到这里，或点击选择'}
                  </h4>

                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                    {csvFile.length > 0 ? '可以继续添加更多文件' : '支持批量导入多个文件'}
                  </p>

                  <div className="flex justify-center gap-2 flex-wrap">
                    {['CSV', 'Excel', 'JSON'].map(format => (
                      <span key={format} className="px-3 py-1 text-xs rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                        {format}
                      </span>
                    ))}
                    <span className="px-3 py-1 text-xs rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                      最大 100MB/文件
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls,.json"
                    multiple
                    onChange={e => {
                      const files = e.target.files
                      if (files) {
                        const validFiles = Array.from(files).filter(f => {
                          const ext = f.name.split('.').pop()?.toLowerCase()
                          return ['csv', 'xlsx', 'xls', 'json'].includes(ext || '')
                        })
                        if (validFiles.length > 0) {
                          setCsvFile(prev => [...prev, ...validFiles.map(f => ({ name: f.name }))])
                        }
                      }
                    }}
                  />
                </div>

                {csvFile.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        已选择的文件 ({csvFile.length})
                      </span>
                      <button onClick={() => setCsvFile([])} className="text-xs text-red-500 hover:text-red-600 transition-colors">
                        清空全部
                      </button>
                    </div>
                    <div className="space-y-2">
                      {csvFile.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="group flex items-center justify-between p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{file.name}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {file.path ? file.path.split(/[\\/]/).slice(-2, -1)[0] : '本地文件'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setCsvFile(prev => prev.filter((_, i) => i !== index))
                            }}
                            className="ml-3 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 手动输入路径（WSL / 无法拖拽时使用） */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 p-4 space-y-2">
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    无法拖拽？直接粘贴文件路径
                    <span className="ml-1 text-zinc-400">（Windows 路径如 C:\Users\...\data.csv 也支持）</span>
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualPath}
                      onChange={e => setManualPath(e.target.value)}
                      placeholder="/mnt/c/Users/terry/Downloads/data.csv"
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && manualPath.trim()) {
                          // 将 Windows 路径转换为 WSL 路径
                          let filePath = manualPath.trim()
                          if (/^[A-Za-z]:\\/.test(filePath)) {
                            const drive = filePath[0].toLowerCase()
                            filePath = `/mnt/${drive}/` + filePath.slice(3).replace(/\\/g, '/')
                          }
                          const fileName = filePath.split('/').pop() || filePath
                          setCsvFile(prev => [...prev, { name: fileName, path: filePath }])
                          setManualPath('')
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (!manualPath.trim()) return
                        let filePath = manualPath.trim()
                        if (/^[A-Za-z]:\\/.test(filePath)) {
                          const drive = filePath[0].toLowerCase()
                          filePath = `/mnt/${drive}/` + filePath.slice(3).replace(/\\/g, '/')
                        }
                        const fileName = filePath.split('/').pop() || filePath
                        setCsvFile(prev => [...prev, { name: fileName, path: filePath }])
                        setManualPath('')
                      }}
                      disabled={!manualPath.trim()}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      添加
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400">按 Enter 或点击添加，可添加多个文件</p>
                </div>

                {csvFile.length > 0 && (
                  <button
                    onClick={() => setCurrentStep('complete')}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    <span>开始分析</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                )}
              </motion.div>
            )}

            {/* 安全声明 */}
            {currentStep === 'security-declaration' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-y-auto custom-scrollbar"
              >
                <SecurityDeclaration
                  onAccept={() => setCurrentStep('db-connect-method')}
                  onLearnMore={() => {}}
                />
              </motion.div>
            )}

            {/* 选择连接方式 */}
            {currentStep === 'db-connect-method' && (
              <DbConnectMethodStep
                key="db-connect-method"
                onSelect={(method) => {
                  setConnectMethod(method)
                  setCurrentStep('connection-test')
                }}
                onBack={() => setCurrentStep('security-declaration')}
              />
            )}

            {/* 数据库配置表单 */}
            {currentStep === 'connection-test' && !dbConfig && connectMethod && (
              <DbFormStep
                key={`db-form-${connectMethod}`}
                connectMethod={connectMethod}
                onSubmit={(cfg) => setDbConfig(cfg)}
                onBack={() => setCurrentStep('db-connect-method')}
              />
            )}

            {/* 连接测试 */}
            {currentStep === 'connection-test' && dbConfig && (
              <motion.div
                key="connection-test"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-y-auto custom-scrollbar"
              >
                <ConnectionTest
                  config={dbConfig}
                  onConfirm={() => {
                    // 保存数据库连接到 store
                    addDatabase([{
                      id: `db-${Date.now()}`,
                      name: dbConfig.database || dbConfig.host,
                      type: dbConfig.type as any,
                      host: dbConfig.host,
                      port: dbConfig.port,
                      database: dbConfig.database,
                      username: dbConfig.username,
                      password: dbConfig.password || '',
                      ssl: dbConfig.ssl,
                      isSRV: dbConfig.isSRV,
                      rawConnectionString: dbConfig.rawConnectionString,
                      connected: true,
                    }])
                    setCurrentStep('complete')
                  }}
                  onBack={() => setDbConfig(null)}
                />
              </motion.div>
            )}

            {/* 完成 */}
            {currentStep === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col justify-center items-center text-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-20 h-20 rounded-2xl bg-green-50 dark:bg-zinc-900 flex items-center justify-center border border-green-100 dark:border-zinc-800"
                >
                  <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                </motion.div>
                <div>
                  <h3 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">准备就绪！</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {csvFile.length > 0
                      ? `已成功导入 ${csvFile.length} 个数据表，前往主界面开始分析`
                      : '设置完成，前往主界面开始使用'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => onComplete(csvFile)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:opacity-90 text-white rounded-xl font-medium transition-all"
                  >
                    {csvFile.length > 0 ? `进入主界面（已导入 ${csvFile.length} 个表格）` : '进入主界面'}
                  </button>
                  <button
                    onClick={() => setCurrentStep('welcome')}
                    className="px-6 py-3 rounded-xl font-medium transition-colors bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                  >
                    返回首页
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* 底部按钮 */}
        <div className="flex-shrink-0 px-6 py-4 border-t flex justify-between border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => {
              if (currentStep === 'welcome') onClose()
              else if (currentStep === 'choose-method') setCurrentStep('welcome')
              else if (currentStep === 'complete') setCurrentStep('welcome')
              else setCurrentStep('choose-method')
            }}
            className="px-4 py-2 text-sm transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {currentStep === 'welcome' ? '跳过' : '上一步'}
          </button>
          <div className="flex gap-3">
            {currentStep !== 'welcome' && currentStep !== 'complete' && (
              <button
                onClick={() => {
                  if (currentStep === 'sample-data') {
                    // 将内置示例数据库注册到数据源
                    addDatabase([{
                      id: 'demo-ecommerce',
                      name: '电商示例数据',
                      type: 'demo' as any,
                      host: 'localhost',
                      port: 0,
                      database: 'ecommerce_demo',
                      username: 'demo',
                      connected: true,
                    }])
                    setCurrentStep('complete')
                  } else if (currentStep === 'upload-csv') {
                    setCurrentStep('complete')
                  }
                }}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:opacity-90 text-white rounded-xl text-sm font-medium transition-all"
              >
                {currentStep === 'choose-method' ? '继续' : '完成'}
              </button>
            )}
            {currentStep === 'welcome' && (
              <button
                onClick={() => setCurrentStep('choose-method')}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:opacity-90 text-white rounded-xl text-sm font-medium transition-all"
              >
                开始 →
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
