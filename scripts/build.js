var webpack = require('webpack')
var tasks = require('./tasks')
var config = require('../webpack/dev.config')

const buildChrome = tasks.buildChrome('prod')
const buildFirefox = tasks.buildFirefox('prod')

console.info('[Copy assets]')
console.info('--------------------------------')
tasks.copyAssets('prod')

const compiler = webpack(config)

function run() {
    console.info('[Webpack Build]')
    console.info('--------------------------------')

    compiler.run((err, stats) => {
        console.log(stats.toString('normal'))

        if (stats.hasErrors()) {
            return
        }

        tasks.buildSafari('prod')
        buildChrome()
        buildFirefox()
    })
}

run()
