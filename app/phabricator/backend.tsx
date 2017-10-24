import { Observable } from 'rxjs/Observable'
import { mutateGraphQL } from '../backend/graphql'
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
            normalized: string, // e.g. secure.phabricator.com/source/phabricator",
        },
    }
}

export interface ConduitRepo extends PhabEntity {
    fields: {
        name: string
        vcs: string // e.g. 'git'
        callsign: string
        shortName: string
        status: 'active' | 'inactive',
    }
    attachments: {
        uris: {
            uris: ConduitURI[],
        },
    }
}

interface ConduitReposResponse {
    error_code?: string
    error_info?: string
    result: {
        cursor: {
            limit: number,
            after: number | null
            before: number | null,
        }
        data: ConduitRepo[],
    }
}

export async function getRepoListFromConduit(): Promise<ConduitRepo[]> {
    const searchForm = document.querySelector('.phabricator-search-menu form') as any
    if (!searchForm) {
        return []
    }
    const form = new FormData()
    form.set('__csrf__', searchForm.querySelector('input[name=__csrf__]')!.value)
    form.set('__form__', searchForm.querySelector('input[name=__form__]')!.value)
    form.set('params[attachments]', '{ "uris": true }')

    const results: ConduitRepo[] = []
    while (true) {
        try {
            const res: ConduitReposResponse = await fetch(
                'http://phabricator.aws.sgdev.org/api/diffusion.repository.search',
                {

                    method: 'POST',
                    body: form,
                    credentials: 'include',
                    headers: new Headers({ Accept: 'application/json' }),
                }
            ).then(resp => resp.json())

            if (res.error_code) {
                throw new Error(`error ${res.error_code}: ${res.error_info}`)
            }
            if (res.result) {
                results.push(...res.result.data)
            }
            if (!res.result.cursor.after) {
                break
            } else {
                form.set('params[after]', '' + res.result.cursor.after)
            }
        } catch (e) {
            console.error(e)
            throw e
        }
    }

    return results
}

export interface ConduitRef {
    ref: string
    type: 'base' | 'diff'
    commit: string // a SHA
    remote: {
        uri: string,
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
            refs: ConduitRef[],
        },
    }
}

interface ConduitDiffDetailsResponse {
    error_code?: string
    error_info?: string
    result: {
        [id: string]: ConduitDiffDetails,
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

export async function getDiffDetailsFromConduit(diffID: number, differentialID: number): Promise<ConduitDiffDetails> {
    const form = createConduitRequestForm()
    form.set('params[ids]', `[${diffID}]`)
    form.set('params[revisionIDs]', `[${differentialID}]`)

    const res: ConduitDiffDetailsResponse = await fetch(
        'http://phabricator.aws.sgdev.org/api/differential.querydiffs',
        {

            method: 'POST',
            body: form,
            credentials: 'include',
            headers: new Headers({ Accept: 'application/json' }),
        }
    ).then(resp => resp.json())

    if (res.error_code) {
        throw new Error(`error ${res.error_code}: ${res.error_info}`)
    }
    return res.result['' + diffID]
}

interface ConduitDifferentialQueryResponse {
    error_code?: string
    error_info?: string
    result: {
        [index: string]: { // arrays
            repositoryPHID: string,
        },
    }
}

export async function getRepoPHIDForDifferentialID(differentialID: number): Promise<string> {
    const form = createConduitRequestForm()
    form.set('params[ids]', `[${differentialID}]`)

    const res: ConduitDifferentialQueryResponse = await fetch(
        'http://phabricator.aws.sgdev.org/api/differential.query',
        {

            method: 'POST',
            body: form,
            credentials: 'include',
            headers: new Headers({ Accept: 'application/json' }),
        }
    ).then(resp => resp.json())

    if (res.error_code) {
        throw new Error(`error ${res.error_code}: ${res.error_info}`)
    }
    return res.result['0'].repositoryPHID
}

export interface PhabricatorRepoDetails {
    callsign: string
    repoPath: string
}

export async function getRepoDetailsFromCallsign(callsign: string): Promise<PhabricatorRepoDetails> {
    // TODO(john): REMOVE THIS IS FOR TESTING ONLY!!
    if (callsign.toLowerCase() === 'zap') {
        callsign = 'nzap'
    }
    const form = createConduitRequestForm()
    form.set('params[constraints]', JSON.stringify({ callsigns: [callsign] }))
    form.set('params[attachments]', '{ "uris": true }')

    const res: ConduitReposResponse = await fetch(
        'http://phabricator.aws.sgdev.org/api/diffusion.repository.search',
        {

            method: 'POST',
            body: form,
            credentials: 'include',
            headers: new Headers({ Accept: 'application/json' }),
        }
    ).then(resp => resp.json())

    if (res.error_code) {
        throw new Error(`error ${res.error_code}: ${res.error_info}`)
    }
    const repo = res.result.data[0]
    if (!repo) {
        throw new Error(`could not locate repo with callsign ${callsign}`)
    }
    if (!repo.attachments || !repo.attachments.uris || repo.attachments.uris.uris.length !== 1) {
        throw new Error(`could not locate git uri for repo with callsign ${callsign}`)
    }

    const details = convertConduitRepoToRepoDetails(repo)
    return createPhabricatorRepo({ callsign, repoPath: details.repoPath })
        .map(() => details)
        .toPromise()
}

export async function getRepoDetailsFromRepoPHID(phid: string): Promise<PhabricatorRepoDetails> {
    const form = createConduitRequestForm()
    form.set('params[constraints]', JSON.stringify({ phids: [phid] }))
    form.set('params[attachments]', '{ "uris": true }')

    const res: ConduitReposResponse = await fetch(
        'http://phabricator.aws.sgdev.org/api/diffusion.repository.search',
        {

            method: 'POST',
            body: form,
            credentials: 'include',
            headers: new Headers({ Accept: 'application/json' }),
        }
    ).then(resp => resp.json())

    if (res.error_code) {
        throw new Error(`error ${res.error_code}: ${res.error_info}`)
    }
    const repo = res.result.data[0]
    if (!repo) {
        throw new Error(`could not locate repo with phid ${phid}`)
    }
    if (!repo.attachments || !repo.attachments.uris || repo.attachments.uris.uris.length !== 1) {
        throw new Error(`could not locate git uri for repo with phid ${phid}`)
    }

    const details = convertConduitRepoToRepoDetails(repo)
    return createPhabricatorRepo({ callsign: repo.fields.callsign, repoPath: details.repoPath })
        .map(() => details)
        .toPromise()
}

export async function getRepoDetailsFromDifferentialID(differentialID: number): Promise<PhabricatorRepoDetails> {
    const phid = await getRepoPHIDForDifferentialID(differentialID)
    return getRepoDetailsFromRepoPHID(phid)
}

function convertConduitRepoToRepoDetails(repo: ConduitRepo): PhabricatorRepoDetails {
    const uri = repo.attachments.uris.uris[0]
    const rawURI = uri.fields.uri.raw
    const repoPath = normalizeRepoPath(rawURI)
    return { callsign: repo.fields.callsign, repoPath }
}

interface CreatePhabricatorRepoOptions {
    callsign: string
    repoPath: string
}

export function createPhabricatorRepo(options: CreatePhabricatorRepoOptions): Observable<void> {
    return mutateGraphQL(`
        mutation addPhabricatorRepo(
            $callsign: String!,
            $repoPath: String!
        ) {
            addPhabricatorRepo(callsign: $callsign, uri: $repoPath) { }
        }
    `, options)
        .map(({ data, errors }) => {
            if (!data || (errors && errors.length > 0)) {
                throw Object.assign(new Error((errors || []).map(e => e.message).join('\n')), { errors })
            }
        })
}
