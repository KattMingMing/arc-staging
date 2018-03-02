import { URL, URLSearchParams } from 'whatwg-url'

const GLOBAL = global as any
GLOBAL.URL = URL
GLOBAL.URLSearchParams = URLSearchParams

// We need babel polyfill but don't want to override the one on sourcegraph.com
// otherwise a needless error will be thrown.
//
// Info: https://github.com/babel/babel/issues/4019#issuecomment-354608558
if (!GLOBAL._babelPolyfill && !(window as any)._babelPolyfill) {
    require('babel-polyfill')
}
