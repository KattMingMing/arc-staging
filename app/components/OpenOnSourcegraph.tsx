import * as React from 'react'
import { SourcegraphIcon } from '../components/Icons'
import { OpenInSourcegraphProps } from '../repo/index'
import { getPlatformName, openInEditorEnabled, sourcegraphUrl } from '../util/context'

export interface Props {
    openProps: OpenInSourcegraphProps
    style?: React.CSSProperties
    iconStyle?: React.CSSProperties
    className?: string
    ariaLabel?: string
    onClick?: (e: any) => void
    label: string
}

export class OpenOnSourcegraph extends React.Component<Props, {}> {
    public render(): JSX.Element {
        return (
            <a
                href={this.getOpenInSourcegraphUrl(this.props.openProps)}
                aria-label={this.props.ariaLabel}
                className={this.props.className}
                style={this.props.style}
                onClick={this.props.onClick}
            >
                <SourcegraphIcon style={this.props.iconStyle || { marginTop: '-1px', paddingRight: '4px', fontSize: '18px' }} />
                {this.props.label}
            </a>
        )
    }

    private getOpenInSourcegraphUrl(props: OpenInSourcegraphProps): string {
        // Build URL to open in editor
        if (openInEditorEnabled) {
            let openUrl = `src-insiders://open?repo=${props.repoPath}&vcs=git`
            if (props.rev) {
                openUrl = `${openUrl}&revision=${props.rev}`
            }
            if (props.filePath) {
                openUrl = `${openUrl}&path=${props.filePath}`
            }
            if (props.coords) {
                openUrl = `${openUrl}:${props.coords.line}:${props.coords.char}`
            }
            return openUrl
        }

        // Build URL for Web
        let url = `${sourcegraphUrl}/${props.repoPath}`
        if (props.rev) {
            url = `${url}@${props.rev}`
        }
        if (props.filePath) {
            url = `${url}/-/blob/${props.filePath}`
        }
        if (props.query) {
            if (props.query.diff) {
                url = `${url}?diff=${props.query.diff.rev}&utm_source=${getPlatformName()}`
            } else if (props.query.search) {
                url = `${url}?q=${props.query.search}&utm_source=${getPlatformName()}`
            }
        }
        if (props.coords) {
            url = `${url}#L${props.coords.line}:${props.coords.char}`
        }
        if (props.fragment) {
            url = `${url}$${props.fragment}`
        }
        return url
    }
}
