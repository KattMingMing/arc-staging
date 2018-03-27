const chrome = global.chrome

export const setBadgeText = (details: chrome.browserAction.BadgeTextDetails) => {
    if (chrome && chrome.browserAction) {
        chrome.browserAction.setBadgeText(details)
    }
}
