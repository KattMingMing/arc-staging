import { ExtensionEventLogger } from '../../app/tracking/ExtensionEventLogger'
import { eventLogger } from '../../app/util/context'

export function injectSourcegraphApp(marker: HTMLElement): void {
    window.addEventListener('load', () => {
        dispatchSourcegraphEvents(marker)
    })

    document.addEventListener('sourcegraph:identify', (ev: CustomEvent) => {
        if (ev && ev.detail) {
            const e = eventLogger as ExtensionEventLogger
            e.updatePropsForUser(ev.detail)
            chrome.runtime.sendMessage({ type: 'setIdentity', identity: ev.detail })
        } else {
            console.error('sourcegraph:identify missing details')
        }
    })

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        dispatchSourcegraphEvents(marker)
    }
}

function dispatchSourcegraphEvents(marker: HTMLElement): void {
    // Generate and insert DOM element, in case this code executes first.
    document.body.appendChild(marker)
    // Send custom webapp <-> extension registration event in case webapp listener is attached first.
    document.dispatchEvent(new CustomEvent('sourcegraph:browser-extension-registration'))
}
