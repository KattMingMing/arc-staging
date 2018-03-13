import CloseIcon from '@sourcegraph/icons/lib/Close'
import { without } from 'lodash'
import * as React from 'react'
import { ListGroup, ListGroupItem } from 'reactstrap'
import storage from '../../../extension/storage'

interface State {
    enterpriseUrls: string[]
}

interface Props {
    enterpriseUrls: string[]
}

export class EnterpriseURLList extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            enterpriseUrls: [],
        }
    }

    public componentDidMount(): void {
        storage.onChanged(({ enterpriseUrls }) => {
            if (enterpriseUrls && enterpriseUrls.newValue) {
                this.setState({ enterpriseUrls: enterpriseUrls.newValue })
            }
        })
    }

    public componentWillReceiveProps(nextProps: Props): void {
        if (this.props.enterpriseUrls !== nextProps.enterpriseUrls) {
            this.setState(() => ({ enterpriseUrls: nextProps.enterpriseUrls }))
        }
    }

    private handleRemove = (e: React.MouseEvent<HTMLElement>, url: string): void => {
        e.preventDefault()
        e.stopPropagation()
        storage.getSync(items => {
            const urls = items.enterpriseUrls || []
            storage.setSync({ enterpriseUrls: without(urls, url) }, () => {
                this.setState(() => ({ enterpriseUrls: without(urls, url) }))
            })
        })
    }

    public render(): JSX.Element | null {
        return (
            <ListGroup className="options__list-group">
                {this.state.enterpriseUrls.map((url, i) => (
                    <ListGroupItem className={`options__group-item justify-content-between`} key={i} disabled={true}>
                        <span className="options__group-item-text">{url}</span>
                        <button className="options__row-close btn btn-icon">
                            <CloseIcon
                                // tslint:disable-next-line
                                onClick={e => this.handleRemove(e, url)}
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
