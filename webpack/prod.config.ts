import * as webpack from 'webpack'
import baseConfig from './base.config'

const { plugins, ...base } = baseConfig

export default {
    ...base,
    mode: 'production',
    optimization: { minimize: true },
    plugins: (plugins || []).concat(
        ...[
            new webpack.DefinePlugin({
                'process.env': {
                    NODE_ENV: JSON.stringify('production'),
                },
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
} as webpack.Configuration
