import * as webpack from 'webpack'
import baseConfig from './base.config'

const { plugins, ...base } = baseConfig

export default {
    ...base,
    mode: 'development',
    devtool: 'cheap-module-source-map',
    plugins: (plugins || []).concat(
        ...[
            new webpack.DefinePlugin({
                'process.env': {
                    NODE_ENV: JSON.stringify('development'),
                },
            }),
        ]
    ),
} as webpack.Configuration
