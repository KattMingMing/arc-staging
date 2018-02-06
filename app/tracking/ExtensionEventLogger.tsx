import { EventLogger } from '../tracking/EventLogger'
import { TelligentWrapper } from '../tracking/TelligentWrapper'
import { isConnectedToSourcegraphDotCom, isE2ETest } from '../util/context'

export class ExtensionEventLogger extends EventLogger {
    private telligentWrapper: TelligentWrapper
    private trackingEnabled = true

    constructor() {
        super()

        if (isE2ETest()) {
            return
        }
        this.telligentWrapper = new TelligentWrapper('SourcegraphExtension', 'BrowserExtension', true, true)

        chrome.runtime.sendMessage({ type: 'getIdentity' }, this.updatePropsForUser.bind(this))

        chrome.storage.sync.get(items => {
            this.trackingEnabled = items.eventTrackingEnabled
            if (items.sourcegraphURL) {
                this.telligentWrapper.setUrl(items.sourcegraphURL)
            }
        })

        chrome.storage.onChanged.addListener(changes => {
            for (const key of Object.keys(changes)) {
                if (key === 'sourcegraphURL') {
                    this.telligentWrapper.setUrl(changes[key].newValue)
                    this.logExtensionConnected({
                        isConnectedToSourcegraphDotCom: isConnectedToSourcegraphDotCom(changes[key].newValue),
                    })
                }
                if (key === 'eventTrackingEnabled') {
                    this.trackingEnabled = changes[key].newValue
                }
            }
        })
    }

    public updatePropsForUser(identity?: any): void {
        if (isE2ETest() || !this.telligentWrapper) {
            return
        }

        if (identity && identity.userId) {
            this.telligentWrapper.setUserId(identity.userId)
        }
        if (identity && identity.deviceId) {
            this.telligentWrapper.addStaticMetadataObject({ deviceInfo: { TelligentWebDeviceId: identity.deviceId } })
        }
        if (identity && identity.gaClientId) {
            this.telligentWrapper.addStaticMetadataObject({ deviceInfo: { GAClientId: identity.gaClientId } })
        }
    }

    protected sendEvent(eventAction: string, eventProps: any): void {
        if (this.trackingEnabled && this.telligentWrapper) {
            this.telligentWrapper.track(eventAction, eventProps)
        }
    }
}
