import browser from './browser'

export const setBadgeText = (details: browser.browserAction.BadgeTextDetails) => {
    if (browser && browser.browserAction) {
        browser.browserAction.setBadgeText(details)
    }
}
