import { isFirefoxExtension } from '../../app/util/context'
import * as permissions from '../../extension/permissions'
import * as runtime from '../../extension/runtime'
import * as storage from '../../extension/storage'
import * as tabs from '../../extension/tabs'
import { isSourcegraphServerCheck } from './background'

function getSourcegraphURLInput(): HTMLInputElement {
    return document.getElementById('sg-url') as HTMLInputElement
}

// Initially focus this input.
getSourcegraphURLInput().focus()

function getGitHubEnterpriseURLInput(): HTMLInputElement {
    return document.getElementById('sg-github-enterprise-url') as HTMLInputElement
}

function getPhabricatorURLInput(): HTMLInputElement {
    return document.getElementById('sg-phabricator-url') as HTMLInputElement
}

function getSourcegraphURLForm(): HTMLFormElement {
    return document.getElementById('sg-url-form') as HTMLFormElement
}

function getGithubEnterpriseURLForm(): HTMLFormElement {
    return document.getElementById('sg-github-enterprise-form') as HTMLFormElement
}

function getPhabricatorURLForm(): HTMLFormElement {
    return document.getElementById('sg-phabricator-form') as HTMLFormElement
}

function getSourcegraphURLSaveButton(): HTMLInputElement {
    return getSourcegraphURLForm().querySelector('input.sg-url-save-button[type="submit"]') as HTMLInputElement
}

function getGitHubEnterpriseSaveButton(): HTMLInputElement {
    return getGithubEnterpriseURLForm().querySelector(
        'input.sg-github-enterprise-save-button[type="submit"]'
    ) as HTMLInputElement
}

function getPhabricatorSaveButton(): HTMLInputElement {
    return getPhabricatorURLForm().querySelector('input.sg-save-button[type="submit"]') as HTMLInputElement
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

function configurationOptionsContainer(): HTMLElement {
    return document.getElementById('sg-options-container') as HTMLElement
}

/**
 * Auto-configure Sourcegraph Url for Sourcegraph Server cancel button.
 */
function getSourcegraphURLCancelButton(): HTMLButtonElement {
    return document.getElementById('sg-url-cancel-button') as HTMLButtonElement
}

/**
 * Auto-configure Sourcegraph Url for Sourcegraph Server connect button.
 */
function getAutoConfigureSourcegraphButton(): HTMLButtonElement {
    return document.getElementById('sg-url-connect-button') as HTMLButtonElement
}

function syncInputsToLocalStorage(): void {
    storage.getSync(items => {
        getSourcegraphURLInput().value = items.sourcegraphURL
        getGithubEnterpriseURLForm().value = items.gitHubEnterpriseURL
        getPhabricatorURLInput().value = items.phabricatorURL
        getEnableEventTrackingCheckbox().checked = items.eventTrackingEnabled
        getRepositorySearchCheckbox().checked = items.repositorySearchEnabled
        getFileTreeNavigationCheckbox().checked = items.repositoryFileTreeEnabled
        getOpenEditorCheckbox().checked = items.openEditorEnabled
    })
}

storage.onChanged(syncInputsToLocalStorage)

/**
 * Initialize all local storage values when the user first installs the extension.
 * This should only write values that aren't already set, else it will initialize
 * fields with previously saved values.
 */
storage.getSync(items => {
    if (!isFirefoxExtension() && getEnableEventTrackingContainer()) {
        getEnableEventTrackingContainer().style.display = 'none'
    }

    if (items.sourcegraphURL === undefined) {
        storage.setSync({ sourcegraphURL: 'https://sourcegraph.com' })
    } else {
        getSourcegraphURLInput().value = items.sourcegraphURL
    }

    if (items.gitHubEnterpriseURL === undefined) {
        storage.setSync({ gitHubEnterpriseURL: '' })
    } else {
        getGitHubEnterpriseURLInput().value = items.gitHubEnterpriseURL
    }

    if (items.phabricatorURL === undefined) {
        storage.setSync({ phabricatorURL: '' })
    } else {
        getPhabricatorURLInput().value = items.phabricatorURL
    }

    if (items.eventTrackingEnabled === undefined) {
        storage.setSync({ eventTrackingEnabled: !isFirefoxExtension() })
    } else if (isFirefoxExtension()) {
        getEnableEventTrackingCheckbox().checked = items.eventTrackingEnabled
    }

    if (items.repositorySearchEnabled === undefined) {
        storage.setSync({ repositorySearchEnabled: true })
    } else {
        getRepositorySearchCheckbox().checked = items.repositorySearchEnabled
    }

    if (items.repositoryFileTreeEnabled === undefined) {
        storage.setSync({ repositoryFileTreeEnabled: true })
    } else {
        getFileTreeNavigationCheckbox().checked = items.repositoryFileTreeEnabled
    }

    if (items.openEditorEnabled === undefined) {
        storage.setSync({ openEditorEnabled: false })
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

    runtime.sendMessage({ type: 'setSourcegraphUrl', payload: url }, () => true)
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

    runtime.sendMessage({ type: 'setGitHubEnterpriseUrl', payload: url }, () => true)
})

getGithubEnterpriseURLForm().addEventListener('keydown', evt => {
    if (evt.keyCode === 13) {
        evt.preventDefault()
        getGitHubEnterpriseSaveButton().click()
    }
})

getPhabricatorURLForm().addEventListener('submit', evt => {
    evt.preventDefault()

    let url = getPhabricatorURLInput().value
    if (url.endsWith('/')) {
        // Trim trailing slash.
        url = url.substr(0, url.length - 1)
    }

    runtime.sendMessage({ type: 'setPhabricatorUrl', payload: url }, () => true)
})

getPhabricatorURLForm().addEventListener('keydown', evt => {
    if (evt.keyCode === 13) {
        evt.preventDefault()
        getPhabricatorSaveButton().click()
    }
})

getEnableEventTrackingCheckbox().addEventListener('click', () => {
    storage.setSync({ eventTrackingEnabled: getEnableEventTrackingCheckbox().checked })
})

getRepositorySearchCheckbox().addEventListener('click', () => {
    storage.setSync({ repositorySearchEnabled: getRepositorySearchCheckbox().checked })
})

getFileTreeNavigationCheckbox().addEventListener('click', () => {
    storage.setSync({ repositoryFileTreeEnabled: getFileTreeNavigationCheckbox().checked })
})

getOpenEditorCheckbox().addEventListener('click', () => {
    storage.setSync({ openEditorEnabled: getOpenEditorCheckbox().checked })
})

function setBrowserExtensionOptionsHidden(hidden: boolean): void {
    configurationOptionsContainer().style.display = hidden ? 'none' : 'block'
}

function setConfigureSourcegraphURLOptionsHidden(hidden: boolean): void {
    getConfigureSourcegraphURLContainer().style.display = hidden ? 'none' : 'block'
}

function getConfigureSourcegraphURLContainer(): HTMLElement {
    return document.getElementById('sg-server-configuration-container') as HTMLElement
}

/**
 * Render Browser Extension configuration page when the browser_action is clicked.
 * Using the "activeTab" permission, we are able to attempt to inject a simple function onto any webpage,
 * without requiring additional permissions. If the page is a Sourcegraph Server and the user does not have the
 * remote url configured already, we will prompt the user to link their extension and server instance.
 */
tabs.getActive(async tab => {
    if (!tab.url) {
        return
    }

    const urlElement = document.createElement('a') as HTMLAnchorElement
    urlElement.href = tab.url
    const url = `${urlElement.protocol}//${urlElement.host}`

    const containsPerms = await permissions.contains(url)

    if (containsPerms) {
        setBrowserExtensionOptionsHidden(false)
        setConfigureSourcegraphURLOptionsHidden(true)
        return
    }

    if (tab.url!.match(/^chrome:\/\//)) {
        return
    }

    tabs.executeScript(tab.id!, { code: isSourcegraphServerCheck.toString() }, result => {
        tabs.sendMessage(tab.id!, { data: 'isSGServerInstance' }, isSGServerInstance => {
            if (isSGServerInstance) {
                setBrowserExtensionOptionsHidden(true)
                setConfigureSourcegraphURLOptionsHidden(false)
                return
            }
            setBrowserExtensionOptionsHidden(false)
            setConfigureSourcegraphURLOptionsHidden(true)
        })
    })
})

/**
 * Add a click handler that requests permissions for the current URL tab. Our extension only requests the
 * "activeTab" permission so it is only possible for us to retrieve the URL or any details about the page
 * when a browser action is triggered.
 */
getAutoConfigureSourcegraphButton().addEventListener('click', evt => {
    evt.preventDefault()
    tabs.getActive(tab => {
        const { url } = tab
        if (!url) {
            return
        }
        const urlElement = document.createElement('a') as HTMLAnchorElement
        urlElement.href = url

        const baseUrl = `${urlElement.protocol}//${urlElement.host}`
        runtime.sendMessage({ type: 'setSourcegraphUrl', payload: baseUrl }, () => {
            setBrowserExtensionOptionsHidden(false)
            setConfigureSourcegraphURLOptionsHidden(true)
            return true
        })
    })
})

/**
 * Update the UI to show default Sourcegraph Server options if the user does not want to add their Sourcegraph Server instance.
 */
getSourcegraphURLCancelButton().addEventListener('click', () => {
    setBrowserExtensionOptionsHidden(false)
    setConfigureSourcegraphURLOptionsHidden(true)
})

/**
 * The options menu does not properly resize when content is changed. The easiest work around is to set the
 * display to 'none' in the options.scss and update it to 'block' inside a timeout. This ensures there isn't
 * any jumpiness.
 */
window.setTimeout(() => {
    const options = document.querySelector('.sg-options') as HTMLElement
    if (!options) {
        return
    }
    setTimeout(() => {
        options.style.display = 'block'
    })
})
