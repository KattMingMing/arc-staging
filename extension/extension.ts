import browser from './browser'

export const getURL = (path: string) => {
    if (browser && browser.extension && browser.extension.getURL) {
        return browser.extension.getURL(path)
    }

    return safari.extension.baseURI + path
}
