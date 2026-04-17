/**
 * 隐私政策页面组件
 * App Store 审核必需
 */

import React from 'react'
import { Modal } from '../Modal'

interface PrivacyPolicyProps {
  isOpen: boolean
  onClose: () => void
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="隐私政策">
      <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-4">
        <section>
          <p className="text-sm text-slate-400">
            <strong>最后更新日期：</strong>2026年4月12日<br />
            <strong>生效日期：</strong>2026年4月12日
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-100 mb-3">1. 概述</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
           欢迎使用 DataInsight Pro（"本应用"）。我们非常重视您的隐私权。本隐私政策说明了我们如何收集、使用和保护您的信息。
          </p>
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400 font-medium">🔒 重要提示</p>
            <p className="text-sm text-slate-300 mt-1">
              DataInsight Pro 是一款<strong>本地优先</strong>的数据分析工具。
              您的数据<strong>仅存储在您的本地设备上</strong>，不会上传到我们的服务器。
            </p>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-100 mb-3">2. 我们收集的信息</h3>

          <div className="space-y-3">
            <div>
              <h4 className="text-base font-medium text-slate-200 mb-2">2.1 本地数据存储</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                本应用在您的本地设备上存储以下信息：
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-400">
                <li>• 数据库连接信息（密码使用系统密钥链加密）</li>
                <li>• AI 服务配置（API Key 加密存储）</li>
                <li>• 查询历史记录（仅存储在本地）</li>
                <li>• 应用设置和偏好配置</li>
              </ul>
            </div>

            <div>
              <h4 className="text-base font-medium text-slate-200 mb-2">2.2 使用数据</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                为了改进服务，本应用可能会收集以下匿名使用数据（可在设置中关闭）：
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-400">
                <li>• 应用功能使用情况</li>
                <li>• 性能指标</li>
                <li>• 崩溃报告</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-100 mb-3">3. 数据如何使用</h3>

          <div className="space-y-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h4 className="text-base font-medium text-blue-400 mb-2">3.1 本地处理</h4>
              <p className="text-sm text-slate-300">
                您的所有数据查询和分析都在<strong>您的设备本地进行</strong>：
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-400">
                <li>✅ 数据库查询直接从您的数据库获取</li>
                <li>✅ AI 分析使用您配置的 API 服务</li>
                <li>✅ 结果缓存仅存储在本地</li>
              </ul>
            </div>

            <div>
              <h4 className="text-base font-medium text-slate-200 mb-2">3.2 AI 服务</h4>
              <p className="text-sm text-slate-300">
                当您使用 AI 功能时，您的查询会发送到您配置的 AI 服务提供商（如 OpenAI、Claude 等）。
                <strong>我们不存储</strong>您的 API Key 或对话内容在我们的服务器上。
              </p>
            </div>

            <div>
              <h4 className="text-base font-medium text-slate-200 mb-2">3.3 数据脱敏</h4>
              <p className="text-sm text-slate-300">
                本应用包含自动数据脱敏功能，可识别并遮蔽敏感字段：
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>• Email 地址</div>
                <div>• 电话号码</div>
                <div>• 身份证号</div>
                <div>• 用户 ID</div>
                <div>• 真实姓名</div>
                <div>• 地址信息</div>
                <div>• 信用卡号</div>
                <div>• 银行账户</div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-100 mb-3">4. 我们不收集的信息</h3>
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400 font-medium mb-2">我们绝不会收集：</p>
            <ul className="space-y-1 text-sm text-slate-300">
              <li>❌ 用户的个人身份信息（姓名、邮箱、电话等）</li>
              <li>❌ 用户的数据库内容</li>
              <li>❌ 用户的查询结果数据</li>
              <li>❌ 用户的 AI 对话内容</li>
              <li>❌ 用户的 IP 地址或位置信息</li>
            </ul>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-100 mb-3">5. 您的权利</h3>
          <p className="text-sm text-slate-300 mb-3">
            您对自己的数据拥有完全控制权：
          </p>
          <ul className="space-y-1 text-sm text-slate-400">
            <li>✅ <strong>访问权</strong>：您可以随时查看应用存储的所有数据</li>
            <li>✅ <strong>删除权</strong>：您可以清空查询历史和缓存</li>
            <li>✅ <strong>导出权</strong>：您可以导出您的配置和数据</li>
            <li>✅ <strong>修改权</strong>：您可以随时修改或删除配置</li>
            <li>✅ <strong>退出权</strong>：您可以随时停止使用并卸载应用</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-100 mb-3">6. 联系我们</h3>
          <p className="text-sm text-slate-300">
            如果您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：
          </p>
          <div className="mt-2 space-y-1 text-sm text-slate-400">
            <p>📧 <strong>邮箱：</strong>terry@ioty.io</p>
            <p>🔗 <strong>GitHub：</strong>项目 Issues 页面</p>
          </div>
        </section>

        <section className="pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            通过使用 DataInsight Pro，您确认您已阅读、理解并同意本隐私政策。
          </p>
          <p className="text-xs text-slate-600 text-center mt-2">
            DataInsight Pro v1.0.0 | © 2026. 保留所有权利。
          </p>
        </section>
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-slate-700">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          我知道了
        </button>
      </div>
    </Modal>
  )
}

export default PrivacyPolicy
