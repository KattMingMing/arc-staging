const ExtractTextPlugin = require('extract-text-webpack-plugin')
const path = require('path')
const webpack = require('webpack')

const buildEntry = pre => entry => [path.join(__dirname, pre), path.join(__dirname, entry)]

const pageEntry = buildEntry('../scripts/page.entry.js')
const extEntry = buildEntry('../scripts/extension.entry.js')

module.exports = {
    entry: {
        background: extEntry('../chrome/extension/background.tsx'),
        link: extEntry('../chrome/extension/link.tsx'),
        options: extEntry('../chrome/extension/options.tsx'),
        inject: extEntry('../chrome/extension/inject.tsx'),
        phabricator: pageEntry('../app/phabricator/extension.tsx'),

        bootstrap: path.join(__dirname, '../node_modules/bootstrap/dist/css/bootstrap.css'),
        style: path.join(__dirname, '../app/app.scss'),
    },
    output: {
        path: path.join(__dirname, '../dist/js'),
        filename: '[name].bundle.js',
        chunkFilename: '[id].chunk.js',
    },
    plugins: [
        new ExtractTextPlugin({
            filename: '../css/[name].bundle.css',
            allChunks: true,
        }),
    ],
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    module: {
        loaders: [
            {
                test: /\.tsx?$/,
                loaders: [
                    'babel-loader',
                    'ts-loader?' +
                        JSON.stringify({
                            compilerOptions: {
                                module: 'esnext',
                                noEmit: false, // tsconfig.json sets this to true to avoid output when running tsc manually
                            },
                            transpileOnly: process.env.DISABLE_TYPECHECKING === 'true',
                        }),
                ],
            },
            {
                test: /\.jsx?$/,
                loader: 'babel-loader',
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
                            includePaths: [__dirname + '/node_modules'],
                        },
                    },
                ]),
            },
        ],
    },
}
