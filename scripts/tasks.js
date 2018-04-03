var fs = require('fs')
var path = require('path')
var shelljs = require('shelljs')
var omit = require('lodash').omit
var extensionInfo = require('../chrome/extension.info.json')

const BUILDS_DIR = 'build'

function ensurePaths() {
    shelljs.mkdir('-p', 'build/dist')
    shelljs.mkdir('-p', 'build/bundles')
    shelljs.mkdir('-p', 'build/chrome')
    shelljs.mkdir('-p', 'build/firefox')
}

exports.copyAssets = function(env) {
    const dir = 'build/dist'
    shelljs.rm('-rf', dir)
    shelljs.mkdir('-p', dir)
    shelljs.cp('-R', 'chrome/assets/*', dir)
    shelljs.cp('-R', 'chrome/views/*', dir)
}

function copyDist(toDir) {
    const dir = 'dist'

    shelljs.mkdir('-p', toDir)
    shelljs.cp('-R', 'build/dist/*', toDir)
}

const browserTitles = {
    firefox: 'FireFox',
    chrome: 'Chrome',
}

const browserBundleZips = {
    firefox: 'firefox-bundle.xpi',
    chrome: 'chrome-bundle.zip',
}

const browserBlacklist = {
    chrome: ['applications'],
    firefox: ['key'],
}

const browserFlip = {
    firefox: 'chrome',
    chrome: 'firefox',
}

function buildForBrowser(browser) {
    ensurePaths()
    return function(env) {
        const title = browserTitles[browser]

        const buildDir = path.resolve(process.cwd(), `${BUILDS_DIR}/${browser}`)

        let envInfo = omit(extensionInfo[env], browserBlacklist[browser])

        if (browser === 'firefox') {
            extensionInfo.dev.permissions.push('<all_urls>')
            extensionInfo.prod.permissions.push('<all_urls>')
        }

        let manifest = omit(extensionInfo, ['dev', 'prod', ...browserBlacklist[browser]])
        manifest = { ...manifest, ...envInfo }

        fs.writeFileSync(`${buildDir}/manifest.json`, JSON.stringify(manifest, null, 4))

        return function() {
            console.log(`Building ${title} ${env} bundle...`)

            copyDist(buildDir)

            const zipDest = path.resolve(process.cwd(), `${BUILDS_DIR}/bundles/${browserBundleZips[browser]}`)
            if (zipDest) {
                shelljs.mkdir('-p', `./${BUILDS_DIR}/bundles`)
                shelljs.exec(`cd ${buildDir} && zip -r ${zipDest} *`)
            }

            console.log(`${title} ${env} bundle built.`)
        }
    }
}

exports.buildFirefox = buildForBrowser('firefox')
exports.buildChrome = buildForBrowser('chrome')

exports.buildSafari = function(env) {
    console.log(`Building Safari ${env} bundle...`)
    shelljs.exec('cp -r build/dist/* Sourcegraph.safariextension')
    console.log(`Safari ${env} bundle built.`)
}
