import { EventLogger } from '../tracking/EventLogger'
import { TelligentWrapper } from '../tracking/TelligentWrapper'

/**
 * Event logger for embedded extensions (e.g. for Phabricator).
 * When the extension is embedded/injected into the page, the "Sourcegraph URL" is read from the global window object,
 * and there is no way for it to be changed mid-session. As a result, this class does not provide listeners for updates.
 * Otherwise, behavior is nearly identical to ExtensionEventLogger.
 */
export class InPageEventLogger extends EventLogger {
    private userId: string | null
    private telligentWrapper: TelligentWrapper

    constructor() {
        super()
        this.telligentWrapper = new TelligentWrapper('SourcegraphExtension', 'PhabricatorExtension', false)
    }

    public setUserId(userId: string | null): void {
        this.userId = userId
        if (!this.telligentWrapper) {
            return
        }
        this.telligentWrapper.setUserId(userId)
    }

    protected sendEvent(eventAction: string, eventProps: any): void {
        eventProps.userId = this.userId
        if (!this.telligentWrapper) {
            return
        }
        this.telligentWrapper.track(eventAction, eventProps)
    }
}
