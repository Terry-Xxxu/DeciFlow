/**
 * macOS Notarization Script
 *
 * 用于对 macOS 应用进行公证，确保应用可以在 macOS 10.15+ 上正常运行
 *
 * 使用方法：
 * 1. 设置环境变量 APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID
 * 2. 运行: npm run notarize
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// 配置
const config = {
  appleId: process.env.APPLE_ID || '',
  appleIdPassword: process.env.APPLE_ID_PASSWORD || '',
  teamId: process.env.APPLE_TEAM_ID || '',
  appPath: path.join(__dirname, '../release/mac/DeciFlow.app')
}

function notarizeApp() {
  console.log('🔐 Starting macOS notarization...\n')

  // 验证配置
  if (!config.appleId || !config.appleIdPassword || !config.teamId) {
    console.error('❌ Error: Missing required environment variables:')
    console.error('   APPLE_ID=<your-apple-id>')
    console.error('   APPLE_ID_PASSWORD=<app-specific-password>')
    console.error('   APPLE_TEAM_ID=<your-team-id>')
    console.error('\n💡 Get an app-specific password at: https://appleid.apple.com')
    process.exit(1)
  }

  // 验证应用路径
  if (!fs.existsSync(config.appPath)) {
    console.error(`❌ Error: App not found at ${config.appPath}`)
    console.error('   Please build the app first: npm run dist:mac')
    process.exit(1)
  }

  try {
    // 1. 压缩应用
    console.log('📦 Zipping application...')
    const zipPath = config.appPath + '.zip'
    execSync(`ditto -c -k --keepParent "${config.appPath}" "${zipPath}"`, {
      stdio: 'inherit'
    })

    // 2. 上传公证
    console.log('\n⬆️  Uploading to Apple notary service...')
    const uploadCmd = [
      'xcrun',
      'notarytool',
      'submit',
      `"${zipPath}"`,
      `--apple-id "${config.appleId}"`,
      `--password "${config.appleIdPassword}"`,
      `--team-id "${config.teamId}"`,
      '--wait'
    ].join(' ')

    console.log(`Running: ${uploadCmd.replace(config.appleIdPassword, '***')}`)
    const result = execSync(uploadCmd, { stdio: 'inherit', encoding: 'utf-8' })

    // 3. 装订票据
    console.log('\n📎 Stapling notarization ticket to application...')
    execSync(`xcrun stapler staple "${config.appPath}"`, { stdio: 'inherit' })

    // 4. 验证
    console.log('\n✅ Verifying notarization...')
    execSync(`xcrun stapler validate "${config.appPath}"`, { stdio: 'inherit' })

    // 5. 清理
    console.log('\n🧹 Cleaning up...')
    fs.unlinkSync(zipPath)

    console.log('\n✅ Notarization complete!')
    console.log(`📦 Notarized app: ${config.appPath}`)

  } catch (error) {
    console.error('\n❌ Notarization failed:', error.message)
    process.exit(1)
  }
}

// 运行
notarizeApp()
