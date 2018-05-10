interface Window {
    SOURCEGRAPH_URL: string | undefined
    PHABRICATOR_CALLSIGN_MAPPINGS: {
        callsign: string
        path: string
    }[] | undefined
    SOURCEGRAPH_PHABRICATOR_EXTENSION: boolean | undefined
    SG_ENV: 'EXTENSION' | 'PAGE'
    EXTENSION_ENV: 'CONTENT' | 'BACKGROUND' | null
    SOURCEGRAPH_BUNDLE_URL: string | undefined // Bundle Sourcegraph URL is set from the Phabricator extension.

    safariMessager?: {
        send: (message: { type: string; payload: any }, cb?: (res?: any) => void) => void
    }
}

declare module '*.json' {
    const value: any
    export default value
}
