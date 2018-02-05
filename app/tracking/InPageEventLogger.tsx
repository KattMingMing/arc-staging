import { EventLogger } from '../tracking/EventLogger'
import { TelligentWrapper } from '../tracking/TelligentWrapper'
import { sourcegraphUrl } from '../util/context'

export class InPageEventLogger extends EventLogger {
    private userId: string | null
    private telligentWrapper: TelligentWrapper

    constructor() {
        super()
        this.telligentWrapper = new TelligentWrapper(
            'SourcegraphExtension',
            'PhabricatorExtension',
            false,
            false,
            `${sourcegraphUrl}/.bi-logger`
        )
    }

    public setUserId(userId: string | null): void {
        this.userId = userId
        this.telligentWrapper.setUserId(userId)
    }

    protected sendEvent(eventAction: string, eventProps: any): void {
        eventProps.userId = this.userId
        this.telligentWrapper.track(eventAction, eventProps)
    }
}
