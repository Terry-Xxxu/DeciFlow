/**
 * SecurityDeclaration - 安全声明组件
 * 在用户连接数据库前显示，建立信任
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import {
  ShieldCheck, Lock, Monitor, KeyRound, ScrollText,
  Trash2, EyeOff, Lightbulb, X
} from 'lucide-react'

interface SecurityDeclarationProps {
  onAccept: () => void
  onLearnMore: () => void
}

// ─── Privacy Policy Modal ────────────────────────────────────────────────────

const PrivacyPolicyModal: React.FC<{ onClose: () => void; isDark: boolean }> = ({ onClose, isDark }) => (
  <motion.div
    key="privacy-overlay"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className={`w-full max-w-2xl max-h-[80vh] rounded-2xl border flex flex-col ${
        isDark ? 'bg-slate-900 border-white/[0.08]' : 'bg-white border-gray-200 shadow-2xl'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-6 border-b flex-shrink-0 ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
            <ShieldCheck className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>用户协议、隐私政策及数据处理条款</h2>
        </div>
        <button
          onClick={onClose}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className={`flex-1 overflow-y-auto p-6 space-y-5 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
        {/* 导语 */}
        <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          欢迎您使用本 AI 数据分析平台（以下简称"本服务"）。本文件整合了用户协议、隐私政策及数据处理条款，旨在说明您在使用本服务过程中涉及的数据处理规则、使用限制及相关责任划分。请您在使用本服务前仔细阅读并充分理解本文件内容。一旦您开始使用本服务，即视为您已理解并同意本文件的全部条款。
        </p>

        {[
          {
            title: '一、服务说明',
            content: '本服务是一款基于人工智能技术的数据分析工具，支持通过自然语言进行数据查询，并基于接入的数据生成分析结果与洞察信息。本服务旨在提升用户数据分析效率，降低数据使用门槛，但其输出结果仅作为辅助参考工具，不构成任何形式的决策依据。'
          },
          {
            title: '二、数据收集与使用',
            content: '在您使用本服务的过程中，我们可能收集您主动提供的信息以及系统运行过程中产生的数据，包括自然语言查询内容、接入或上传的数据集及相关配置设置，以及查询日志、分析结果、功能使用情况及错误信息等。上述数据将用于实现核心服务功能，包括执行查询请求、生成分析结果、优化系统性能，以及用于系统安全保障与问题排查。我们不会在未经授权的情况下出售或不当使用您的数据。当您接入企业内部系统或第三方数据源时，我们仅在您授权范围内访问相关数据，并严格限制访问权限。'
          },
          {
            title: '三、数据权属与处理角色',
            content: '您对接入或上传至本服务的数据拥有完整的所有权。在数据处理关系中，您作为数据控制方，对数据拥有控制权与决策权；本服务提供方作为数据处理方，仅在提供服务所必需的范围内对数据进行处理，不对数据主张任何所有权或其他权利。'
          },
          {
            title: '四、数据使用限制',
            content: '我们承诺仅在实现服务功能所需范围内使用数据，不会将客户数据用于与服务无关的用途。除非获得您的明确授权，我们不会将数据用于模型训练或向第三方披露、出售相关数据。'
          },
          {
            title: '五、数据存储与安全',
            content: '我们采用符合行业标准的安全措施保护数据，包括数据加密传输、访问权限控制及操作日志记录等机制，以尽可能降低数据泄露或滥用风险。但您理解并同意，受限于技术发展水平，任何系统均无法保证绝对安全。'
          },
          {
            title: '六、数据保留与删除',
            content: '我们仅在实现服务功能所必需的期限内保留数据。您有权随时申请删除相关数据或终止数据处理，在符合法律法规要求的前提下，我们将在合理时间内完成处理。'
          },
          {
            title: '七、第三方服务',
            content: '本服务可能依赖第三方技术服务（包括但不限于云服务或人工智能模型服务）。在此情况下，我们仅在必要范围内共享数据以实现服务功能，并采取合理措施保障数据安全。但对于第三方服务的独立行为及其政策，我们不承担责任。'
          },
          {
            title: '八、用户责任',
            content: '您在使用本服务时，应确保对所接入或上传的数据拥有合法使用权，并承诺不上传任何违反法律法规或侵犯他人权益的数据。您应对数据的合法性、准确性及使用结果承担全部责任，并确保您的使用行为符合适用法律法规及所在组织的内部规范。'
          },
          {
            title: '九、免责声明',
            content: '本服务基于人工智能技术提供数据分析能力，其输出结果可能存在不准确、不完整或与实际情况不一致的情形。因此，本服务提供的所有分析结果、数据洞察及相关输出仅供参考，不构成任何形式的投资建议、法律意见或商业决策依据。用户在使用分析结果进行决策时，应进行独立判断与验证。对于因依赖分析结果所产生的任何直接或间接损失，本服务提供方在法律允许范围内不承担责任。本服务亦不保证持续、稳定、无中断或无错误运行。'
          },
          {
            title: '十、服务可用性与变更',
            content: '我们可能基于产品优化、系统维护或业务调整对服务内容进行更新或变更，并可能导致服务短暂中断或功能调整。我们将尽合理努力保障服务稳定性，但不对服务持续可用性作出绝对承诺。'
          },
          {
            title: '十一、部署与数据隔离（如适用）',
            content: '根据不同用户需求，本服务可支持多种部署模式，包括本地私有化部署、专属云环境（VPC 隔离）及标准公有云部署。在特定部署模式下，数据可在用户控制的环境内处理，以满足更高的安全与合规要求。'
          },
          {
            title: '十二、条款更新',
            content: '我们可能根据业务发展或法律法规要求对本文件进行更新。更新后的内容将在平台上发布，并自发布之日起生效。您继续使用本服务的行为，将视为接受更新后的条款。'
          },
        ].map((section, i) => (
          <section key={i} className="space-y-1.5">
            <h3 className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{section.title}</h3>
            <p>{section.content}</p>
          </section>
        ))}
      </div>

      {/* Footer */}
      <div className={`flex-shrink-0 p-4 border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-xl text-sm font-medium transition-all"
        >
          我已阅读
        </button>
      </div>
    </motion.div>
  </motion.div>
)

// ─── Main Component ──────────────────────────────────────────────────────────

export const SecurityDeclaration: React.FC<SecurityDeclarationProps> = ({
  onAccept,
}) => {
  const { mode } = useTheme()
  const [accepted, setAccepted] = useState(false)
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false)
  const isDark = mode === 'dark'

  const securityGuarantees = [
    {
      icon: Lock,
      title: '只读权限',
      description: '仅使用 SELECT 查询权限，永不执行 INSERT/UPDATE/DELETE',
      color: 'green' as const,
    },
    {
      icon: Monitor,
      title: '本地处理',
      description: '所有数据在本地处理，不会上传到任何远程服务器',
      color: 'blue' as const,
    },
    {
      icon: KeyRound,
      title: '加密存储',
      description: '数据库凭据使用 AES-256 加密存储在本地',
      color: 'purple' as const,
    },
    {
      icon: ScrollText,
      title: '审计日志',
      description: '记录所有查询操作，可随时查看和导出',
      color: 'orange' as const,
    },
    {
      icon: Trash2,
      title: '自动清理',
      description: '断开连接时自动清除本地缓存数据',
      color: 'red' as const,
    },
    {
      icon: EyeOff,
      title: '无第三方追踪',
      description: '不收集任何使用数据，完全匿名使用',
      color: 'gray' as const,
    },
  ]

  const colorClasses = {
    green:  isDark ? 'bg-green-500/20 text-green-400 border-green-500/30'   : 'bg-green-50  text-green-700  border-green-200',
    blue:   isDark ? 'bg-blue-500/20  text-blue-400  border-blue-500/30'    : 'bg-blue-50   text-blue-700   border-blue-200',
    purple: isDark ? 'bg-purple-500/20 text-purple-400 border-purple-500/30': 'bg-purple-50 text-purple-700 border-purple-200',
    orange: isDark ? 'bg-orange-500/20 text-orange-400 border-orange-500/30': 'bg-orange-50 text-orange-700 border-orange-200',
    red:    isDark ? 'bg-red-500/20   text-red-400   border-red-500/30'     : 'bg-red-50    text-red-700    border-red-200',
    gray:   isDark ? 'bg-gray-500/20  text-gray-400  border-gray-500/30'    : 'bg-gray-50   text-gray-700   border-gray-200',
  }

  return (
    <>
      <AnimatePresence>
        {showPrivacyPolicy && (
          <PrivacyPolicyModal isDark={isDark} onClose={() => setShowPrivacyPolicy(false)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-6 space-y-6 ${
          isDark
            ? 'bg-background-secondary border-white/[0.08]'
            : 'bg-white border-gray-200 shadow-lg'
        }`}
      >
        {/* 标题 */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
            isDark ? 'bg-green-500/20' : 'bg-green-100'
          }`}>
            <ShieldCheck className={`w-8 h-8 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            安全性声明
          </h3>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            我们承诺以下安全措施，保护您的数据安全
          </p>
        </div>

        {/* 保障列表 */}
        <div className="grid grid-cols-2 gap-4">
          {securityGuarantees.map((guarantee, index) => {
            const Icon = guarantee.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border ${colorClasses[guarantee.color]}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm mb-1 ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
                      {guarantee.title}
                    </h4>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      {guarantee.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* 技术说明 */}
        <div className={`p-4 rounded-xl border ${
          isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-2">
            <Lightbulb className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <div className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              <div className="font-semibold mb-1">技术实现细节：</div>
              <ul className="space-y-1 ml-4 list-disc">
                <li>使用 PostgreSQL/MySQL 的只读角色连接（SELECT 权限）</li>
                <li>SQL 注入防护和查询超时限制（最多 30 秒）</li>
                <li>结果集大小限制（最多 10,000 行）</li>
                <li>凭据使用系统 Keychain 加密存储</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 用户确认 */}
        <div className="space-y-4">
          <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
            isDark
              ? 'border-white/[0.08] hover:border-white/[0.15] bg-white/5'
              : 'border-gray-200 hover:border-gray-300 bg-gray-50'
          } ${accepted ? (isDark ? 'border-green-500/50 bg-green-500/10' : 'border-green-500 bg-green-50') : ''}`}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <div className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              <div className="font-semibold mb-1">我已了解并同意以上安全承诺</div>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                点击连接即表示您同意我们仅使用只读权限访问您的数据库
              </div>
            </div>
          </label>

          <div className="flex gap-3">
            <button
              onClick={() => setShowPrivacyPolicy(true)}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              查看详细隐私政策 →
            </button>
            <button
              onClick={onAccept}
              disabled={!accepted}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
            >
              我已了解，继续连接
            </button>
          </div>
        </div>

        {/* 信任标识 */}
        <div className={`text-center pt-4 border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
            您的数据安全是我们的首要任务 · 所有操作均符合 GDPR 和 SOC2 标准
          </div>
        </div>
      </motion.div>
    </>
  )
}

export default SecurityDeclaration
