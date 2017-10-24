var shelljs = require('shelljs')

exports.copyAssets = function(env) {
    const dir = 'dist'
    shelljs.rm('-rf', dir)
    shelljs.mkdir(dir)
    shelljs.cp('chrome/manifest.' + env + '.json', dir + '/manifest.json')
    shelljs.cp('-R', 'chrome/assets/*', dir)
    shelljs.exec('jade -O "{ env: ' + "'" + env + "'" + ' }" -o ' + dir + ' chrome/views/')
}
