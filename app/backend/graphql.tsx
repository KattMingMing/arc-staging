import 'rxjs/add/observable/dom/ajax'
import 'rxjs/add/operator/catch'
import 'rxjs/add/operator/map'
import { Observable } from 'rxjs/Observable'

import storage from '../../extension/storage'
import { serverUrls, setSourcegraphUrl, sourcegraphUrl } from '../util/context'
import { getHeaders } from './headers'

/**
 * Interface for the response result of a GraphQL query
 */
export interface QueryResult {
    data?: GQL.IQuery
    errors?: GQL.IGraphQLResponseError[]
}

/**
 * Interface for the response result of a GraphQL mutation
 */
export interface MutationResult {
    data?: GQL.IMutation
    errors?: GQL.IGraphQLResponseError[]
}

/**
 * Does a GraphQL request to the Sourcegraph GraphQL API running under `/.api/graphql`
 *
 * @param request The GraphQL request (query or mutation)
 * @param variables A key/value object with variable values
 * @return Observable That emits the result or errors if the HTTP request failed
 */
function requestGraphQL(
    request: string,
    variables: any = {},
    urlsToTry = serverUrls
): Observable<GQL.IGraphQLResponseRoot> {
    const nameMatch = request.match(/^\s*(?:query|mutation)\s+(\w+)/)
    if (urlsToTry.length === 0) {
        throw new Error('no sourcegraph urls are configured')
    }
    const url = urlsToTry[0]
    return Observable.ajax({
        method: 'POST',
        url: `${url}/.api/graphql` + (nameMatch ? '?' + nameMatch[1] : ''),
        headers: getHeaders(),
        crossDomain: true,
        withCredentials: true,
        body: JSON.stringify({ query: request, variables }),
    })
        .map(({ response }) => {
            // If the query should return a repository and the response is null, throw an error
            // to trigger a refetch for the next possible Server URL.
            if (
                !response ||
                !response.data ||
                response.data.repository === null ||
                (response.errors && response.errors.length)
            ) {
                throw response
            }
            if (sourcegraphUrl !== url) {
                setSourcegraphUrl(url)
                storage.setSync({ sourcegraphURL: url })
            }
            return response
        })
        .catch(err => {
            if (urlsToTry.length === 1) {
                // We just tried the last url
                throw err
            }
            return requestGraphQL(request, variables, urlsToTry.slice(1))
        })
}

/**
 * Does a GraphQL query to the Sourcegraph GraphQL API running under `/.api/graphql`
 *
 * @param query The GraphQL query
 * @param variables A key/value object with variable values
 * @return Observable That emits the result or errors if the HTTP request failed
 */
export function queryGraphQL(query: string, variables: any = {}): Observable<QueryResult> {
    return requestGraphQL(query, variables) as Observable<QueryResult>
}

/**
 * Does a GraphQL mutation to the Sourcegraph GraphQL API running under `/.api/graphql`
 *
 * @param mutation The GraphQL mutation
 * @param variables A key/value object with variable values
 * @return Observable That emits the result or errors if the HTTP request failed
 */
export function mutateGraphQL(mutation: string, variables: any = {}): Observable<MutationResult> {
    return requestGraphQL(mutation, variables) as Observable<MutationResult>
}
