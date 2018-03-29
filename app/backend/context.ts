import { parseURL } from '../github/util'

export interface RequestContext {
    repoKey: string
}

export function getContext(): RequestContext {
    const { repoPath } = parseURL()

    return { repoKey: repoPath }
}
