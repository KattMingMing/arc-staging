import { injectGitHubApplication } from '../../app/github/inject'
import { injectPhabricatorApplication } from '../../app/phabricator/inject'
import { injectSourcegraphApp } from '../../app/sourcegraph/inject'
import { ExtensionEventLogger } from '../../app/tracking/ExtensionEventLogger'
import {
    setEventLogger,
    setEventTrackingEnabled,
    setOpenInEditorEnabled,
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
    if (/^https?:\/\/(www.)?github.com/.test(href)) {
        chrome.storage.sync.get(items => {
            const sgurl = items.sourcegraphURL ? items.sourcegraphURL : 'https://sourcegraph.com'
            setSourcegraphUrl(sgurl)
            setRepositoryFileTreeEnabled(items.repositoryFileTreeEnabled === undefined ? true : items.repositoryFileTreeEnabled)
            setRepositorySearchEnabled(items.repositoryFileTreeEnabled === undefined ? true : items.repositorySearchEnabled)
            setSourcegraphRepoSearchToggled(items.sourcegraphRepoSearchToggled)
            setEventTrackingEnabled(items.eventTrackingEnabled)
            setOpenInEditorEnabled(items.openInEditorEnabled)
            injectGitHubApplication(extensionMarker)
        })
    } else if (/^https?:\/\/(www.)?sourcegraph.com/.test(href)) {
        setSourcegraphUrl('https://sourcegraph.com')
        injectSourcegraphApp(extensionMarker)
    } else if (/^https?:\/\/phabricator.aws.sgdev.org/.test(href)) {
        setSourcegraphUrl('http://node.aws.sgdev.org:30000')
        injectPhabricatorApplication()
    }
}

// Inject the application.
injectApplication()
