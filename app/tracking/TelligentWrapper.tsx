import { isConnectedToSourcegraphDotCom, sourcegraphUrl } from '../util/context'

const telligent = require('@sourcegraph/telligent-tracker')
const telligentFunctionName = 'telligent'

export class TelligentWrapper {
    private t: any

    // url should only be specified if not using a standard Sourcegraph Server /.api/telemetry endpoint
    // (e.g. for a /bi-logger endpoint). Otherwise, the current sourcegraphUrl global is used to generate
    // the correct URL for the Server instance currently being used.
    constructor(
        siteId: string,
        platform: string,
        forceSecure: boolean,
        installedChromeExtension: boolean,
        url?: string
    ) {
        // Create the initializing function
        // tslint:disable-next-line
        window[telligentFunctionName] = function(): void {
            window[telligentFunctionName].q = window[telligentFunctionName].q || []
            window[telligentFunctionName].q.push(arguments)
        }

        // Set up the initial queue, if it doesn't already exist
        window[telligentFunctionName].q = new telligent.Telligent(
            window[telligentFunctionName].q || [],
            telligentFunctionName
        )

        this.t = (window as any).telligent

        let telemetryUrl = `${sourcegraphUrl}/.api/telemetry`
        if (url) {
            telemetryUrl = url
        }
        // Must be called once upon initialization
        this.t('newTracker', 'SourcegraphExtensionTracker', prepareEndpointUrl(telemetryUrl), {
            encodeBase64: false,
            appId: siteId,
            platform,
            env: process.env.NODE_ENV,
            forceSecureTracker: forceSecure,
            trackUrls: isConnectedToSourcegraphDotCom(),
        })

        if (installedChromeExtension) {
            this.installedChromeExtension()
        }
    }

    public track(eventAction: string, requestPayload: any): void {
        // for self-hosted Server or Data Center usage, we only want to collect high level event
        // context.
        //
        // Note: user identification information is still captured through persistent
        // `user_info` metadata stored in a cookie.
        if (!isConnectedToSourcegraphDotCom()) {
            // 🚨 PRIVACY: anything added to this filter will be capturable on self-hosted instances.
            const limitedPayload = {
                event_action: requestPayload.eventAction,
                event_category: requestPayload.eventCategory,
                event_label: requestPayload.eventLabel,
                page_title: requestPayload.page_title,
                language: requestPayload.language,
                platform: requestPayload.platform,

                // Browser-extension-specific whitelisted props
                userId: requestPayload.userId,
                isPullRequest: requestPayload.isPullRequest,
                isCommit: requestPayload.isCommit,
                isConnectedToSourcegraphDotCom: requestPayload.isConnectedToSourcegraphDotCom,
            }
            this.t('track', eventAction, limitedPayload)
            return
        }

        this.t('track', eventAction, requestPayload)
    }

    public setUserId(requestPayload: any): void {
        this.t('setUserId', requestPayload)
    }

    public addStaticMetadataObject(requestPayload: any): void {
        this.t('addStaticMetadataObject', requestPayload)
    }

    public installedChromeExtension(): void {
        this.t('addStaticMetadata', 'installed_chrome_extension', 'true', 'userInfo')
    }

    public setUrl(url: string): void {
        this.t('setCollectorUrl', prepareEndpointUrl(`${url}/.api/telemetry`))
        this.t('setTrackUrls', isConnectedToSourcegraphDotCom(url))
    }
}

// Remove leading scheme/protocol from URLs passed to Telligent
function prepareEndpointUrl(url: string): string {
    return url.replace('http://', '').replace('https://', '')
}
