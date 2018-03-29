import 'rxjs/add/observable/of'
import 'rxjs/add/operator/map'
import { Observable } from 'rxjs/Observable'
import { map } from 'rxjs/operators/map'
import { Definition, Hover } from 'vscode-languageserver-types'
import { AbsoluteRepo, AbsoluteRepoFilePosition, makeRepoURI, parseRepoURI } from '../repo'
import { getModeFromExtension, getPathExtension, supportedExtensions } from '../util/context'
import { memoizeObservable } from '../util/memoize'
import { toAbsoluteBlobURL } from '../util/url'
import { repoCache } from './cache'
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
                // TODO(sqs): rootPath is deprecated but xlang client proxy currently
                // requires it. Pass rootUri as well (below) for forward compat.
                rootPath: `git://${ctx.repoPath}?${ctx.commitID}`,

                rootUri: `git://${ctx.repoPath}?${ctx.commitID}`,
                mode: `${getModeFromExtension(getPathExtension(path))}`,
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
    const ext = getPathExtension(pos.filePath)
    if (!supportedExtensions.has(ext)) {
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

    const url = repoCache.getUrl(pos.repoPath)

    return Observable.ajax({
        method: 'POST',
        url: `${url}/.api/xlang/textDocument/hover`,
        headers: getHeaders(),
        crossDomain: true,
        withCredentials: true,
        body: JSON.stringify(body),
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

    const url = repoCache.getUrl(pos.repoPath)

    return Observable.ajax({
        method: 'POST',
        url: `${url}/.api/xlang/textDocument/definition`,
        headers: getHeaders(),
        crossDomain: true,
        withCredentials: true,
        body: JSON.stringify(body),
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
