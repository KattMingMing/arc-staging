import browser from './browser'

export const onUpdated = (
    callback: (tabId: number, changeInfo: browser.tabs.TabChangeInfo, tab: browser.tabs.Tab) => void
) => browser.tabs.onUpdated.addListener(callback)

export const getActive = (callback: (tab: browser.tabs.Tab) => void) =>
    browser.tabs.query({ active: true }, (tabs: browser.tabs.Tab[]) => {
        for (const tab of tabs) {
            callback(tab)
        }
    })

export const insertCSS = browser.tabs.insertCSS
export const executeScript = browser.tabs.executeScript
export const sendMessage = browser.tabs.sendMessage
