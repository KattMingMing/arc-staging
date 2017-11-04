import { getPlatformName, isE2ETest } from '../util/context'

export abstract class EventLogger {
    public logHover(eventProperties: any = {}): void {
        this.logEventForCategory('BrowserExtension', 'Hover', 'SymbolHovered', eventProperties)
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
