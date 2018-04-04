import { map } from 'rxjs/operators/map'
import { repoCache } from '../backend/cache'
import { getContext } from '../backend/context'
import { mutateGraphQL } from '../backend/graphql'

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

const getTelligentDuid = (): string | null => {
    const cookieProps = inspectTelligentCookie()
    return cookieProps ? cookieProps[0] : null
}

const userCookieID = getTelligentDuid()
export const logUserEvent = (event: GQL.IUserEventEnum): void => {
    const ctx = getContext({ isRepoSpecific: true })
    const url = repoCache.getUrl(ctx.repoKey)
    if (url === 'https://sourcegraph.com') {
        return
    }
    mutateGraphQL(
        ctx,
        `mutation logUserEvent($event: UserEvent!, $userCookieID: String!) {
                logUserEvent(event: $event, userCookieID: $userCookieID) {
                    alwaysNil
                }
            }`,
        { event, userCookieID }
    )
        .pipe(
            map(({ data, errors }) => {
                if (!data || (errors && errors.length > 0)) {
                    throw Object.assign(new Error((errors || []).map(e => e.message).join('\n')), { errors })
                }
                return
            })
        )
        .subscribe(undefined, error => {
            // Swallow errors. If a Server instance isn't upgraded, this request may fail
            // (e.g., if CODEINTELINTEGRATION user events aren't yet supported).
            // However, end users shouldn't experience this failure, as their admin is
            // responsible for updating the Server, and has been (or will be) notified
            // that an upgrade is available via site-admin messaging.
        })
}
