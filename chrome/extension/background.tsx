import { setSourcegraphUrl } from '../../app/util/context'

let customGitHubOrigins = {}
chrome.storage.sync.get(items => {
    if (items.gitHubEnterpriseURL) {
        customGitHubOrigins[items.gitHubEnterpriseURL] = true
    }
})
chrome.storage.onChanged.addListener(changes => {
    chrome.storage.sync.get(items => {
        customGitHubOrigins = {}
        if (items.gitHubEnterpriseURL) {
            customGitHubOrigins[items.gitHubEnterpriseURL] = true
        }
        if (items.sourcegraphURL) {
            setSourcegraphUrl(items.sourcegraphURL)
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

        case 'setSourcegraphUrl':
            requestPermissionsForSourcegraphUrl(message.payload)
            return
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
