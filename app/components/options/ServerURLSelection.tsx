import CloseIcon from '@sourcegraph/icons/lib/Close'
import { without } from 'lodash'
import * as React from 'react'
import { Badge, ListGroup, ListGroupItem } from 'reactstrap'
import storage from '../../../extension/storage'

interface State {
    serverUrls: string[]
    sourcegraphUrl: string
}

interface Props {
    serverUrls: string[]
}

export class ServerURLSelection extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            serverUrls: this.props.serverUrls,
            sourcegraphUrl: '',
        }
    }

    public componentDidMount(): void {
        storage.onChanged(({ sourcegraphURL, serverUrls }) => {
            const newState = {
                serverUrls: this.state.serverUrls,
                sourcegraphUrl: this.state.sourcegraphUrl,
            }

            if (sourcegraphURL) {
                newState.sourcegraphUrl = sourcegraphURL.newValue!
            }

            if (serverUrls) {
                newState.serverUrls = serverUrls.newValue!
            }

            this.setState(newState)
        })
    }

    public componentWillReceiveProps(nextProps: Props): void {
        if (this.props.serverUrls !== nextProps.serverUrls) {
            this.setState(() => ({ serverUrls: nextProps.serverUrls }))
        }
    }

    private handleClick = (url: string) => () => {
        storage.setSync({ sourcegraphURL: url }, () => {
            this.setState(() => ({ sourcegraphUrl: url }))
        })
    }

    private handleRemove = (url: string) => (e: React.MouseEvent<HTMLElement>): void => {
        e.preventDefault()
        e.stopPropagation()
        storage.getSync(items => {
            const urls = items.serverUrls || []
            storage.setSync({ serverUrls: without(urls, url) }, () => {
                this.setState(() => ({ serverUrls: without(urls, url) }))
            })
        })
    }

    public render(): JSX.Element | null {
        return (
            <ListGroup className="options__list-group">
                {this.state.serverUrls.map((url, i) => (
                    <ListGroupItem
                        className={`options__group-item ${url === this.state.sourcegraphUrl
                            ? 'options__group-item-disabled'
                            : ''} justify-content-between`}
                        key={i}
                        disabled={url === this.state.sourcegraphUrl}
                        action={true}
                        onClick={this.handleClick(url)}
                    >
                        <span className="options__group-item-text">{url}</span>
                        {url === this.state.sourcegraphUrl && (
                            <Badge className="options__item-badge" pill={true}>
                                Primary
                            </Badge>
                        )}
                        <button className="options__row-close btn btn-icon">
                            <CloseIcon
                                onClick={this.handleRemove(url)}
                                style={{ verticalAlign: 'middle' }}
                                className="icon-inline"
                            />
                        </button>
                    </ListGroupItem>
                ))}
            </ListGroup>
        )
    }
}
