interface Window {
    SOURCEGRAPH_URL: string | undefined
    PHABRICATOR_REPOS: {
        callsign: string
        path: string
    }[] | undefined
    SOURCEGRAPH_PHABRICATOR_EXTENSION: boolean | undefined
    SG_ENV: 'EXTENSION' | 'PAGE'
    EXTENSION_ENV: 'CONTENT' | 'BACKGROUND' | null

    safariMessager?: {
        send: (message: { type: string; payload: any }, cb?: (res?: any) => void) => void
    }
}

declare module '*.json' {
    const value: any
    export default value
}
