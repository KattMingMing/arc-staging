import { logUserEvent } from '../backend/userEvents'
import { getPlatformName, isE2ETest } from '../util/context'

export abstract class EventLogger {
    public logHover(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Hover', 'SymbolHovered', eventProperties)
        // TODO: log a code intelligence event instead of page view.
        // Requries adding a row in the users table in the main repo.
        logUserEvent('PAGEVIEW').subscribe()
    }

    public logClick(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'TooltipDocked', eventProperties)
    }

    public logJumpToDef(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'GoToDefClicked', eventProperties)
    }

    public logFindRefs(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'FindRefsClicked', eventProperties)
    }

    public logSearch(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'SearchClicked', eventProperties)
    }

    public logOpenFile(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'FileOpened', eventProperties)
    }

    public logAuthClicked(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'AuthRedirected', eventProperties)
    }

    public logSourcegraphSearch(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'SourcegraphSearchClicked', eventProperties)
    }

    public logSourcegraphSearchTabClicked(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'SourcegraphSearchTabClicked', eventProperties)
    }

    public logOpenOnSourcegraphButtonClicked(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'OpenOnSourcegraphClicked', eventProperties)
    }

    public logViewRepositoryClicked(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'ViewRepositoryClicked', eventProperties)
    }

    public logViewPullRequestClicked(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'ViewPullRequestClicked', eventProperties)
    }

    public logOpenPullRequestClicked(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'OpenPullRequestClicked', eventProperties)
    }

    public logSourcegraphRepoSearchToggled(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'SourcegraphRepoSearchToggleClicked', eventProperties)
    }

    public logSourcegraphRepoSearchSubmitted(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'SourcegraphRepoSearchSubmitted', eventProperties)
    }

    public logFileTreeToggleClicked(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'FileTreeToggled', eventProperties)
    }

    public logFileTreeItemClicked(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'FileTreeItemSelected', eventProperties)
    }

    public logExtensionConnected(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Success', 'BrowserExtensionConnectedToServer', eventProperties)
    }

    public logServerInstallBannerViewed(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'View', 'ServerInstallBannerViewed', eventProperties)
    }

    public logServerInstallBannerClicked(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'ServerInstallBannerClicked', eventProperties)
    }

    public logServerInstallBannerDismissed(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'ServerInstallBannerDismissClicked', eventProperties)
    }

    public logServerEnableRepositoryBannerViewed(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'View', 'ServerEnableRepositoryBannerViewed', eventProperties)
    }

    public logServerEnableRepositoryBannerClicked(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Click', 'ServerEnableRepositoryBannerClicked', eventProperties)
    }

    public logServerEnableRepositoryBannerDismissClicked(eventProperties: any = {}): void {
        this.logEventForCategory(
            'BrowserExtension',
            'Click',
            'ServerEnableRepositoryBannerDismissClicked',
            eventProperties
        )
    }

    protected abstract sendEvent(eventAction: string, eventProps: any): void

    private defaultProperties(): any {
        return {
            path_name: window.location.pathname,
            Platform: getPlatformName(),
        }
    }

    private logEventForCategory(
        eventCategory: string,
        eventAction: string,
        eventLabel: string,
        eventProperties: any = {}
    ): void {
        if (isE2ETest()) {
            return
        }

        const decoratedEventProps = {
            ...eventProperties,
            ...this.defaultProperties(),

            eventLabel,
            eventCategory,
            eventAction,
        }

        this.sendEvent(eventAction, decoratedEventProps)
    }
}
