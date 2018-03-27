interface Window {
    SOURCEGRAPH_URL: string | undefined
    SOURCEGRAPH_PHABRICATOR_EXTENSION: boolean | undefined
    OIDC_TOKEN: string | undefined
    SG_ENV: 'EXTENSION' | 'PAGE'
    EXTENSION_ENV: 'CONTENT' | 'BACKGROUND' | null

    safariMessager?: {
        send: (message: { type: string; payload: any }, cb?: (res?: any) => void) => void
    }
}
