// We want to polyfill first.
// prettier-ignore
import '../../app/util/polyfill'

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
    setServerUrls,
    setSourcegraphRepoSearchToggled,
    setSourcegraphUrl,
} from '../../app/util/context'
import { getURL } from '../../extension/extension'
import storage from '../../extension/storage'

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
    storage.getSync(items => {
        const srcgEl = document.getElementById('sourcegraph-chrome-webstore-item')
        const sourcegraphServerUrl = items.sourcegraphURL || 'https://sourcegraph.com'
        const isSourcegraphServer = window.location.origin === sourcegraphServerUrl || !!srcgEl
        const isPhabricator =
            Boolean(document.querySelector('.phabricator-home')) || window.location.origin === items.phabricatorURL

        const isGitHub = /^https?:\/\/(www.)?github.com/.test(href)
        const ogSiteName = document.head.querySelector(`meta[property='og:site_name']`) as HTMLMetaElement
        const isGitHubEnterprise = ogSiteName ? ogSiteName.content === 'GitHub Enterprise' : false

        if (!isSourcegraphServer && !document.getElementById('ext-style-sheet')) {
            const styleSheet = document.createElement('link') as HTMLLinkElement
            styleSheet.id = 'ext-style-sheet'
            styleSheet.rel = 'stylesheet'
            styleSheet.type = 'text/css'
            styleSheet.href = getURL('css/style.bundle.css')
            document.head.appendChild(styleSheet)
        }

        if (isGitHub || isGitHubEnterprise) {
            setSourcegraphUrl(sourcegraphServerUrl)
            setServerUrls(items.serverUrls)
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
