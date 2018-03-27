import { URL, URLSearchParams } from 'whatwg-url'

const GLOBAL = global as any
GLOBAL.URL = URL
GLOBAL.URLSearchParams = URLSearchParams

// Safari doesn't implement the full FormData prototype ¯\_(ツ)_/¯
if (!GLOBAL.FormData.prototype.set) {
    require('formdata-polyfill')
}
