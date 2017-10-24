import { TelligentWrapper } from '../../app/tracking/TelligentWrapper'
import { sourcegraphUrl } from '../../app/util/context'

const telligentWrapper = new TelligentWrapper('SourcegraphExtension', 'BrowserExtension', true, true)

const application = 'com.sourcegraph.browser_ext_host'
let port: any = null

if (process.env.NODE_ENV === 'development') {
    try {
        port = chrome.runtime.connectNative(application)
        // port.onMessage.addListener((e) => console.log("port connected", e));
        port.onDisconnect.addListener(e => {
            console.error('unexpected disconnect', e)
            port = null
        })
    } catch (err) {
        console.error(err)
    }
}

let trackingEnabled = true
chrome.storage.sync.get(items => {
    trackingEnabled = items.eventTrackingEnabled
})
chrome.storage.onChanged.addListener(change  => {
    console.log('got a change!!!', change)
    chrome.storage.sync.get(items => {
        trackingEnabled = items.eventTrackingEnabled
    })
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

        case 'openEditor':
            const msg = { cmd: message.cmd }
            if (port) {
                port.postMessage(msg)
            } else {
                chrome.runtime.sendNativeMessage(application, msg, cb)
            }
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
