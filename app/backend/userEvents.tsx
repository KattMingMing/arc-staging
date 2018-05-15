import { getContext } from '../backend/context'
import { mutateGraphQLNoRetry } from '../backend/graphql'
import { repoUrlCache } from '../util/context'

/**
 * Log a user action (used to allow site admins on a Sourcegraph instance
 * to see a count of unique users on a daily, weekly, and monthly basis).
 *
 * Not used at all for public/sourcegraph.com usage.
 */
export const logUserEvent = (event: GQL.IUserEventEnum, uid: string): void => {
    const ctx = getContext({ isRepoSpecific: true })
    const url = repoUrlCache[ctx.repoKey]
    if (!url || url === 'https://sourcegraph.com') {
        return
    }
    mutateGraphQLNoRetry(
        ctx,
        `mutation logUserEvent($event: UserEvent!, $userCookieID: String!) {
            logUserEvent(event: $event, userCookieID: $userCookieID) {
                alwaysNil
            }
        }`,
        { event, userCookieID: uid }
    ).subscribe(undefined, error => {
        // Swallow errors. If a Sourcegraph instance isn't upgraded, this request may fail
        // (e.g., if CODEINTELINTEGRATION user events aren't yet supported).
        // However, end users shouldn't experience this failure, as their admin is
        // responsible for updating the instance, and has been (or will be) notified
        // that an upgrade is available via site-admin messaging.
    })
}
