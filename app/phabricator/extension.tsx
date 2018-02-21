import '../util/polyfill'

import { InPageEventLogger } from '../tracking/InPageEventLogger'
import { eventLogger, getDomainUsername, setEventLogger, setSourcegraphUrl } from '../util/context'
import { injectPhabricatorBlobAnnotators } from './inject'
import { expanderListen, getPhabricatorUsername, metaClickOverride, setupPageLoadListener } from './util'

// NOTE: injectModules is idempotent, so safe to call multiple times on the same page.
function injectModules(): void {
    const extensionMarker = document.createElement('div')
    extensionMarker.id = 'sourcegraph-app-background'
    extensionMarker.style.display = 'none'
    document.body.appendChild(extensionMarker)

    injectPhabricatorBlobAnnotators().catch(e => console.error(e))
}

export function init(): void {
    const phabricatorUsername = getPhabricatorUsername()
    if (phabricatorUsername !== null) {
        const e = eventLogger as InPageEventLogger
        e.setUserId(getDomainUsername(window.SOURCEGRAPH_URL!, phabricatorUsername))
    }

    /**
     * This is the main entry point for the phabricator in-page JavaScript plugin.
     */
    if (window.localStorage && window.localStorage.SOURCEGRAPH_DISABLED !== 'true') {
        document.addEventListener('phabPageLoaded', () => {
            expanderListen()
            metaClickOverride()
            injectModules()
            setTimeout(injectModules, 1000) // extra data may be loaded asynchronously; reapply after timeout
            setTimeout(injectModules, 5000) // extra data may be loaded asynchronously; reapply after timeout
        })
        setupPageLoadListener()
    } else {
        // tslint:disable-next-line
        console.log(
            `Sourcegraph on Phabricator is disabled because window.localStorage.SOURCEGRAPH_DISABLED is set to ${window
                .localStorage.SOURCEGRAPH_DISABLED}.`
        )
    }
}

setSourcegraphUrl(window.SOURCEGRAPH_URL!)
setEventLogger(new InPageEventLogger())
init()
