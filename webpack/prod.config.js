const webpack = require('webpack')

const baseConfig = require('./base.config')

const { plugins, ...base } = baseConfig

export default {
    ...base,
    plugins: plugins.concat(
        ...[
            new webpack.DefinePlugin({
                'process.env': {
                    NODE_ENV: JSON.stringify('production'),
                },
            }),
            new webpack.optimize.UglifyJsPlugin({
                sourceMap: false,
            }),
            new webpack.ProvidePlugin({
                // tslint:disable-next-line object-literal-key-quotes
                $: 'jquery',
                // tslint:disable-next-line object-literal-key-quotes
                jQuery: 'jquery',
                '$.fn.pjax': 'jquery-pjax',
            }),
        ]
    ),
}
