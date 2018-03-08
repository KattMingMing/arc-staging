import CloseIcon from '@sourcegraph/icons/lib/Close'
import { without } from 'lodash'
import * as React from 'react'
import { Badge, ListGroup, ListGroupItem } from 'reactstrap'
import storage from '../../../extension/storage'
import { sourcegraphUrl } from '../../util/context'

interface State {
    serverUrls: string[]
    sourcegraphUrl: string
}

export class ServerURLSelection extends React.Component<{}, State> {
    public state = {
        serverUrls: [],
        sourcegraphUrl,
    }

    public componentDidMount(): void {
        this.syncServerUrls()
    }

    private syncServerUrls(): void {
        storage.getSync(items => {
            this.setState(() => ({ serverUrls: items.serverUrls || [], sourcegraphUrl: items.sourcegraphURL }))
        })
    }

    private handleClick = (url: string) => {
        storage.setSync({ sourcegraphURL: url }, () => {
            this.setState(
                () => ({ sourcegraphUrl: url }),
                () => {
                    this.syncServerUrls()
                }
            )
        })
    }

    private handleRemove = (e: React.MouseEvent<HTMLElement>, url: string): void => {
        e.preventDefault()
        e.stopPropagation()
        storage.getSync(items => {
            const urls = items.serverUrls || []
            storage.setSync({ serverUrls: without(urls, url) }, () => {
                this.setState(
                    () => ({ serverUrls: without(urls, url) }),
                    () => {
                        this.syncServerUrls()
                    }
                )
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
                        // tslint:disable-next-line
                        onClick={() => this.handleClick(url)}
                    >
                        <span className="options__group-item-text">{url}</span>
                        {url === this.state.sourcegraphUrl && (
                            <Badge className="options__item-badge" pill={true}>
                                Primary
                            </Badge>
                        )}
                        <button className="options__row-close btn btn-icon">
                            <CloseIcon
                                // tslint:disable-next-line
                                onClick={(e) => this.handleRemove(e, url)}
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
