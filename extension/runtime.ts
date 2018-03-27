import safariMessager from './safari/SafariMessager'

const safari = window.safari
const chrome = global.chrome

export interface Message {
    type: string
    payload?: any
}

export const sendMessage = (message: Message, responseCallback?: (response: any) => void) => {
    if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage(message, responseCallback)
    }

    if (safari) {
        safariMessager.send(message, responseCallback)
    }
}

export const onMessage = (
    callback: (message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => void
) => {
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(callback)
        return
    }

    if (safari && safari.application) {
        safariMessager.onMessage(callback)
        return
    }

    throw new Error('do not call runtime.onMessage from a content script')
}

export const setUninstallURL = (url: string) => {
    if (chrome && chrome.runtime && chrome.runtime.setUninstallURL) {
        chrome.runtime.setUninstallURL(url)
    }
}

export const getManifest = () => {
    if (chrome && chrome.runtime && chrome.runtime.getManifest) {
        return chrome.runtime.getManifest()
    }

    return null
}

export const getContentScripts = () => {
    if (chrome && chrome.runtime) {
        return chrome.runtime.getManifest().content_scripts
    }
    return []
}

export const onInstalled = (handler: (info: chrome.runtime.InstalledDetails) => void) => {
    if (chrome && chrome.runtime && chrome.runtime.onInstalled) {
        chrome.runtime.onInstalled.addListener(handler)
    }
}
