import { without } from 'lodash'
import 'rxjs/add/observable/dom/ajax'
import 'rxjs/add/operator/catch'
import 'rxjs/add/operator/map'
import { Observable } from 'rxjs/Observable'

import sortBy from 'lodash/sortBy'
import { isPhabricator } from '../context'
import { repoUrlCache, serverUrls, sourcegraphUrl } from '../util/context'
import { RequestContext } from './context'
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
    ctx: RequestContext,
    request: string,
    variables: any = {},
    urlsToTry: string[]
): Observable<GQL.IGraphQLResponseRoot> {
    let urls: string[] = ctx.blacklist ? without(urlsToTry, ...ctx.blacklist) : urlsToTry
    const defaultUrl = repoUrlCache[ctx.repoKey] || sourcegraphUrl
    urls = sortBy(urls, url => (url === defaultUrl ? 0 : 1))
    // Check if it's a private repo - if so don't make a request to Sourcegraph.com.
    if (isPrivateRepository()) {
        urls = without(urls, 'https://sourcegraph.com')
    }

    if (urls.length === 0) {
        throw new Error('no sourcegraph urls are configured')
    }
    const url = urls[0]

    const nameMatch = request.match(/^\s*(?:query|mutation)\s+(\w+)/)
    const queryName = nameMatch ? '?' + nameMatch[1] : ''

    return Observable.ajax({
        method: 'POST',
        url: `${url}/.api/graphql` + queryName,
        headers: getHeaders(),
        crossDomain: true,
        withCredentials: true,
        body: JSON.stringify({ query: request, variables }),
        async: true,
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
                delete repoUrlCache[ctx.repoKey]
                throw response
            }
            if (ctx.isRepoSpecific && response.data.repository) {
                repoUrlCache[ctx.repoKey] = url
            }
            return response
        })
        .catch(err => {
            if (urlsToTry.length === 1) {
                delete repoUrlCache[ctx.repoKey]
                // We just tried the last url
                throw err
            }
            return requestGraphQL(ctx, request, variables, urls.slice(1))
        })
}

/**
 * Check the DOM to see if we can determine if a repository is private or public.
 */
function isPrivateRepository(): boolean {
    if (isPhabricator) {
        return true
    }
    const header = document.querySelector('.repohead-details-container')
    if (!header) {
        return false
    }
    return !!header.querySelector('.private')
}

/**
 * Does a GraphQL query to the Sourcegraph GraphQL API running under `/.api/graphql`
 *
 * @param query The GraphQL query
 * @param variables A key/value object with variable values
 * @return Observable That emits the result or errors if the HTTP request failed
 */
export function queryGraphQL(ctx: RequestContext, query: string, variables: any = {}): Observable<QueryResult> {
    return requestGraphQL(ctx, query, variables, serverUrls) as Observable<QueryResult>
}

/**
 * Does a GraphQL mutation to the Sourcegraph GraphQL API running under `/.api/graphql`
 *
 * @param mutation The GraphQL mutation
 * @param variables A key/value object with variable values
 * @return Observable That emits the result or errors if the HTTP request failed
 */
export function mutateGraphQL(ctx: RequestContext, mutation: string, variables: any = {}): Observable<MutationResult> {
    return requestGraphQL(ctx, mutation, variables, serverUrls) as Observable<MutationResult>
}
