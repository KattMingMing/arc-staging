import Icon from '@sourcegraph/icons/lib/CircleChevronRight'
import CloseIcon from '@sourcegraph/icons/lib/Close'
import * as React from 'react'
import storage from '../../extension/storage'
import { sourcegraphUrl } from '../util/context'

interface Props {
    onClose: () => void
    alertKey: string
    repoPath: string
}

/**
 * A global alert telling the site admin that they need to configure repositories
 * on this site.
 */
export class NeedsRepositoryConfigurationAlert extends React.Component<Props, {}> {
    private sync = () => {
        const obj = { [this.props.alertKey]: { [this.props.repoPath]: true } }
        storage.setSync(obj, () => {
            this.props.onClose()
        })
    }

    private onClick = () => {
        this.sync()
    }

    private onClose = () => {
        this.sync()
    }

    public render(): JSX.Element | null {
        return (
            <div className="sg-alert sg-alert-success site-alert">
                <a
                    onClick={this.onClick}
                    className="site-alert__link"
                    href={`${sourcegraphUrl}/site-admin/configuration`}
                    target="_blank"
                >
                    <Icon className="icon-inline site-alert__link-icon" />{' '}
                    <span className="underline">Configure repositories and code hosts</span>
                </a>
                &nbsp;to add to Sourcegraph Server.
                <div
                    style={{
                        display: 'inline-flex',
                        flex: '1 1 auto',
                        textAlign: 'right',
                        flexDirection: 'row-reverse',
                    }}
                >
                    <CloseIcon
                        onClick={this.onClose}
                        style={{
                            fill: 'white',
                            cursor: 'pointer',
                            width: 17,
                            height: 17,
                            color: 'white',
                            paddingTop: 3,
                        }}
                    />
                </div>
            </div>
        )
    }
}
