const path = require('path');
const webpack = require('webpack');

module.exports = {
	entry: {
		background: path.join(__dirname, '../chrome/extension/background.tsx'),
		options: path.join(__dirname, '../chrome/extension/options.tsx'),
		inject: path.join(__dirname, '../chrome/extension/inject/index.tsx'),
		sgdev: path.join(__dirname, '../phabricator/sgdev/sgdev.tsx'),
		umami: path.join(__dirname, '../phabricator/umami/umami.tsx'),
	},
	output: {
		path: path.join(__dirname, '../dist/js'),
		filename: '[name].bundle.js',
		chunkFilename: '[id].chunk.js'
	},
	devtool: "cheap-module-source-map",
	plugins: [
		new webpack.NoErrorsPlugin(),
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify('development')
			}
		}),
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
			'$.fn.pjax': 'jquery-pjax',
		}),
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
