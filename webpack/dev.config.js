const webpack = require('webpack')

const baseConfig = require('./base.config')

const { plugins, ...base } = baseConfig

module.exports = {
    ...base,
    devtool: 'cheap-module-source-map',
    plugins: plugins.concat(
        ...[
            new webpack.DefinePlugin({
                'process.env': {
                    NODE_ENV: JSON.stringify('development'),
                },
            }),
        ]
    ),
}
