import browser from './browser'

const safari = window.safari

export const onUpdated = (
    callback: (tabId: number, changeInfo: browser.tabs.TabChangeInfo, tab: browser.tabs.Tab) => void
) => {
    if (browser && browser.tabs && browser.tabs.onUpdated) {
        browser.tabs.onUpdated.addListener(callback)
    }

    if (safari && safari.application) {
        console.log('SAFARI tabs.onUpdated', safari)

        safari.application.addEventListener('change', (...args: any[]) => {
            console.log('application on change', ...args)
        })
    }
}

export const getActive = (callback: (tab: browser.tabs.Tab) => void) => {
    if (browser && browser.tabs) {
        browser.tabs.query({ active: true }, (tabs: browser.tabs.Tab[]) => {
            for (const tab of tabs) {
                callback(tab)
            }
        })
    } else {
        console.log('SAFARI tabs.getActive')
    }
}

interface InjectDetails extends browser.tabs.InjectDetails {
    origin?: string
    whitelist?: string[]
    blacklist?: string[]
}

const patternify = (str: string) => `${str}/*`

export const insertCSS = (tabId: number, details: InjectDetails, callback?: () => void) => {
    if (browser && browser.tabs && browser.tabs.insertCSS) {
        browser.tabs.insertCSS(tabId, details, callback)
    }

    // Safari doesn't have a target tab filter for injecting CSS.
    // Our workaround is to pass in the current tab's origin as the whitelist.
    if (safari) {
        const extension = safari.extension as SafariExtension

        const whitelist = (details.whitelist || []).map(patternify)
        const blacklist = (details.blacklist || []).map(patternify)

        extension.addContentStyleSheetFromURL(safari.extension.baseURI + details.file, whitelist, blacklist)
    }
}

export const executeScript = (tabId: number, details: InjectDetails, callback?: (result: any[]) => void) => {
    if (browser && browser.tabs) {
        const { origin, whitelist, blacklist, ...rest } = details
        browser.tabs.executeScript(tabId, rest, callback)
    }

    // Safari doesn't have a target tab filter for executing js.
    // Our workaround is to pass in the current tab's origin as the whitelist.
    if (safari) {
        const extension = safari.extension as SafariExtension
        extension.addContentScriptFromURL(safari.extension.baseURI + details.file, [details.origin!], [], true)
    }
}

export const sendMessage = (tabId: number, message: any, responseCallback?: (response: any) => void) => {
    if (browser && browser.tabs) {
        browser.tabs.sendMessage(tabId, message, responseCallback)
    }

    // Noop on safari
    // TODO: Do we actually need this? It's currently only being used to check if the active tab is a sourcegraph server.
}
