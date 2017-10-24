const ExtractTextPlugin = require('extract-text-webpack-plugin')
const path = require('path');
const webpack = require('webpack');

module.exports = {
	entry: {
		background: path.join(__dirname, '../chrome/extension/background.tsx'),
		options: path.join(__dirname, '../chrome/extension/options.tsx'),
		inject: path.join(__dirname, '../chrome/extension/inject.tsx'),
		style: path.join(__dirname, '../app/app.scss'),
		phabricator: ['babel-polyfill', path.join(__dirname, '../app/phabricator/extension.tsx')]
	},
	output: {
		path: path.join(__dirname, '../dist/js'),
		filename: '[name].bundle.js',
		chunkFilename: '[id].chunk.js'
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify('production')
			}
		}),
		new ExtractTextPlugin({
			filename: '../css/[name].bundle.css',
			allChunks: true
		}),
		new webpack.optimize.UglifyJsPlugin({
			sourceMap: false,
		}),
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
			'$.fn.pjax': 'jquery-pjax',
		}),
	],
	resolve: {
		extensions: ['.ts', '.tsx', '.js'],
	},
	module: {
		loaders: [
			{
				test: /\.tsx?$/,
				loaders: ['babel-loader', 'ts-loader?' + JSON.stringify({
					compilerOptions: {
						module: 'esnext',
						noEmit: false, // tsconfig.json sets this to true to avoid output when running tsc manually
					},
					transpileOnly: process.env.DISABLE_TYPECHECKING === 'true'
				})],
			},
			{
                test: /\.jsx?$/,
                loader: 'babel-loader'
            },
			{
                // sass / scss loader for webpack
                test: /\.(css|sass|scss)$/,
                loader: ExtractTextPlugin.extract([
                    'css-loader',
                    'postcss-loader',
                    {
                        loader: 'sass-loader',
                        options: {
                            includePaths: [__dirname + '/node_modules']
                        }
                    }
                ])
            }
		]
	}
};
