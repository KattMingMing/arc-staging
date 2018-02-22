import * as React from 'react'
import { render } from 'react-dom'
import { AdminWarning } from './components/AdminWarning'
import { injectPhabricatorBlobAnnotators } from './inject'
import { expanderListen, javelinPierce, metaClickOverride, setupPageLoadListener } from './util'

// This is injection for the chrome extension.
export function injectPhabricatorApplication(): void {
    // make sure this is called before javelinPierce
    document.addEventListener('phabPageLoaded', () => {
        javelinPierce(expanderListen, 'body')
        javelinPierce(metaClickOverride, 'body')

        injectModules()
        setTimeout(injectModules, 1000) // extra data may be loaded asynchronously; reapply after timeout
        setTimeout(injectModules, 5000) // extra data may be loaded asynchronously; reapply after timeout
    })
    javelinPierce(setupPageLoadListener, 'body')

    displayWarning()
}

function injectModules(): void {
    injectPhabricatorBlobAnnotators().catch(e => console.error(e))
}

function displayWarning(): void {
    const crumbsNode = document.querySelector('.phui-crumbs-view')
    if (crumbsNode) {
        const warningNode = document.createElement('div')

        crumbsNode.insertAdjacentElement('afterend', warningNode)

        render(<AdminWarning />, warningNode)
    }
}
