import { injectGitHubApplication } from '../../app/github/inject'
import { injectPhabricatorApplication } from '../../app/phabricator/app'
import { injectSourcegraphApp } from '../../app/sourcegraph/inject'
import { ExtensionEventLogger } from '../../app/tracking/ExtensionEventLogger'
import {
    setEventLogger,
    setEventTrackingEnabled,
    setOpenEditorEnabled,
    setRepositoryFileTreeEnabled,
    setRepositorySearchEnabled,
    setSourcegraphRepoSearchToggled,
    setSourcegraphUrl,
} from '../../app/util/context'
import '../../app/util/polyfill'

// set the event logger before anything else proceeds, to avoid logging events before we have it set
setEventLogger(new ExtensionEventLogger())

/**
 * Main entry point into browser extension.
 */
function injectApplication(): void {
    const extensionMarker = document.createElement('div')
    extensionMarker.id = 'sourcegraph-app-background'
    extensionMarker.style.display = 'none'
    if (document.getElementById(extensionMarker.id)) {
        return
    }

    const href = window.location.href
    chrome.storage.sync.get(items => {
        const srcgEl = document.getElementById('sourcegraph-chrome-webstore-item')
        const sourcegraphServerUrl = items.sourcegraphURL || 'https://sourcegraph.com'
        const isSourcegraphServer = window.location.origin === sourcegraphServerUrl || !!srcgEl
        const githubEnterpriseURL = items.gitHubEnterpriseURL
        const isPhabricator = window.location.origin === items.phabricatorURL

        const isGitHub = /^https?:\/\/(www.)?github.com/.test(href)
        const isGitHubEnterprise = Boolean(githubEnterpriseURL) && href.startsWith(githubEnterpriseURL)

        if (!isSourcegraphServer) {
            chrome.runtime.sendMessage({
                type: 'injectCss',
                payload: { origin: window.location.origin },
            })
        }
        if (isGitHub || isGitHubEnterprise) {
            setSourcegraphUrl(sourcegraphServerUrl)
            setRepositoryFileTreeEnabled(
                items.repositoryFileTreeEnabled === undefined ? true : items.repositoryFileTreeEnabled
            )
            setRepositorySearchEnabled(
                items.repositoryFileTreeEnabled === undefined ? true : items.repositorySearchEnabled
            )
            setSourcegraphRepoSearchToggled(items.sourcegraphRepoSearchToggled)
            setEventTrackingEnabled(items.eventTrackingEnabled)
            setOpenEditorEnabled(items.openEditorEnabled)
            injectGitHubApplication(extensionMarker)
        } else if (isSourcegraphServer || /^https?:\/\/(www.)?sourcegraph.com/.test(href)) {
            setSourcegraphUrl(sourcegraphServerUrl)
            injectSourcegraphApp(extensionMarker)
        } else if (isPhabricator) {
            window.SOURCEGRAPH_PHABRICATOR_EXTENSION = true
            setSourcegraphUrl(sourcegraphServerUrl)
            injectPhabricatorApplication()
        }
    })
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // document is already ready to go
    injectApplication()
} else {
    document.addEventListener('DOMContentLoaded', injectApplication)
}
