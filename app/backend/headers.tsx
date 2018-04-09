import { getExtensionVersionSync, getPlatformName } from '../util/context'

export function getHeaders(): Headers | undefined {
    if (window.SOURCEGRAPH_PHABRICATOR_EXTENSION) {
        return undefined
    }
    const h = {
        'x-sourcegraph-client': `${getPlatformName()} v${getExtensionVersionSync()}`,
    }
    if (window.OIDC_TOKEN) {
        h['X-Oidc-Override'] = window.OIDC_TOKEN
    }
    return new Headers(h)
}
