var fs = require('fs')
var shelljs = require('shelljs')
var tasks = require('./tasks')

console.info('[Copy assets]')
console.info('--------------------------------')
tasks.copyAssets('prod')

console.info('[Webpack Build]')
console.info('--------------------------------')
shelljs.exec('webpack --config webpack/prod.config.js --progress --profile --colors')
