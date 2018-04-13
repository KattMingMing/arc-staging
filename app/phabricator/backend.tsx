import 'rxjs/add/operator/map'
import { Observable } from 'rxjs/Observable'
import { isExtension } from '../../app/context'
import storage from '../../extension/storage'
import { getContext } from '../backend/context'
import { mutateGraphQL } from '../backend/graphql'
import { memoizeObservable } from '../util/memoize'
import { normalizeRepoPath } from './util'

interface PhabEntity {
    id: string // e.g. "48"
    type: string // e.g. "RHURI"
    phid: string // e.g. "PHID-RHURI-..."
}

export interface ConduitURI extends PhabEntity {
    fields: {
        uri: {
            raw: string // e.g. https://secure.phabricator.com/source/phabricator.git",
            display: string // e.g. https://secure.phabricator.com/source/phabricator.git",
            effective: string // e.g. https://secure.phabricator.com/source/phabricator.git",
            normalized: string // e.g. secure.phabricator.com/source/phabricator",
        }
    }
}

export interface ConduitRepo extends PhabEntity {
    fields: {
        name: string
        vcs: string // e.g. 'git'
        callsign: string
        shortName: string
        status: 'active' | 'inactive'
    }
    attachments: {
        uris: {
            uris: ConduitURI[]
        }
    }
}

interface ConduitReposResponse {
    error_code?: string
    error_info?: string
    result: {
        cursor: {
            limit: number
            after: number | null
            before: number | null
        }
        data: ConduitRepo[]
    }
}

export interface ConduitRef {
    ref: string
    type: 'base' | 'diff'
    commit: string // a SHA
    remote: {
        uri: string
    }
}

export interface ConduitDiffChange {
    oldPath: string
    currentPath: string
}

export interface ConduitDiffDetails {
    branch: string
    sourceControlBaseRevision: string // the merge base commit
    description: string // e.g. 'rNZAP9bee3bc2cd3068dd97dfa87068c4431c5d6093ef'
    changes: ConduitDiffChange[]
    properties: {
        'arc.staging': {
            status: string
            refs: ConduitRef[]
        }
    }
}

interface ConduitDiffDetailsResponse {
    error_code?: string
    error_info?: string
    result: {
        [id: string]: ConduitDiffDetails
    }
}

function createConduitRequestForm(): FormData {
    const searchForm = document.querySelector('.phabricator-search-menu form') as any
    if (!searchForm) {
        throw new Error('cannot create conduit request form')
    }
    const form = new FormData()
    form.set('__csrf__', searchForm.querySelector('input[name=__csrf__]')!.value)
    form.set('__form__', searchForm.querySelector('input[name=__form__]')!.value)
    return form
}

export function getDiffDetailsFromConduit(diffID: number, differentialID: number): Promise<ConduitDiffDetails> {
    return new Promise((resolve, reject) => {
        const form = createConduitRequestForm()
        form.set('params[ids]', `[${diffID}]`)
        form.set('params[revisionIDs]', `[${differentialID}]`)

        fetch(window.location.origin + '/api/differential.querydiffs', {
            method: 'POST',
            body: form,
            credentials: 'include',
            headers: new Headers({ Accept: 'application/json' }),
        })
            .then(resp => resp.json())
            .then((res: ConduitDiffDetailsResponse) => {
                if (res.error_code) {
                    reject(new Error(`error ${res.error_code}: ${res.error_info}`))
                }
                resolve(res.result['' + diffID])
            })
            .catch(reject)
    })
}

interface ConduitCommit {
    fields: {
        identifier: string
    }
}

interface ConduitDiffusionCommitQueryResponse {
    error_code?: string
    error_info?: string
    result: {
        data: ConduitCommit[]
    }
}

export function searchForCommitID(props: any): Promise<string> {
    return new Promise((resolve, reject) => {
        const form = createConduitRequestForm()
        form.set('params[constraints]', `{"ids":[${props.diffID}]}`)

        fetch(window.location.origin + '/api/diffusion.commit.search', {
            method: 'POST',
            body: form,
            credentials: 'include',
            headers: new Headers({ Accept: 'application/json' }),
        })
            .then(resp => resp.json())
            .then((resp: ConduitDiffusionCommitQueryResponse) => {
                if (resp.error_code) {
                    reject(new Error(`error ${resp.error_code}: ${resp.error_info}`))
                }

                resolve(resp.result.data[0].fields.identifier)
            })
            .catch(reject)
    })
}

interface ConduitDifferentialQueryResponse {
    error_code?: string
    error_info?: string
    result: {
        [index: string]: {
            // arrays
            repositoryPHID: string
        }
    }
}

export function getRepoPHIDForDifferentialID(differentialID: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const form = createConduitRequestForm()
        form.set('params[ids]', `[${differentialID}]`)

        fetch(window.location.origin + '/api/differential.query', {
            method: 'POST',
            body: form,
            credentials: 'include',
            headers: new Headers({ Accept: 'application/json' }),
        })
            .then(resp => resp.json())
            .then((res: ConduitDifferentialQueryResponse) => {
                if (res.error_code) {
                    reject(new Error(`error ${res.error_code}: ${res.error_info}`))
                }
                resolve(res.result['0'].repositoryPHID)
            })
            .catch(reject)
    })
}

interface CreatePhabricatorRepoOptions {
    callsign: string
    repoPath: string
    phabricatorURL: string
}

export const createPhabricatorRepo = memoizeObservable(
    (options: CreatePhabricatorRepoOptions): Observable<void> =>
        mutateGraphQL(
            getContext({ repoKey: options.repoPath, blacklist: ['https://sourcegraph.com'] }),
            `mutation addPhabricatorRepo(
            $callsign: String!,
            $repoPath: String!
            $phabricatorURL: String!
        ) {
            addPhabricatorRepo(callsign: $callsign, uri: $repoPath, url: $phabricatorURL) { alwaysNil }
        }`,
            options
        ).map(({ data, errors }) => {
            if (!data || (errors && errors.length > 0)) {
                throw Object.assign(new Error((errors || []).map(e => e.message).join('\n')), { errors })
            }
        }),
    ({ callsign }) => callsign
)

export interface PhabricatorRepoDetails {
    callsign: string
    repoPath: string
}

export function getRepoDetailsFromCallsign(callsign: string): Promise<PhabricatorRepoDetails> {
    return new Promise((resolve, reject) => {
        const form = createConduitRequestForm()
        form.set('params[constraints]', JSON.stringify({ callsigns: [callsign] }))
        form.set('params[attachments]', '{ "uris": true }')
        fetch(window.location.origin + '/api/diffusion.repository.search', {
            method: 'POST',
            body: form,
            credentials: 'include',
            headers: new Headers({ Accept: 'application/json' }),
        })
            .then(resp => resp.json())
            .then((res: ConduitReposResponse) => {
                if (res.error_code) {
                    reject(new Error(`error ${res.error_code}: ${res.error_info}`))
                }
                const repo = res.result.data[0]
                if (!repo) {
                    reject(new Error(`could not locate repo with callsign ${callsign}`))
                }
                if (!repo.attachments || !repo.attachments.uris) {
                    reject(new Error(`could not locate git uri for repo with callsign ${callsign}`))
                }

                return convertConduitRepoToRepoDetails(repo).then(details => {
                    if (details) {
                        return createPhabricatorRepo({
                            callsign,
                            repoPath: details.repoPath,
                            phabricatorURL: window.location.origin,
                        }).subscribe(() => resolve(details))
                    } else {
                        reject(new Error('could not parse repo details'))
                    }
                })
            })
            .catch(reject)
    })
}

export function getRepoDetailsFromRepoPHID(phid: string): Promise<PhabricatorRepoDetails> {
    return new Promise((resolve, reject) => {
        const form = createConduitRequestForm()
        form.set('params[constraints]', JSON.stringify({ phids: [phid] }))
        form.set('params[attachments]', '{ "uris": true }')

        fetch(window.location.origin + '/api/diffusion.repository.search', {
            method: 'POST',
            body: form,
            credentials: 'include',
            headers: new Headers({ Accept: 'application/json' }),
        })
            .then(resp => resp.json())
            .then((res: ConduitReposResponse) => {
                if (res.error_code) {
                    throw new Error(`error ${res.error_code}: ${res.error_info}`)
                }
                const repo = res.result.data[0]
                if (!repo) {
                    throw new Error(`could not locate repo with phid ${phid}`)
                }
                if (!repo.attachments || !repo.attachments.uris) {
                    throw new Error(`could not locate git uri for repo with phid ${phid}`)
                }

                return convertConduitRepoToRepoDetails(repo).then(details => {
                    if (details) {
                        return createPhabricatorRepo({
                            callsign: repo.fields.callsign,
                            repoPath: details.repoPath,
                            phabricatorURL: window.location.origin,
                        })
                            .map(() => details)
                            .subscribe(() => {
                                resolve(details)
                            })
                    } else {
                        reject(new Error('could not parse repo details'))
                    }
                })
            })
            .catch(reject)
    })
}

export function getRepoDetailsFromDifferentialID(differentialID: number): Promise<PhabricatorRepoDetails> {
    return getRepoPHIDForDifferentialID(differentialID).then(getRepoDetailsFromRepoPHID)
}

function convertConduitRepoToRepoDetails(repo: ConduitRepo): Promise<PhabricatorRepoDetails | null> {
    return new Promise((resolve, reject) => {
        if (isExtension) {
            return storage.getSync(items => {
                if (items.phabricatorMappings) {
                    for (const mapping of items.phabricatorMappings) {
                        if (mapping.callsign === repo.fields.callsign) {
                            return resolve({
                                callsign: repo.fields.callsign,
                                repoPath: mapping.path,
                            })
                        }
                    }
                }
                return resolve(convertToDetails(repo))
            })
        } else {
            return resolve(convertToDetails(repo))
        }
    })
}

function convertToDetails(repo: ConduitRepo): PhabricatorRepoDetails | null {
    let uri: ConduitURI | undefined
    for (const u of repo.attachments.uris.uris) {
        const normalPath = u.fields.uri.normalized.replace('\\', '')
        if (normalPath.startsWith(window.location.host + '/')) {
            continue
        }
        uri = u
        break
    }
    if (!uri) {
        return null
    }
    const rawURI = uri.fields.uri.raw
    const repoPath = normalizeRepoPath(rawURI)
    return { callsign: repo.fields.callsign, repoPath }
}
