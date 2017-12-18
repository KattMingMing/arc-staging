import 'rxjs/add/operator/map'
import 'rxjs/add/operator/toPromise'
import { Observable } from 'rxjs/Observable'
import { queryGraphQL } from '../backend/graphql'
import { memoizeAsync, memoizeObservable } from '../util/memoize'
import { AbsoluteRepoFile, makeRepoURI } from './index'

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
            `query ResolveRev($repoPath: String, $rev: String) {
                repository(uri: $repoPath) {
                    commit(rev: $rev) {
                        cloneInProgress,
                        commit {
                            sha1
                        }
                    }
                }
            }`,
            { ...ctx, rev: ctx.rev || 'master' }
        ).map(result => {
            if (!result.data) {
                throw new Error('invalid response received from graphql endpoint')
            }
            if (!result.data.repository || !result.data.repository.commit) {
                throw new RepoNotFoundError(ctx.repoPath)
            }
            if (result.data.repository.commit.cloneInProgress) {
                throw new CloneInProgressError(ctx.repoPath)
            }
            if (!result.data.repository.commit.commit) {
                throw new RevNotFoundError(ctx.rev)
            }
            return result.data.repository.commit.commit.sha1
        }),
    makeRepoURI
)

export const listAllFiles = memoizeAsync(
    (ctx: { repoPath: string; commitID: string }): Promise<string[]> =>
        queryGraphQL(
            `query FileTree($repoPath: String!, $commitID: String!) {
                repository(uri: $repoPath) {
                    commit(rev: $commitID) {
                        commit {
                            tree(recursive: true) {
                                files {
                                    name
                                }
                            }
                        }
                    }
                }
            }`,
            ctx
        )
            .toPromise()
            .then(result => {
                if (
                    !result.data ||
                    !result.data.repository ||
                    !result.data.repository.commit ||
                    !result.data.repository.commit.commit ||
                    !result.data.repository.commit.commit.tree ||
                    !result.data.repository.commit.commit.tree.files
                ) {
                    throw new Error('invalid response received from graphql endpoint')
                }
                return result.data.repository.commit.commit.tree.files.map(file => file.name)
            }),
    makeRepoURI
)

export const fetchBlobContentLines = memoizeAsync(
    (ctx: AbsoluteRepoFile): Promise<string[]> =>
        queryGraphQL(
            `query BlobContent($repoPath: String, $commitID: String, $filePath: String) {
                repository(uri: $repoPath) {
                    commit(rev: $commitID) {
                        commit {
                            file(path: $filePath) {
                                content
                            }
                        }
                    }
                }
            }`,
            ctx
        )
            .toPromise()
            .then(result => {
                if (
                    !result.data ||
                    !result.data.repository ||
                    !result.data.repository.commit ||
                    !result.data.repository.commit.commit ||
                    !result.data.repository.commit.commit.file ||
                    !result.data.repository.commit.commit.file.content
                ) {
                    return []
                }
                return result.data.repository.commit.commit.file.content.split('\n')
            }),
    makeRepoURI
)
