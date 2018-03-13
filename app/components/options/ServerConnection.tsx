import AddIcon from '@sourcegraph/icons/lib/Add'
import * as React from 'react'
import { Button, FormText, Input, InputGroup, InputGroupAddon } from 'reactstrap'
import storage from '../../../extension/storage'
import { ServerURLSelection } from './ServerURLSelection'

enum errors {
    Empty,
    Invalid,
    HTTPNotSupported,
}

interface State {
    customUrl: string
    error: errors | null
    serverUrls: string[]
}

// Make safari not be abnoxious <angry face>
const safariInputAttributes = {
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
}

export class ServerConnection extends React.Component<{}, State> {
    public state = {
        customUrl: '',
        error: null,
        serverUrls: [],
    }

    public componentDidMount(): void {
        storage.getSync(items => {
            this.setState(() => ({ serverUrls: items.serverUrls || [] }))
        })

        storage.onChanged(({ serverUrls }) => {
            if (serverUrls && serverUrls.newValue) {
                this.setState({ serverUrls: serverUrls.newValue })
            }
        })
    }

    private addSourcegraphServerURL = (): void => {
        try {
            const url = new URL(this.state.customUrl)
            if (!url || !url.origin || url.origin === 'null') {
                this.handleInvalidUrl(errors.Empty)
                return
            }

            if (window.safari && url.protocol === 'http:') {
                this.handleInvalidUrl(errors.HTTPNotSupported)
                return
            }

            storage.getSync(items => {
                let serverUrls = items.serverUrls || []
                serverUrls = [...serverUrls, url.origin]

                storage.setSync(
                    {
                        sourcegraphURL: url.origin,
                        serverUrls: [...new Set(serverUrls)],
                    },
                    () => {
                        this.setState(() => ({ customUrl: '', serverUrls, error: null }))
                    }
                )
            })
        } catch {
            this.handleInvalidUrl(errors.Invalid)
        }
    }

    private handleInvalidUrl = (error: errors): void => {
        this.setState(
            () => ({ error }),
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
                                invalid={!!this.state.error}
                                onKeyPress={this.handleKeyPress}
                                value={this.state.customUrl}
                                onChange={this.inputChanged}
                                className="options__input-field"
                                {...safariInputAttributes as any}
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
                        {this.state.error === errors.Invalid && (
                            <FormText color="muted">Please enter a valid URL.</FormText>
                        )}
                        {this.state.error === errors.Empty && <FormText color="muted">Please enter a URL.</FormText>}
                        {this.state.error === errors.HTTPNotSupported && (
                            <FormText color="muted">
                                Extensions cannot communicate over HTTPS in your browser. We suggest using a tool like{' '}
                                <a href="https://ngrok.com/">ngrok</a> for trying the extension out with your local
                                instance.
                            </FormText>
                        )}
                    </div>
                </div>
                <ServerURLSelection serverUrls={this.state.serverUrls} />
            </div>
        )
    }
}
