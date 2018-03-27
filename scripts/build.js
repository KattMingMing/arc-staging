var tasks = require('./tasks')

const buildChrome = tasks.buildChrome('prod')
const buildFirefox = tasks.buildFirefox('prod')

console.info('[Copy assets]')
console.info('--------------------------------')
tasks.copyAssets('prod')

function run() {
	console.info('[Webpack Build]')
	console.info('--------------------------------')
	tasks.buildSafari('prod')
	buildChrome()
	buildFirefox()
}

run()
