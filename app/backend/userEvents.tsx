import { Observable } from 'rxjs/Observable'
import { map } from 'rxjs/operators/map'
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

type IUserEventEnum = 'PAGEVIEW' | 'SEARCHQUERY'
const userCookieID = getTelligentDuid()
export const logUserEvent = (event: IUserEventEnum): Observable<void> =>
    mutateGraphQL(
        `mutation logUserEvent($event: UserEvent!, $userCookieID: String!) {
                logUserEvent(event: $event, userCookieID: $userCookieID) {
                    alwaysNil
                }
            }`,
        { event, userCookieID }
    ).pipe(
        map(({ data, errors }) => {
            if (!data || (errors && errors.length > 0)) {
                throw Object.assign(new Error((errors || []).map(e => e.message).join('\n')), { errors })
            }
            return
        })
    )
