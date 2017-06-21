const path = require('path');
const webpack = require('webpack');

module.exports = {
	entry: {
		background: path.join(__dirname, '../chrome/extension/background.tsx'),
		options: path.join(__dirname, '../chrome/extension/options.tsx'),
		inject: path.join(__dirname, '../chrome/extension/inject.tsx'),
		sgdev: path.join(__dirname, '../phabricator/sgdev/sgdev.tsx'),
		umami: path.join(__dirname, '../phabricator/umami/umami.tsx')
	},
	output: {
		path: path.join(__dirname, '../build/js'),
		filename: '[name].bundle.js',
		chunkFilename: '[id].chunk.js'
	},
	devtool: "source-map",
	plugins: [
		new webpack.optimize.DedupePlugin(),
		new webpack.optimize.UglifyJsPlugin({
			sourceMap: true,
			compressor: {
				warnings: false
			}
		}),
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify('production')
			}
		})
	],
	resolve: {
		extensions: ['.ts', '.tsx', '.js'],
		alias: {
			app: path.resolve(__dirname, '..', 'app/'),
			chrome: path.resolve(__dirname, '..', 'chrome/'),
		}
	},
	module: {
		loaders: [{
			test: /\.tsx?$/,
			loader: 'ts-loader?' + JSON.stringify({
				compilerOptions: {
					noEmit: false, // tsconfig.json sets this to true to avoid output when running tsc manually
				},
				transpileOnly: true, // type checking is only done as part of linting or testing
			}),
		}]
	}
};
