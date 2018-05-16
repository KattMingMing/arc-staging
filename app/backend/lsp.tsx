import 'rxjs/add/observable/of'
import 'rxjs/add/operator/map'
import { Observable } from 'rxjs/Observable'
import { map } from 'rxjs/operators/map'
import { Definition, Hover } from 'vscode-languageserver-types'
import { AbsoluteRepo, AbsoluteRepoFilePosition, makeRepoURI, parseRepoURI } from '../repo'
import { getModeFromPath, repoUrlCache } from '../util/context'
import { memoizeObservable } from '../util/memoize'
import { toAbsoluteBlobURL } from '../util/url'
import { getHeaders } from './headers'

interface LSPRequest {
    method: string
    params: any
}

export function isEmptyHover(hover: Hover): boolean {
    return !hover.contents || (Array.isArray(hover.contents) && hover.contents.length === 0)
}

function wrapLSP(req: LSPRequest, ctx: AbsoluteRepo, path: string): any[] {
    return [
        {
            id: 0,
            method: 'initialize',
            params: {
                rootUri: `git://${ctx.repoPath}?${ctx.commitID}`,
                mode: `${getModeFromPath(path)}`,
            },
        },
        {
            id: 1,
            ...req,
        },
        {
            id: 2,
            method: 'shutdown',
        },
        {
            // id not included on 'exit' requests
            method: 'exit',
        },
    ]
}

export const fetchHover = memoizeObservable((pos: AbsoluteRepoFilePosition): Observable<Hover> => {
    if (!getModeFromPath(pos.filePath)) {
        return Observable.of({ contents: [] })
    }

    const body = wrapLSP(
        {
            method: 'textDocument/hover',
            params: {
                textDocument: {
                    uri: `git://${pos.repoPath}?${pos.commitID}#${pos.filePath}`,
                },
                position: {
                    character: pos.position.character! - 1,
                    line: pos.position.line - 1,
                },
            },
        },
        pos,
        pos.filePath
    )

    const url = repoUrlCache[pos.repoPath]
    if (!url) {
        throw new Error('Error fetching hover: No URL found.')
    }

    return Observable.ajax({
        method: 'POST',
        url: `${url}/.api/xlang/textDocument/hover`,
        headers: getHeaders(),
        crossDomain: true,
        withCredentials: true,
        body: JSON.stringify(body),
        async: true,
    }).map(({ response }) => {
        if (!response || !response[1] || !response[1].result) {
            return []
        }
        return response[1].result
    })
}, makeRepoURI)

export const fetchDefinition = memoizeObservable((pos: AbsoluteRepoFilePosition): Observable<Definition> => {
    const body = wrapLSP(
        {
            method: 'textDocument/definition',
            params: {
                textDocument: {
                    uri: `git://${pos.repoPath}?${pos.commitID}#${pos.filePath}`,
                },
                position: {
                    character: pos.position.character! - 1,
                    line: pos.position.line - 1,
                },
            },
        },
        pos,
        pos.filePath
    )

    const url = repoUrlCache[pos.repoPath]
    if (!url) {
        throw new Error('Error fetching definition: No URL found.')
    }

    return Observable.ajax({
        method: 'POST',
        url: `${url}/.api/xlang/textDocument/definition`,
        headers: getHeaders(),
        crossDomain: true,
        withCredentials: true,
        body: JSON.stringify(body),
        async: true,
    }).map(({ response }) => {
        if (!response || !response[1] || !response[1].result) {
            return []
        }
        return response[1].result
    })
}, makeRepoURI)

export function fetchJumpURL(pos: AbsoluteRepoFilePosition): Observable<string | null> {
    return fetchDefinition(pos).pipe(
        map(def => {
            const defArray = Array.isArray(def) ? def : [def]
            def = defArray[0]
            if (!def) {
                return null
            }

            const uri = parseRepoURI(def.uri) as AbsoluteRepoFilePosition
            uri.position = { line: def.range.start.line + 1, character: def.range.start.character + 1 }
            return toAbsoluteBlobURL(uri)
        })
    )
}
