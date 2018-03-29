import { parseURL } from '../github/util'

export interface RequestContext {
    repoKey: string
}

export function getContext(): RequestContext {
    if (window.SG_ENV === 'PAGE' || window.SOURCEGRAPH_PHABRICATOR_EXTENSION) {
        return { repoKey: '' }
    }

    const { repoPath } = parseURL()

    return { repoKey: repoPath }
}
