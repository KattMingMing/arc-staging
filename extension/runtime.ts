import browser from './browser'

export const sendMessage = (message: any, responseCallback?: (response: any) => void) =>
    browser.runtime.sendMessage(message, responseCallback)

export const onMessage = (
    callback: (message: any, sender: browser.runtime.MessageSender, sendResponse: (response: any) => void) => void
) => browser.runtime.onMessage.addListener(callback)

export const setUninstallURL = (url: string) => {
    if (browser.runtime.setUninstallURL) {
        browser.runtime.setUninstallURL(url)
    }
}

export const getManifest = browser.runtime.getManifest
