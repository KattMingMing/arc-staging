import { injectGitHubApplication } from '../../app/github/inject'
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

    const href = window.location.href
    if (/^https?:\/\/(www.)?sourcegraph.com/.test(href)) {
        setSourcegraphUrl('https://sourcegraph.com')
        injectSourcegraphApp(extensionMarker)
    } else {
        chrome.storage.sync.get(items => {
            const sgurl = items.sourcegraphURL ? items.sourcegraphURL : 'https://sourcegraph.com'
            const githubEnterpriseURL = items.gitHubEnterpriseURL

            const isGitHub = /^https?:\/\/(www.)?github.com/.test(href)
            const isGitHubEnterprise = Boolean(githubEnterpriseURL) && href.startsWith(githubEnterpriseURL)

            if (isGitHub || isGitHubEnterprise) {
                setSourcegraphUrl(sgurl)
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
            }
        })
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // document is already ready to go
    injectApplication()
} else {
    document.addEventListener('DOMContentLoaded', injectApplication)
}
