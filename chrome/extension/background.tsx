import { without } from 'lodash'
import { setSourcegraphUrl } from '../../app/util/context'

let customServerOrigins: string[] = []

const contentScripts = chrome.runtime.getManifest().content_scripts

// jsContentScriptOrigins are the required URLs inside of the manifest. When checking for permissions to inject
// the content script on optional pages (inside chrome.tabs.onUpdated) we need to skip manual injection of the
// script since the browser extension will automatically inject it.
const jsContentScriptOrigins: string[] = []
if (contentScripts) {
    for (const contentScript of contentScripts) {
        if (!contentScript || !contentScript.js || !contentScript.matches) {
            continue
        }
        jsContentScriptOrigins.push(...contentScript.matches)
    }
}

chrome.storage.onChanged.addListener(changes => {
    chrome.storage.sync.get(items => {
        if (items.sourcegraphURL) {
            setSourcegraphUrl(items.sourcegraphURL)
        }
    })
})

chrome.permissions.getAll(permissions => {
    if (!permissions.origins) {
        customServerOrigins = []
        return
    }
    customServerOrigins = without(permissions.origins, ...jsContentScriptOrigins)
})

if (chrome.permissions.onAdded) {
    chrome.permissions.onAdded.addListener(permissions => {
        if (permissions.origins) {
            const origins = without(permissions.origins, ...jsContentScriptOrigins)
            customServerOrigins.push(...origins)
        }
    })
}

if (chrome.permissions.onRemoved) {
    chrome.permissions.onRemoved.addListener(permissions => {
        if (permissions.origins) {
            customServerOrigins = without(customServerOrigins, ...permissions.origins)
        }
    })
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        for (const origin of customServerOrigins) {
            if (!tab.url || !tab.url.startsWith(origin.replace('/*', ''))) {
                continue
            }
            chrome.tabs.executeScript(tabId, { file: 'js/inject.bundle.js', runAt: 'document_end' })
        }
    }
})

/**
 * Content script injected into webpages through "activeTab" permission to determine if webpage is a Sourcegraph Server instance.
 */
export const isSourcegraphServerCheck = () =>
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!request.data || request.data !== 'isSGServerInstance') {
            return
        }
        const isSourcegraphDomain = document.getElementById('sourcegraph-chrome-webstore-item')
        if (isSourcegraphDomain) {
            document.dispatchEvent(new CustomEvent('sourcegraph:server-instance-configuration-clicked', {}))
        }
        sendResponse(Boolean(isSourcegraphDomain))
        return true
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

        case 'setGitHubEnterpriseUrl':
            requestPermissionsForGitHubEnterpriseUrl(message.payload)
            return

        case 'setPhabricatorUrl':
            requestPermissionsForPhabricatorUrl(message.payload)
            return

        case 'setSourcegraphUrl':
            requestPermissionsForSourcegraphUrl(message.payload)
            return

        case 'injectCss':
            chrome.tabs.query({ active: true }, tabs => {
                for (const tab of tabs) {
                    if (tab.id) {
                        chrome.tabs.insertCSS(tab.id, { file: 'css/style.bundle.css', runAt: 'document_end' }, res =>
                            console.log('injected CSS bundle on tab ' + tab.id)
                        )
                    }
                }
            })
            return true
    }
})

function requestPermissionsForGitHubEnterpriseUrl(url: string): void {
    chrome.permissions.request(
        {
            origins: [url + '/*'],
        },
        granted => {
            if (granted) {
                chrome.storage.sync.set({ gitHubEnterpriseURL: url })
            }
        }
    )
}

function requestPermissionsForPhabricatorUrl(url: string): void {
    chrome.permissions.request(
        {
            origins: [url + '/*'],
        },
        granted => {
            if (granted) {
                chrome.storage.sync.set({ phabricatorURL: url })
            }
        }
    )
}

function requestPermissionsForSourcegraphUrl(url: string): void {
    chrome.permissions.request(
        {
            origins: [url + '/*'],
        },
        granted => {
            if (granted) {
                chrome.storage.sync.set({ sourcegraphURL: url })
            }
        }
    )
}

if (chrome.runtime.setUninstallURL) {
    chrome.runtime.setUninstallURL('https://about.sourcegraph.com/uninstall/')
}
