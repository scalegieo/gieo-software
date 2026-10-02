const { execFileSync } = require('child_process')
const path = require('path')

// Without a Developer ID, macOS rejects a partially signed bundle as "damaged".
// Ad-hoc sign the whole .app so Gatekeeper offers "Open Anyway" instead.
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' })
}
