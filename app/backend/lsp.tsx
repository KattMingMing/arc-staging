import { Observable, of } from 'rxjs'
import { ajax } from 'rxjs/ajax'
import { map } from 'rxjs/operators'
import { Definition, Hover } from 'vscode-languageserver-types'
import { DidOpenTextDocumentParams, ServerCapabilities } from 'vscode-languageserver/lib/main'
import { AbsoluteRepo, AbsoluteRepoFilePosition, AbsoluteRepoLanguageFile, makeRepoURI, parseRepoURI } from '../repo'
import { getModeFromPath, repoUrlCache, sourcegraphUrl, supportedModes } from '../util/context'
import { memoizeObservable } from '../util/memoize'
import { toAbsoluteBlobURL } from '../util/url'
import { getHeaders } from './headers'

interface LSPRequest {
    method: string
    params: any
}

/** LSP proxy error code for unsupported modes */
export const EMODENOTFOUND = -32000

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
    const mode = getModeFromPath(pos.filePath)
    if (!mode || !supportedModes.has(mode)) {
        return of({ contents: [] })
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

    const url = repoUrlCache[pos.repoPath] || sourcegraphUrl
    if (!url) {
        throw new Error('Error fetching hover: No URL found.')
    }

    return ajax({
        method: 'POST',
        url: `${url}/.api/xlang/textDocument/hover`,
        headers: getHeaders(),
        crossDomain: true,
        withCredentials: true,
        body: JSON.stringify(body),
        async: true,
    }).pipe(
        map(({ response }) => {
            if (!response || !response[1] || !response[1].result) {
                return []
            }
            return response[1].result
        })
    )
}, makeRepoURI)

export const fetchDefinition = memoizeObservable((pos: AbsoluteRepoFilePosition): Observable<Definition> => {
    const mode = getModeFromPath(pos.filePath)
    if (!mode || !supportedModes.has(mode)) {
        return of([])
    }

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

    const url = repoUrlCache[pos.repoPath] || sourcegraphUrl
    if (!url) {
        throw new Error('Error fetching definition: No URL found.')
    }

    return ajax({
        method: 'POST',
        url: `${url}/.api/xlang/textDocument/definition`,
        headers: getHeaders(),
        crossDomain: true,
        withCredentials: true,
        body: JSON.stringify(body),
        async: true,
    }).pipe(
        map(({ response }) => {
            if (!response || !response[1] || !response[1].result) {
                return []
            }
            return response[1].result
        })
    )
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

export const fetchServerCapabilities = memoizeObservable(
    (pos: AbsoluteRepoLanguageFile): Observable<ServerCapabilities | undefined> => {
        const body = wrapLSP(
            {
                method: 'textDocument/didOpen',
                params: {
                    textDocument: {
                        uri: `git://${pos.repoPath}?${pos.commitID}#${pos.filePath}`,
                    },
                } as DidOpenTextDocumentParams,
            },
            pos,
            pos.filePath
        )
        const url = repoUrlCache[pos.repoPath] || sourcegraphUrl
        if (!url) {
            throw new Error('Error fetching server capabilities. No URL found.')
        }
        return ajax({
            method: 'POST',
            url: `${url}/.api/xlang/textDocument/didOpen`,
            headers: getHeaders(),
            crossDomain: true,
            withCredentials: true,
            body: JSON.stringify(body),
            async: true,
        }).pipe(
            map(({ response }) => {
                if (!response || !response[0] || !response[0].result) {
                    return
                }
                return response[0].result.capabilities
            })
        )
    }
)
