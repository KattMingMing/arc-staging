import 'rxjs/add/operator/map'
import 'rxjs/add/operator/toPromise'
import { Observable } from 'rxjs/Observable'
import { map } from 'rxjs/operators/map'
import { getContext } from '../backend/context'
import { queryGraphQL } from '../backend/graphql'
import { memoizeAsync, memoizeObservable } from '../util/memoize'
import { AbsoluteRepoFile, makeRepoURI, parseBrowserRepoURL } from './index'

export const ECLONEINPROGESS = 'ECLONEINPROGESS'
class CloneInProgressError extends Error {
    public readonly code = ECLONEINPROGESS
    constructor(repoPath: string) {
        super(`${repoPath} is clone in progress`)
    }
}

export const EREPONOTFOUND = 'EREPONOTFOUND'
class RepoNotFoundError extends Error {
    public readonly code = EREPONOTFOUND
    constructor(repoPath: string) {
        super(`repo ${repoPath} not found`)
    }
}

export const EREVNOTFOUND = 'EREVNOTFOUND'
class RevNotFoundError extends Error {
    public readonly code = EREVNOTFOUND
    constructor(rev?: string) {
        super(`rev ${rev} not found`)
    }
}

/**
 * @return Observable that emits the commit ID
 *         Errors with a `CloneInProgressError` if the repo is still being cloned.
 */
export const resolveRev = memoizeObservable(
    (ctx: { repoPath: string; rev?: string }): Observable<string> =>
        queryGraphQL(
            getContext({ repoKey: ctx.repoPath }),
            `query ResolveRev($repoPath: String!, $rev: String!) {
                repository(uri: $repoPath) {
                    cloneInProgress
                    commit(rev: $rev) {
                        oid
                    }
                }
            }`,
            { ...ctx, rev: ctx.rev || '' }
        ).map(result => {
            if (!result.data) {
                throw new Error('invalid response received from graphql endpoint')
            }
            if (!result.data.repository || !result.data.repository.commit) {
                throw new RepoNotFoundError(ctx.repoPath)
            }
            if (result.data.repository.cloneInProgress) {
                throw new CloneInProgressError(ctx.repoPath)
            }
            if (!result.data.repository.commit) {
                throw new RevNotFoundError(ctx.rev)
            }
            return result.data.repository.commit.oid
        }),
    makeRepoURI
)

export const fetchTree = memoizeObservable(
    (args: { repoPath: string; commitID: string }): Observable<string[]> =>
        queryGraphQL(
            getContext({ repoKey: args.repoPath }),
            `
                query FileTree($repoPath: String!, $commitID: String!) {
                    repository(uri: $repoPath) {
                        commit(rev: $commitID) {
                            tree(recursive: true) {
                                files {
                                    name
                                }
                            }
                        }
                    }
                }
            `,
            args
        ).pipe(
            map(({ data, errors }) => {
                if (
                    !data ||
                    !data.repository ||
                    !data.repository.commit ||
                    !data.repository.commit.tree ||
                    !data.repository.commit.tree.files
                ) {
                    throw Object.assign(new Error((errors || []).map(e => e.message).join('\n')), { errors })
                }
                return data.repository.commit.tree.files.map(file => file.name)
            })
        ),
    makeRepoURI
)

export const listAllSearchResults = memoizeAsync(
    (ctx: { query: string }): Promise<number> =>
        queryGraphQL(
            getContext({ repoKey: '' }),
            `query Search($query: String!) {
                search(query: $query) {
                    results {
                        resultCount
                    }
                }
            }`,
            ctx
        )
            .toPromise()
            .then(result => {
                if (!result.data || !result.data.search || !result.data.search.results) {
                    throw new Error('invalid response received from graphql endpoint')
                }
                return result.data.search.results.resultCount
            }),
    () => {
        const { repoPath } = parseBrowserRepoURL(window.location.href, window)
        return `${repoPath}:${window.location.search}`
    }
)

const trimRepoPath = ({ repoPath, ...rest }) => ({ ...rest, repoPath: repoPath.replace(/.git$/, '') })

export const fetchBlobContentLines = memoizeAsync(
    (ctx: AbsoluteRepoFile): Promise<string[]> =>
        queryGraphQL(
            getContext({ repoKey: ctx.repoPath }),
            `query BlobContent($repoPath: String!, $commitID: String!, $filePath: String!) {
                repository(uri: $repoPath) {
                    commit(rev: $commitID) {
                        file(path: $filePath) {
                            content
                        }
                    }
                }
            }`,
            trimRepoPath(ctx)
        )
            .toPromise()
            .then(result => {
                if (
                    !result.data ||
                    !result.data.repository ||
                    !result.data.repository.commit ||
                    !result.data.repository.commit.file ||
                    !result.data.repository.commit.file.content
                ) {
                    return []
                }
                return result.data.repository.commit.file!.content.split('\n')
            }),
    makeRepoURI
)
