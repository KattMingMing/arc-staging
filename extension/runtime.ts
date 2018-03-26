import browser from './browser'
import safariMessager from './safari/SafariMessager'

const safari = window.safari

export interface Message {
    type: string
    payload?: any
}

export const sendMessage = (message: Message, responseCallback?: (response: any) => void) => {
    if (browser && browser.runtime) {
        browser.runtime.sendMessage(message, responseCallback)
    }

    if (safari) {
        safariMessager.send(message, responseCallback)
    }
}

export const onMessage = (
    callback: (message: Message, sender: browser.runtime.MessageSender, sendResponse: (response: any) => void) => void
) => {
    if (browser && browser.runtime && browser.runtime.onMessage) {
        browser.runtime.onMessage.addListener(callback)
        return
    }

    if (safari && safari.application) {
        safariMessager.onMessage(callback)
        return
    }

    throw new Error('do not call runtime.onMessage from a content script')
}

export const setUninstallURL = (url: string) => {
    if (browser && browser.runtime && browser.runtime.setUninstallURL) {
        browser.runtime.setUninstallURL(url)
    }
}

export const getManifest = () => {
    if (browser && browser.runtime && browser.runtime.getManifest) {
        return browser.runtime.getManifest()
    }

    return null
}

export const getContentScripts = () => {
    if (browser && browser.runtime) {
        return browser.runtime.getManifest().content_scripts
    }
    console.log('SAFARI getContentScripts', safari)
    return []
}

export const onInstalled = (callback: (details: browser.runtime.InstalledDetails) => void) => {
    if (browser && browser.runtime && browser.runtime.onInstalled) {
        browser.runtime.onInstalled.addListener(callback)
        return
    }
}
