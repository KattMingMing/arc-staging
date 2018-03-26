// We want to polyfill first.
// prettier-ignore
import '../../app/util/polyfill'

import { first, without } from 'lodash'

import { createSuggestionFetcher, Suggestion } from '../../app/backend/search'
import { setServerUrls, setSourcegraphUrl } from '../../app/util/context'
import { buildSearchURLQuery } from '../../app/util/url'
import * as browserAction from '../../extension/browserAction'
import * as omnibox from '../../extension/omnibox'
import * as permissions from '../../extension/permissions'
import * as runtime from '../../extension/runtime'
import storage from '../../extension/storage'
import * as tabs from '../../extension/tabs'

let customServerOrigins: string[] = []

const contentScripts = runtime.getContentScripts()

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

const configureOmnibox = (serverUrl: string) => {
    omnibox.setDefaultSuggestion({
        description: `Search code on ${serverUrl}...`,
    })
}

const suggestionFetcher = createSuggestionFetcher()

omnibox.onInputChanged((query, suggest) => {
    storage.getSync(({ serverUrls, sourcegraphURL }) => {
        const sgUrl = sourcegraphURL || first(serverUrls)

        suggestionFetcher({
            query,
            handler: (suggestions: Suggestion[]) =>
                suggest(
                    suggestions.map(({ title, url, urlLabel }) => ({
                        content: `${sgUrl}${url}`,
                        description: `${title} - ${urlLabel}`,
                    }))
                ),
        })
    })
})

const isURL = /^https?:\/\//

omnibox.onInputEntered((query, disposition) => {
    storage.getSync(({ serverUrls, sourcegraphURL }) => {
        const url = sourcegraphURL || first(serverUrls)
        const props = {
            url: isURL.test(query) ? query : `${url}/search?${buildSearchURLQuery(query)}`,
        }

        switch (disposition) {
            case 'currentTab':
                tabs.update(props)
                break
            case 'newForegroundTab':
                tabs.create(props)
                break
            case 'newBackgroundTab':
                tabs.create({ ...props, active: false })
                break
        }
    })
})

storage.getSync(({ sourcegraphURL }) => configureOmnibox(sourcegraphURL))

storage.onChanged(changes => {
    if (changes.sourcegraphURL && changes.sourcegraphURL.newValue) {
        setSourcegraphUrl(changes.sourcegraphURL.newValue)
        configureOmnibox(changes.sourcegraphURL.newValue)
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

storage.addSyncMigration((items, set, remove) => {
    if (items.phabricatorURL) {
        remove('phabricatorURL')

        const newItems: {
            enterpriseUrls?: string[]
        } = {}

        if (items.enterpriseUrls && !items.enterpriseUrls.find(u => u === items.phabricatorURL)) {
            newItems.enterpriseUrls = items.enterpriseUrls.concat(items.phabricatorURL)
        } else if (!items.enterpriseUrls) {
            newItems.enterpriseUrls = [items.phabricatorURL]
        }

        set(newItems)
    }
})

tabs.onUpdated((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        for (const origin of customServerOrigins) {
            if (!tab.url || !tab.url.startsWith(origin.replace('/*', ''))) {
                continue
            }
            tabs.executeScript(tabId, { file: 'js/inject.bundle.js', runAt: 'document_end', origin })
        }
    }
})

// TODO: Figure out a way for this to work cross browser. It will work on Chrome and Firefox but not Safari.
/**
 * Content script injected into webpages through "activeTab" permission to determine if webpage is a Sourcegraph Server instance.
 */
export const isSourcegraphServerCheck = () => {
    runtime.onMessage(async (message, _, sendResponse) => {
        if (!message.type || message.type !== 'isSGServerInstance') {
            return
        }
        const isSourcegraphDomain = document.getElementById('sourcegraph-browser-webstore-item')
        if (isSourcegraphDomain) {
            document.dispatchEvent(new CustomEvent('sourcegraph:server-instance-configuration-clicked', {}))
        }
        sendResponse(Boolean(isSourcegraphDomain))
        return true
    })
}

runtime.onMessage(async (message, _, cb) => {
    switch (message.type) {
        case 'setIdentity':
            storage.setLocal({ identity: message.payload.identity })
            return

        case 'getIdentity':
            storage.getLocalItem('identity', obj => {
                const { identity } = obj

                cb(identity)
            })
            return true

        case 'setEnterpriseUrl':
            await requestPermissionsForEnterpriseUrl(message.payload, cb)
            return

        case 'setSourcegraphUrl':
            await requestPermissionsForSourcegraphUrl(message.payload)
            return

        case 'removeEnterpriseUrl':
            await removeEnterpriseUrl(message.payload, cb)
            return

        // We should only need to do this on safari
        case 'insertCSS':
            const details = message.payload as { file: string; origin: string }
            storage.getSyncItem('serverUrls', ({ serverUrls }) =>
                tabs.insertCSS(0, {
                    ...details,
                    whitelist: details.origin ? [details.origin] : [],
                    blacklist: serverUrls || [],
                })
            )
            return
        case 'setBadgeText':
            browserAction.setBadgeText({ text: message.payload })
            return
    }
})

async function requestPermissionsForEnterpriseUrl(url: string, cb: (res?: any) => void): Promise<void> {
    const granted = await permissions.request(url)
    if (!granted) {
        return
    }
    return storage.getSync(items => {
        const enterpriseUrls = items.enterpriseUrls || []
        storage.setSync(
            {
                enterpriseUrls: [...new Set([...enterpriseUrls, url])],
            },
            cb
        )
    })
}

async function requestPermissionsForSourcegraphUrl(url: string): Promise<void> {
    const granted = await permissions.request(url)
    if (granted) {
        storage.setSync({ sourcegraphURL: url })
    }
}

async function removeEnterpriseUrl(url: string, cb: (res?: any) => void): Promise<void> {
    permissions.remove(url)

    storage.getSyncItem('enterpriseUrls', ({ enterpriseUrls }) => {
        storage.setSync({ enterpriseUrls: without(enterpriseUrls, url) }, cb)
    })
}

runtime.setUninstallURL('https://about.sourcegraph.com/uninstall/')

runtime.onInstalled(() => {
    storage.getSync(items => {
        if (!items.serverUrls || items.serverUrls.length === 0) {
            storage.setSync({
                serverUrls: ['https://sourcegraph.com'],
                sourcegraphURL: 'https://sourcegraph.com',
                eventTrackingEnabled: true,
            })
        }
    })
})
