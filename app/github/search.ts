import queryString from 'query-string'

import storage from '../../extension/storage'
import * as github from '../github/util'
import { getPlatformName, sourcegraphUrl } from '../util/context'

function getSourcegraphURLProps(
    query: string
): { url: string; repo: string; rev: string | undefined; query: string } | undefined {
    const { repoPath, rev } = github.parseURL()
    if (repoPath) {
        const url = `${sourcegraphUrl}/search`
        if (rev) {
            return {
                url: `${url}?q=${encodeURIComponent(query)}&sq=repo:%5E${encodeURIComponent(
                    repoPath.replace(/\./g, '\\.')
                )}%24@${encodeURIComponent(rev)}&utm_source=${getPlatformName()}`,
                repo: repoPath,
                rev,
                query: `${encodeURIComponent(query)} ${encodeURIComponent(
                    repoPath.replace(/\./g, '\\.')
                )}%24@${encodeURIComponent(rev)}`,
            }
        }
        return {
            url: `${url}?q=${encodeURIComponent(query)}&sq=repo:%5E${encodeURIComponent(
                repoPath.replace(/\./g, '\\.')
            )}%24&utm_source=${getPlatformName()}`,
            repo: repoPath,
            rev,
            query: `repo:^${repoPath.replace(/\./g, '\\.')}$ ${query}`,
        }
    }
}

export function initSearch(): void {
    storage.getSync(({ executeSearchEnabled }) => {
        // GitHub search page pathname is <org>/<repo>/search
        if (!executeSearchEnabled || !/\/search$/.exec(window.location.pathname)) {
            return
        }

        const searchQuery = queryString.parse(window.location.search).q
        const linkProps = getSourcegraphURLProps(searchQuery)

        if (linkProps) {
            window.open(linkProps.url, '_blank')
        }
    })
}
