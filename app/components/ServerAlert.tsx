import Icon from '@sourcegraph/icons/lib/CircleChevronRight'
import CloseIcon from '@sourcegraph/icons/lib/Close'
import * as React from 'react'
import * as storage from '../../extension/storage'
import { eventLogger } from '../util/context'

interface Props {
    onClose: () => void
    alertKey: string
}

/**
 * A global alert telling the user that they need to configure Sourcegraph Server
 * to get code intelligence and search on private code.
 */
export class NeedsServerConfigurationAlert extends React.Component<Props, {}> {
    public componentDidMount(): void {
        eventLogger.logServerInstallBannerViewed()
    }

    private sync(): void {
        storage.setSync({ [this.props.alertKey]: true }, () => {
            this.props.onClose()
        })
    }

    private onClicked = () => {
        eventLogger.logServerInstallBannerClicked()
        this.sync()
    }

    private onClose = () => {
        eventLogger.logServerInstallBannerDismissed()
        this.sync()
    }

    public render(): JSX.Element | null {
        return (
            <div className="alert alert-warning site-alert" style={{ justifyContent: 'space-between' }}>
                <a
                    onClick={this.onClicked}
                    className="site-alert__link"
                    href="https://about.sourcegraph.com/docs/server"
                    target="_blank"
                >
                    <Icon className="icon-inline site-alert__link-icon" />{' '}
                    <span className="underline">Configure Sourcegraph Server</span>
                </a>
                &nbsp;for code intelligence on private repositories.
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
