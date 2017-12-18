import { isFirefoxExtension } from '../../app/util/context'

function getSourcegraphURLInput(): HTMLInputElement {
    return document.getElementById('sg-url') as HTMLInputElement
}

function getGitHubEnterpriseURLInput(): HTMLInputElement {
    return document.getElementById('sg-github-enterprise-url') as HTMLInputElement
}

// Initially focus this input.
getSourcegraphURLInput().focus()

function getSourcegraphURLForm(): HTMLFormElement {
    return document.getElementById('sg-url-form') as HTMLFormElement
}

function getGithubEnterpriseURLForm(): HTMLFormElement {
    return document.getElementById('sg-github-enterprise-form') as HTMLFormElement
}

function getSourcegraphURLSaveButton(): HTMLInputElement {
    return getSourcegraphURLForm().querySelector('input.sg-url-save-button[type="submit"]') as HTMLInputElement
}

function getGitHubEnterpriseSaveButton(): HTMLInputElement {
    return getSourcegraphURLForm().querySelector(
        'input.sg-github-enterprise-save-button[type="submit"]'
    ) as HTMLInputElement
}

function getEnableEventTrackingCheckbox(): HTMLInputElement {
    return document.getElementById('sg-enable-event-tracking') as HTMLInputElement
}

function getEnableEventTrackingContainer(): HTMLElement {
    return document.getElementById('sg-event-tracking-container') as HTMLElement
}

function getRepositorySearchCheckbox(): HTMLInputElement {
    return document.getElementById('sg-repository-search') as HTMLInputElement
}

function getFileTreeNavigationCheckbox(): HTMLInputElement {
    return document.getElementById('sg-file-tree-navigation') as HTMLInputElement
}

function getSourcegraphEditorOptionsContainer(): HTMLElement {
    return document.getElementById('sg-editor-container') as HTMLElement
}

function getOpenInEditorCheckbox(): HTMLInputElement {
    return document.getElementById('sg-open-in-editor') as HTMLInputElement
}

function syncInputsToLocalStorage(): void {
    chrome.storage.sync.get(items => {
        getSourcegraphURLInput().value = items.sourcegraphURL
        getGithubEnterpriseURLForm().value = items.gitHubEnterpriseURL
        getEnableEventTrackingCheckbox().checked = items.eventTrackingEnabled
        getRepositorySearchCheckbox().checked = items.repositorySearchEnabled
        getFileTreeNavigationCheckbox().checked = items.repositoryFileTreeEnabled
        getOpenInEditorCheckbox().checked = items.openInEditorEnabled
    })
}

chrome.storage.onChanged.addListener(syncInputsToLocalStorage)

/**
 * Initialize all local storage values when the user first installs the extension.
 * This should only write values that aren't already set, else it will initialize
 * fields with previously saved values.
 */
chrome.storage.sync.get(items => {
    if (!isFirefoxExtension() && getEnableEventTrackingContainer()) {
        getEnableEventTrackingContainer().style.display = 'none'
    }

    // Currently hide the ability to set editor features until editor is released.
    getSourcegraphEditorOptionsContainer().style.display = 'none'

    if (items.sourcegraphURL === undefined) {
        chrome.storage.sync.set({ sourcegraphURL: 'https://sourcegraph.com' })
    } else {
        getSourcegraphURLInput().value = items.sourcegraphURL
    }

    if (items.gitHubEnterpriseURL === undefined) {
        chrome.storage.sync.set({ gitHubEnterpriseURL: '' })
    } else {
        getGitHubEnterpriseURLInput().value = items.gitHubEnterpriseURL
    }

    if (items.eventTrackingEnabled === undefined) {
        chrome.storage.sync.set({ eventTrackingEnabled: !isFirefoxExtension() })
    } else if (isFirefoxExtension()) {
        getEnableEventTrackingCheckbox().checked = items.eventTrackingEnabled
    }

    if (items.repositorySearchEnabled === undefined) {
        chrome.storage.sync.set({ repositorySearchEnabled: true })
    } else {
        getRepositorySearchCheckbox().checked = items.repositorySearchEnabled
    }

    if (items.repositoryFileTreeEnabled === undefined) {
        chrome.storage.sync.set({ repositoryFileTreeEnabled: true })
    } else {
        getFileTreeNavigationCheckbox().checked = items.repositoryFileTreeEnabled
    }

    if (items.openInEditorEnabled === undefined) {
        chrome.storage.sync.set({ openInEditorEnabled: false })
    } else {
        getOpenInEditorCheckbox().checked = items.openInEditorEnabled
    }
})

getSourcegraphURLForm().addEventListener('submit', evt => {
    evt.preventDefault()

    let url = getSourcegraphURLInput().value
    if (url.endsWith('/')) {
        // Trim trailing slash.
        url = url.substr(url.length - 1)
    }

    chrome.permissions.request(
        {
            origins: [url + '/*'],
        },
        granted => {
            if (granted) {
                chrome.storage.sync.set({ sourcegraphURL: url })
            } else {
                syncInputsToLocalStorage()
                // Note: it would be nice to display an alert here with an error, but the alert API doesn't work in the options panel
                // (see https://bugs.chromium.org/p/chromium/issues/detail?id=476350)
            }
        }
    )
})

getSourcegraphURLInput().addEventListener('keydown', evt => {
    if (evt.keyCode === 13) {
        evt.preventDefault()
        getSourcegraphURLSaveButton().click()
    }
})

getGithubEnterpriseURLForm().addEventListener('submit', evt => {
    evt.preventDefault()

    let url = getGitHubEnterpriseURLInput().value
    if (url.endsWith('/')) {
        // Trim trailing slash.
        url = url.substr(url.length - 1)
    }

    chrome.permissions.request(
        {
            origins: [url + '/*'],
            permissions: ['tabs'],
        },
        granted => {
            if (granted) {
                chrome.storage.sync.set({ gitHubEnterpriseURL: url })
            } else {
                syncInputsToLocalStorage()
                // Note: it would be nice to display an alert here with an error, but the alert API doesn't work in the options panel
                // (see https://bugs.chromium.org/p/chromium/issues/detail?id=476350)
            }
        }
    )
})

getGithubEnterpriseURLForm().addEventListener('keydown', evt => {
    if (evt.keyCode === 13) {
        evt.preventDefault()
        getGitHubEnterpriseSaveButton().click()
    }
})

getEnableEventTrackingCheckbox().addEventListener('click', () => {
    chrome.storage.sync.set({ eventTrackingEnabled: getEnableEventTrackingCheckbox().checked })
})

getRepositorySearchCheckbox().addEventListener('click', () => {
    chrome.storage.sync.set({ repositorySearchEnabled: getRepositorySearchCheckbox().checked })
})

getFileTreeNavigationCheckbox().addEventListener('click', () => {
    chrome.storage.sync.set({ repositoryFileTreeEnabled: getFileTreeNavigationCheckbox().checked })
})

getOpenInEditorCheckbox().addEventListener('click', () => {
    chrome.storage.sync.set({ openInEditorEnabled: getOpenInEditorCheckbox().checked })
})
