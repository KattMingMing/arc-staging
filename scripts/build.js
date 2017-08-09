var fs = require('fs');
var shelljs = require('shelljs');
var tasks = require('./tasks');

console.info('[Compute checksum]');
console.info('--------------------------------');
require('hash-files')({ files: ['./app/**', './chrome/**', './phabricator/**', './scripts/**', './webpack/**'] }, function(error, hash) {
	if (error) {
		console.error(error);
		return;
	}

	try {
		var savedHash = fs.readFileSync('.checksum', 'utf8');
		if (savedHash === hash) {
			console.info('Match checksum, skipping build...');
			return;
		}
	} catch (e) {
		// ignore
	}

	fs.writeFileSync('.checksum', hash);

	console.info('[Copy assets]');
	console.info('--------------------------------');
	tasks.copyAssets('prod');

	console.info('[Webpack Build]');
	console.info('--------------------------------');
	shelljs.exec('webpack --config webpack/prod.config.js --progress --profile --colors');
});
