import '../util/polyfill'

import { InPageEventLogger } from '../tracking/InPageEventLogger'
import { eventLogger, getDomainUsername, setEventLogger, setSourcegraphUrl } from '../util/context'
import { getPhabricatorCSS, getSourcegraphURLFromConduit } from './backend'
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
            getSourcegraphURLFromConduit()
                .then(sourcegraphUrl => {
                    getPhabricatorCSS()
                        .then(css => {
                            const style = document.createElement('style') as HTMLStyleElement
                            style.setAttribute('type', 'text/css')
                            style.id = 'sourcegraph-styles'
                            style.textContent = css
                            document.getElementsByTagName('head')[0].appendChild(style)
                            window.localStorage.SOURCEGRAPH_URL = sourcegraphUrl
                            window.SOURCEGRAPH_URL = sourcegraphUrl
                            setSourcegraphUrl(sourcegraphUrl)
                            expanderListen()
                            metaClickOverride()
                            injectModules()
                        })
                        .catch(e => {
                            console.error(e)
                        })
                })
                .catch(e => console.error(e))
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

const url = window.SOURCEGRAPH_URL || window.localStorage.SOURCEGRAPH_URL
if (url) {
    setSourcegraphUrl(url)
}
setEventLogger(new InPageEventLogger())
init()
