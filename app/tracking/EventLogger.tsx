import uuid from 'uuid'
import storage from '../../extension/storage'
import { logUserEvent } from '../backend/userEvents'
import { isInPage } from '../context'
import { eventTrackingEnabled } from '../util/context'

const uidKey = 'sourcegraphAnonymousUid'

/**
 * Deprecated, only used to migrate user IDs from old extension cookies.
 */
const inspectTelligentCookie = (): string[] | null => {
    const cookieName = '_te_'
    const matcher = new RegExp(cookieName + 'id\\.[a-f0-9]+=([^;]+);?')
    const match = window.document.cookie.match(matcher)
    if (match && match[1]) {
        return match[1].split('.')
    } else {
        return null
    }
}

/**
 * Deprecated, only used to migrate user IDs from old extension cookies.
 */
const getTelligentDuid = (): string | null => {
    const cookieProps = inspectTelligentCookie()
    return cookieProps ? cookieProps[0] : null
}

export class EventLogger {
    private uid: string

    constructor() {
        // Fetch user ID on initial load.
        this.getAnonUserID().then(
            () => {
                /* noop */
            },
            () => {
                /* noop */
            }
        )
    }

    /**
     * Generate a new anonymous user ID if one has not yet been set and stored.
     */
    private generateAnonUserID = (): string => {
        const telID = getTelligentDuid()
        if (telID !== null) {
            return telID
        }
        return uuid.v4()
    }

    /**
     * Get the anonymous identifier for this user (used to allow site admins
     * on a Sourcegraph instance to see a count of unique users on a daily,
     * weekly, and monthly basis).
     *
     * Not used at all for public/sourcegraph.com usage.
     */
    private getAnonUserID = (): Promise<string> =>
        new Promise(resolve => {
            if (this.uid) {
                resolve(this.uid)
                return
            }

            if (isInPage) {
                let id = localStorage.getItem(uidKey)
                if (id === null) {
                    id = this.generateAnonUserID()
                    localStorage.setItem(uidKey, id)
                }
                this.uid = id
                resolve(this.uid)
            } else {
                storage.getSyncItem(uidKey, ({ sourcegraphAnonymousUid }) => {
                    if (sourcegraphAnonymousUid === '') {
                        sourcegraphAnonymousUid = this.generateAnonUserID()
                        storage.setSync({ sourcegraphAnonymousUid })
                    }
                    this.uid = sourcegraphAnonymousUid
                    resolve(sourcegraphAnonymousUid)
                })
            }
        })

    private logCodeIntelligenceEvent(): void {
        if (eventTrackingEnabled) {
            this.getAnonUserID().then(
                anonUserId => logUserEvent('CODEINTELINTEGRATION', anonUserId),
                () => {
                    /* noop */
                }
            )
        }
    }

    public logHover(): void {
        this.logCodeIntelligenceEvent()
    }

    public logJumpToDef(): void {
        this.logCodeIntelligenceEvent()
    }

    public logFindRefs(): void {
        this.logCodeIntelligenceEvent()
    }
}
