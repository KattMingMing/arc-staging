// We want to polyfill first.
// prettier-ignore
import '../../app/util/polyfill'

import { without } from 'lodash'

import { setServerUrls, setSourcegraphUrl } from '../../app/util/context'
import * as permissions from '../../extension/permissions'
import * as runtime from '../../extension/runtime'
import * as storage from '../../extension/storage'
import * as tabs from '../../extension/tabs'

let customServerOrigins: string[] = []

const contentScripts = runtime.getManifest().content_scripts

// jsContentScriptOrigins are the required URLs inside of the manifest. When checking for permissions to inject
// the content script on optional pages (inside browser.tabs.onUpdated) we need to skip manual injection of the
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

storage.onChanged(changes => {
    if (changes.sourcegraphURL && changes.sourcegraphURL.newValue) {
        setSourcegraphUrl(changes.sourcegraphURL.newValue)
    }
    if (changes.serverUrls && changes.serverUrls.newValue) {
        setServerUrls(changes.serverUrls.newValue)
    }
})

permissions.getAll().then(permissions => {
    if (!permissions.origins) {
        customServerOrigins = []
        return
    }
    customServerOrigins = without(permissions.origins, ...jsContentScriptOrigins)
})

permissions.onAdded(permissions => {
    if (permissions.origins) {
        const origins = without(permissions.origins, ...jsContentScriptOrigins)
        customServerOrigins.push(...origins)
    }
})

permissions.onRemoved(permissions => {
    if (permissions.origins) {
        customServerOrigins = without(customServerOrigins, ...permissions.origins)
    }
})

tabs.onUpdated((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        for (const origin of customServerOrigins) {
            if (!tab.url || !tab.url.startsWith(origin.replace('/*', ''))) {
                continue
            }
            tabs.executeScript(tabId, { file: 'js/inject.bundle.js', runAt: 'document_end' })
        }
    }
})

// TODO: Figure out a way for this to work cross browser. It will work on Chrome and Firefox but not Safari.
/**
 * Content script injected into webpages through "activeTab" permission to determine if webpage is a Sourcegraph Server instance.
 */
export const isSourcegraphServerCheck = () => {
    window.chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
}

runtime.onMessage((message, _, cb) => {
    switch (message.type) {
        case 'setIdentity':
            storage.setLocal({ identity: message.identity })
            return

        case 'getIdentity':
            storage.getLocalItem('identity', obj => {
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
    }
})

async function requestPermissionsForGitHubEnterpriseUrl(url: string): Promise<void> {
    const granted = await permissions.request(url)
    if (granted) {
        storage.setSync({ gitHubEnterpriseURL: url })
    }
}

async function requestPermissionsForPhabricatorUrl(url: string): Promise<void> {
    const granted = await permissions.request(url)
    if (granted) {
        storage.setSync({ phabricatorURL: url })
    }
}

async function requestPermissionsForSourcegraphUrl(url: string): Promise<void> {
    const granted = await permissions.request(url)
    if (granted) {
        storage.setSync({ sourcegraphURL: url })
    }
}

runtime.setUninstallURL('https://about.sourcegraph.com/uninstall/')
