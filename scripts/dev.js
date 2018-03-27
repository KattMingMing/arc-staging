var fs = require('fs')
var path = require('path')
var webpack = require('webpack')

var shelljs = require('shelljs')

var tasks = require('./tasks')
var config = require('../webpack/dev.config')

const buildChrome = tasks.buildChrome('dev')
const buildFirefox = tasks.buildFirefox('dev')

console.log('Copying Assets...')
tasks.copyAssets('dev')
console.log('Done copying assets.')

const compiler = webpack(config)
let watcher = null

function run() {
    console.info('[Webpack Dev]')
    console.info('--------------------------------')

    watcher = compiler.watch(
        {
            aggregateTimeout: 300,
            poll: 1000,
        },
        (err, stats) => {
            console.log(stats.toString('normal'))

            if (stats.hasErrors()) {
                return
            }

            tasks.buildSafari('dev')
            buildChrome()
            buildFirefox()
        }
    )
}

run()
