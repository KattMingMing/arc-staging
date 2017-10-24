import { Definition, Hover } from 'vscode-languageserver-types'
import { AbsoluteRepo, AbsoluteRepoFilePosition, makeRepoURI, parseRepoURI } from '../repo'
import { getExtensionVersion, getModeFromExtension, getPathExtension, getPlatformName, sourcegraphUrl, supportedExtensions } from '../util/context'
import { memoizeAsync } from '../util/memoize'
import { toAbsoluteBlobURL } from '../util/url'

interface LSPRequest {
    method: string
    params: any
}

export function isEmptyHover(hover: Hover): boolean {
    return !hover.contents || (Array.isArray(hover.contents) && hover.contents.length === 0)
}

const headers = new Headers({ 'x-sourcegraph-client': `${getPlatformName()} v${getExtensionVersion()}` })

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

export const fetchHover = memoizeAsync((pos: AbsoluteRepoFilePosition): Promise<Hover> => {
    const ext = getPathExtension(pos.filePath)
    if (!supportedExtensions.has(ext)) {
        return Promise.resolve({ contents: [] })
    }

    const body = wrapLSP({
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
    }, pos, pos.filePath)

    return fetch(
        `${sourcegraphUrl}/.api/xlang/textDocument/hover`,
        { method: 'POST', body: JSON.stringify(body), credentials: 'same-origin', headers }
    )
        .then(resp => resp.json())
        .then(json => {
            if (!json || !json[1] || !json[1].result) {
                return []
            }
            return json[1].result
        })
}, makeRepoURI)

export const fetchDefinition = memoizeAsync((pos: AbsoluteRepoFilePosition): Promise<Definition> => {
    const ext = getPathExtension(pos.filePath)
    if (!supportedExtensions.has(ext)) {
        return Promise.resolve([])
    }

    const body = wrapLSP({
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
    }, pos, pos.filePath)

    return fetch(
        `${sourcegraphUrl}/.api/xlang/textDocument/definition`,
        { method: 'POST', body: JSON.stringify(body), credentials: 'same-origin', headers }
    )
        .then(resp => resp.json())
        .then(json => {
            if (!json || !json[1] || !json[1].result) {
                return []
            }
            return json[1].result
        })
}, makeRepoURI)

export function fetchJumpURL(pos: AbsoluteRepoFilePosition): Promise<string | null> {
    return fetchDefinition(pos)
        .then(def => {
            const defArray = Array.isArray(def) ? def : [def]
            def = defArray[0]
            if (!def) {
                return null
            }

            const uri = parseRepoURI(def.uri) as AbsoluteRepoFilePosition
            uri.position = { line: def.range.start.line + 1, character: def.range.start.character + 1 }
            return toAbsoluteBlobURL(uri)
        })
}
