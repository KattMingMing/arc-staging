import * as runtime from '../../extension/runtime'
import storage from '../../extension/storage'
import { EventLogger } from '../tracking/EventLogger'
import { TelligentWrapper } from '../tracking/TelligentWrapper'
import { isE2ETest, isOnlySourcegraphDotCom } from '../util/context'

/**
 * Event logger for user-installed browser extensions.
 * Provides listeners for config updates in case individual users modify the "Sourcegraph URL"
 * in their extension settings. Otherwise, behavior is nearly identical to InPageEventLogger.
 */
export class ExtensionEventLogger extends EventLogger {
    private telligentWrapper: TelligentWrapper
    private trackingEnabled = true

    constructor() {
        super()

        if (isE2ETest()) {
            return
        }
        this.telligentWrapper = new TelligentWrapper('SourcegraphExtension', 'BrowserExtension', true)

        runtime.sendMessage({ type: 'getIdentity' }, this.updatePropsForUser.bind(this))

        storage.getSync(items => {
            this.trackingEnabled = items.eventTrackingEnabled
            if (items.sourcegraphURL) {
                this.telligentWrapper.setUrl(items.sourcegraphURL)
            }
            if (items.serverUserId) {
                this.telligentWrapper.setUserId(items.serverUserId)
            }
        })

        storage.onChanged(changes => {
            for (const key of Object.keys(changes)) {
                if (key === 'sourcegraphURL' && changes[key]) {
                    this.telligentWrapper.setUrl(changes[key]!.newValue)
                }
                if (key === 'serverUrls' && changes[key]) {
                    this.logExtensionConnected({
                        isConnectedToSourcegraphDotCom: isOnlySourcegraphDotCom(changes[key]!.newValue),
                    })
                }
                if (key === 'eventTrackingEnabled' && changes[key]) {
                    this.trackingEnabled = changes[key]!.newValue
                }
                if (key === 'serverUserId' && changes[key]) {
                    this.telligentWrapper.setUserId(changes[key]!.newValue)
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

    public setCodeHost(codeHost: string): void {
        this.telligentWrapper.setCodeHost(codeHost)
    }

    protected sendEvent(eventAction: string, eventProps: any): void {
        if (this.trackingEnabled && this.telligentWrapper) {
            this.telligentWrapper.track(eventAction, eventProps)
        }
    }
}
