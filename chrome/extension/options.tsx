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
    return getGithubEnterpriseURLForm().querySelector(
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

function getOpenEditorCheckbox(): HTMLInputElement {
    return document.getElementById('sg-editor-open') as HTMLInputElement
}

function syncInputsToLocalStorage(): void {
    chrome.storage.sync.get(items => {
        getSourcegraphURLInput().value = items.sourcegraphURL
        getGithubEnterpriseURLForm().value = items.gitHubEnterpriseURL
        getEnableEventTrackingCheckbox().checked = items.eventTrackingEnabled
        getRepositorySearchCheckbox().checked = items.repositorySearchEnabled
        getFileTreeNavigationCheckbox().checked = items.repositoryFileTreeEnabled
        getOpenEditorCheckbox().checked = items.openEditorEnabled
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

    if (items.openEditorEnabled === undefined) {
        chrome.storage.sync.set({ openEditorEnabled: false })
    } else {
        getOpenEditorCheckbox().checked = items.openEditorEnabled
    }
})

getSourcegraphURLForm().addEventListener('submit', evt => {
    evt.preventDefault()

    let url = getSourcegraphURLInput().value
    if (url.endsWith('/')) {
        // Trim trailing slash.
        url = url.substr(0, url.length - 1)
    }

    chrome.runtime.sendMessage({ type: 'setSourcegraphUrl', payload: url }, () => true)
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
        url = url.substr(0, url.length - 1)
    }

    chrome.runtime.sendMessage({ type: 'setGitHubEnterpriseUrl', payload: url }, () => true)
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

getOpenEditorCheckbox().addEventListener('click', () => {
    chrome.storage.sync.set({ openEditorEnabled: getOpenEditorCheckbox().checked })
})
