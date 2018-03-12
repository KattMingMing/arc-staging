import AddIcon from '@sourcegraph/icons/lib/Add'
import * as React from 'react'
import { Button, FormText, Input, InputGroup, InputGroupAddon } from 'reactstrap'
import storage from '../../../extension/storage'
import { ServerURLSelection } from './ServerURLSelection'

interface State {
    customUrl: string
    invalid: boolean
    serverUrls: string[]
}

export class ServerConnection extends React.Component<{}, State> {
    public state = {
        customUrl: '',
        invalid: false,
        serverUrls: [],
    }

    public componentDidMount(): void {
        storage.getSync(items => {
            this.setState(() => ({ serverUrls: items.serverUrls || [] }))
        })
    }

    private addSourcegraphServerURL = (): void => {
        try {
            const url = new URL(this.state.customUrl)
            if (!url || !url.origin || url.origin === 'null') {
                this.handleInvalidUrl()
                return
            }

            storage.getSync(items => {
                const serverUrls = items.serverUrls ? [...new Set([...items.serverUrls, url.origin])] : []
                storage.setSync(
                    {
                        sourcegraphURL: url.origin,
                        serverUrls: [...new Set([...serverUrls, url.origin])],
                    },
                    () => {
                        this.setState(() => ({ customUrl: '', serverUrls }))
                    }
                )
            })
        } catch {
            this.handleInvalidUrl()
        }
    }

    private handleInvalidUrl = (): void => {
        this.setState(
            () => ({ invalid: true }),
            () => {
                setTimeout(() => this.setState(() => ({ invalid: false })), 2000)
            }
        )
    }

    private inputChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.persist()
        this.setState(() => ({ customUrl: e.target.value }))
    }

    private handleKeyPress = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.charCode === 13) {
            this.addSourcegraphServerURL()
        }
    }

    public render(): JSX.Element | null {
        return (
            <div className="options__section">
                <div className="options__section-header">Sourcegraph Server URLs</div>
                <div className="options__section-contents">
                    <div className="options__input-container">
                        <InputGroup>
                            <Input
                                invalid={this.state.invalid}
                                onKeyPress={this.handleKeyPress}
                                value={this.state.customUrl}
                                onChange={this.inputChanged}
                                className="options__input-field"
                            />
                            <InputGroupAddon className="input-group-append" addonType="append">
                                <Button
                                    className="options__button-icon-add"
                                    onClick={this.addSourcegraphServerURL}
                                    size="sm"
                                >
                                    <AddIcon className="icon-inline options__button-icon" />
                                    Add
                                </Button>
                            </InputGroupAddon>
                        </InputGroup>
                        {this.state.invalid && <FormText color="muted">Please enter a URL.</FormText>}
                    </div>
                </div>
                <ServerURLSelection serverUrls={this.state.serverUrls} />
            </div>
        )
    }
}
