import { TelligentWrapper } from '../../app/tracking/TelligentWrapper'
import { sourcegraphUrl } from '../../app/util/context'

const telligentWrapper = new TelligentWrapper('SourcegraphExtension', 'BrowserExtension', true, true)

let trackingEnabled = true
let customGitHubOrigins = {}
chrome.storage.sync.get(items => {
    trackingEnabled = items.eventTrackingEnabled
    if (items.gitHubEnterpriseURL) {
        customGitHubOrigins[items.gitHubEnterpriseURL] = true
    }
    if (items.sourcegraphURL) {
        customGitHubOrigins[items.sourcegraphURL] = true
    }
})
chrome.storage.onChanged.addListener(change => {
    chrome.storage.sync.get(items => {
        customGitHubOrigins = {}
        trackingEnabled = items.eventTrackingEnabled
        if (items.gitHubEnterpriseURL) {
            customGitHubOrigins[items.gitHubEnterpriseURL] = true
        }
        if (items.sourcegraphURL) {
            customGitHubOrigins[items.sourcegraphURL] = true
        }
    })
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        for (const origin of Object.keys(customGitHubOrigins)) {
            if (!tab.url || !(tab.url as string).startsWith(origin)) {
                continue
            }
            chrome.tabs.executeScript(tabId, { file: 'js/inject.bundle.js', runAt: 'document_end' }, res =>
                console.log('injected JavaScript bundle on tab ' + tabId)
            )
            chrome.tabs.insertCSS(tabId, { file: 'css/style.bundle.css', runAt: 'document_end' }, res =>
                console.log('injected CSS bundle on tab ' + tabId)
            )
        }
    }
    // console.log('added perms!!!', perms)
})

chrome.runtime.onMessage.addListener((message, _, cb) => {
    switch (message.type) {
        case 'setIdentity':
            chrome.storage.local.set({ identity: message.identity })
            return

        case 'getIdentity':
            chrome.storage.local.get('identity', obj => {
                const { identity } = obj
                cb(identity)
            })
            return true

        case 'getSessionToken':
            chrome.cookies.get({ url: sourcegraphUrl, name: 'sg-session' }, sessionToken => {
                cb(sessionToken ? sessionToken.value : null)
            })
            return true

        case 'openSourcegraphTab':
            chrome.tabs.create({ url: message.url })
            return true

        case 'trackEvent':
            if (telligentWrapper && trackingEnabled) {
                telligentWrapper.track(message.payload.eventAction, message.payload)
            }
            return

        case 'trackView':
            if (telligentWrapper) {
                telligentWrapper.track('view', message.payload)
            }
            return

        case 'setTrackerUserId':
            if (telligentWrapper) {
                telligentWrapper.setUserId(message.payload)
            }
            return

        case 'setTrackerDeviceId':
            if (telligentWrapper) {
                telligentWrapper.addStaticMetadataObject({ deviceInfo: { TelligentWebDeviceId: message.payload } })
            }
            return

        case 'setTrackerGAClientId':
            if (telligentWrapper) {
                telligentWrapper.addStaticMetadataObject({ deviceInfo: { GAClientId: message.payload } })
            }
            return
    }
})

if (chrome.runtime.setUninstallURL) {
    chrome.runtime.setUninstallURL('https://about.sourcegraph.com/uninstall/')
}
