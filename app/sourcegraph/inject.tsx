import { ExtensionEventLogger } from '../../app/tracking/ExtensionEventLogger'
import { eventLogger } from '../../app/util/context'

export function injectSourcegraphApp(marker: HTMLElement): void {
    window.addEventListener('load', () => {
        document.body.appendChild(marker)
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
}
