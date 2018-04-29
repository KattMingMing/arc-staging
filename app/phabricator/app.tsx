import { injectPhabricatorBlobAnnotators } from './inject'
import { expanderListen, javelinPierce, metaClickOverride, setupPageLoadListener } from './util'

// This is injection for the chrome extension.
export function injectPhabricatorApplication(): void {
    // make sure this is called before javelinPierce
    document.addEventListener('phabPageLoaded', () => {
        javelinPierce(expanderListen, 'body')
        javelinPierce(metaClickOverride, 'body')

        injectModules()
    })
    javelinPierce(setupPageLoadListener, 'body')
}

function injectModules(): void {
    injectPhabricatorBlobAnnotators().catch(e => console.error(e))
}
