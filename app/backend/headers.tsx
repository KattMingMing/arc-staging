import { getExtensionVersionSync, getPlatformName } from '../util/context'

export function getHeaders(): Headers | undefined {
    if (window.SOURCEGRAPH_PHABRICATOR_EXTENSION) {
        return undefined
    }
    const h = {
        'x-sourcegraph-client': `${getPlatformName()} v${getExtensionVersionSync()}`,
    }
    return new Headers(h)
}
