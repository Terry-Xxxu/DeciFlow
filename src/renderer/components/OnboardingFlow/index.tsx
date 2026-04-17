/**
 * OnboardingFlow - 数据接入引导流程（支持双模式）
 * 首次使用时的引导，帮助用户快速接入数据
 * v0.app design system - Linear + Vercel styling
 * Updated: 2025-04-13
 */

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, BarChart2, Bot, Lightbulb, FileText, Database, Table2, Lock, CheckCircle2 } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { SecurityDeclaration } from '../SecurityDeclaration'
import { ConnectionTest } from '../ConnectionTest'

type OnboardingStep = 'welcome' | 'choose-method' | 'sample-data' | 'upload-csv' | 'security-declaration' | 'connection-test' | 'complete'

interface DbConfig {
  type: string
  host: string
  port: number
  database: string
  username: string
}

// ─── DB Form Step — must be declared outside OnboardingFlow to avoid hooks violation ───

interface DbFormStepProps {
  onSubmit: (config: DbConfig) => void
  onBack: () => void
}

const DbFormStep: React.FC<DbFormStepProps> = ({ onSubmit, onBack }) => {
  const { mode } = useTheme()
  const isDark = mode === 'dark'
  const [formData, setFormData] = useState({
    type: 'postgresql',
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: ''
  })

  const handleSubmit = () => {
    if (formData.host && formData.database && formData.username) {
      onSubmit({
        type: formData.type,
        host: formData.host,
        port: formData.port,
        database: formData.database,
        username: formData.username
      })
    }
  }

  const inputCls = `w-full px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500`

  return (
    <motion.div
      key="db"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="h-full flex flex-col justify-center space-y-4"
    >
      <p className="text-center text-zinc-600 dark:text-zinc-400">输入数据库连接信息</p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-2 text-zinc-700 dark:text-zinc-300">数据库类型</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className={inputCls}
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="mongodb">MongoDB</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-2 text-zinc-700 dark:text-zinc-300">主机地址</label>
            <input
              type="text"
              placeholder="localhost"
              value={formData.host}
              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-zinc-700 dark:text-zinc-300">端口</label>
            <input
              type="number"
              placeholder="5432"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 5432 })}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-2 text-zinc-700 dark:text-zinc-300">数据库名</label>
          <input
            type="text"
            placeholder="mydb"
            value={formData.database}
            onChange={(e) => setFormData({ ...formData, database: e.target.value })}
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-2 text-zinc-700 dark:text-zinc-300">用户名</label>
            <input
              type="text"
              placeholder="postgres"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-zinc-700 dark:text-zinc-300">密码</label>
            <input
              type="password"
              placeholder="••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        {/* 安全提示 */}
        <div className="p-3 rounded-lg text-xs bg-blue-50 dark:bg-zinc-900 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-zinc-700">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="font-semibold mb-1">安全承诺：</div>
              <div className="opacity-80">下一步将执行测试连接验证，仅使用只读权限，不会修改任何数据</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            返回
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.host || !formData.database || !formData.username}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:from-blue-500 hover:to-indigo-500 dark:hover:from-blue-400 dark:hover:to-indigo-400 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
          >
            下一步：测试连接
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  onComplete: () => void
  onClose: () => void
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onClose }) => {
  const { mode } = useTheme()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [selectedMethod, setSelectedMethod] = useState<'sample' | 'csv' | 'database' | null>(null)
  const [csvFile, setCsvFile] = useState<{ name: string; path?: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dbConfig, setDbConfig] = useState<DbConfig | null>(null)

  const steps = [
    { id: 'welcome',              title: '欢迎使用 DeciFlow',  progress: 0   },
    { id: 'choose-method',        title: '选择数据接入方式',   progress: 20  },
    { id: 'sample-data',          title: '使用示例数据',       progress: 50  },
    { id: 'upload-csv',           title: '上传 CSV 文件',      progress: 50  },
    { id: 'security-declaration', title: '安全性声明',         progress: 40  },
    { id: 'connection-test',      title: '测试数据库连接',     progress: 50  },
    { id: 'complete',             title: '准备就绪',           progress: 100 },
  ]

  const currentStepInfo = steps.find(s => s.id === currentStep)!

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="rounded-2xl border w-full max-w-[720px] h-[520px] flex flex-col overflow-hidden bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 shadow-2xl"
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
                    desc: '直接连接你的生产数据库',
                    features: ['支持 PostgreSQL/MySQL', '实时数据查询', '适合持续使用']
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
                    { name: 'users',    desc: '用户信息表，包含注册时间、渠道等', rows: '10,000+' },
                    { name: 'orders',   desc: '订单数据，包含金额、状态等',       rows: '50,000+' },
                    { name: 'products', desc: '产品目录，包含分类、价格等',       rows: '1,000+'  },
                    { name: 'events',   desc: '用户行为事件，包含浏览、点击等',   rows: '100,000+'},
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
                className="h-full flex flex-col justify-center gap-4"
              >
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => {
                    e.preventDefault()
                    setIsDragging(false)
                    const file = e.dataTransfer.files[0]
                    if (file) {
                      const ext = file.name.split('.').pop()?.toLowerCase()
                      if (['csv', 'xlsx', 'xls', 'json'].includes(ext || '')) {
                        setCsvFile({ name: file.name })
                      }
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : csvFile
                      ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500'
                  }`}
                  onClick={async () => {
                    const api = (window as any).electronAPI
                    if (api?.dialog) {
                      const filePath = await api.dialog.openFile({
                        filters: [{ name: '数据文件', extensions: ['csv', 'xlsx', 'xls', 'json'] }],
                      })
                      if (filePath) {
                        const name = filePath.split(/[\\/]/).pop() || filePath
                        setCsvFile({ name, path: filePath })
                      }
                    } else {
                      fileInputRef.current?.click()
                    }
                  }}
                >
                  {csvFile ? (
                    <>
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center border border-green-200 dark:border-green-700">
                        <FileText className="w-7 h-7 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{csvFile.name}</p>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">文件已选择，点击继续</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-blue-50 dark:bg-zinc-900 flex items-center justify-center border border-blue-100 dark:border-zinc-800">
                        <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="font-semibold mb-1 text-zinc-900 dark:text-zinc-100">
                        {isDragging ? '松开鼠标放入文件' : '拖拽文件到这里，或点击选择'}
                      </h4>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">支持 CSV、Excel、JSON · 最大 100MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls,.json"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) setCsvFile({ name: file.name })
                    }}
                  />
                </div>

                {csvFile && (
                  <button
                    onClick={() => setCurrentStep('complete')}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    继续
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
                  onAccept={() => setCurrentStep('connection-test')}
                  onLearnMore={() => {}}
                />
              </motion.div>
            )}

            {/* 连接数据库表单 */}
            {currentStep === 'connection-test' && !dbConfig && (
              <DbFormStep
                key="db-form"
                onSubmit={(cfg) => setDbConfig(cfg)}
                onBack={() => setCurrentStep('security-declaration')}
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
                  onConfirm={() => setCurrentStep('complete')}
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
                  <p className="text-zinc-600 dark:text-zinc-400">你现在可以开始使用 AI 分析数据了</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onComplete}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:opacity-90 text-white rounded-xl font-medium transition-all"
                  >
                    开始分析
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
                  if (currentStep === 'sample-data' || currentStep === 'upload-csv') {
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
