import AddIcon from '@sourcegraph/icons/lib/Add'
import * as querystring from 'query-string'
import * as React from 'react'
import { Button, ButtonGroup, FormText, Input, InputGroup, InputGroupAddon } from 'reactstrap'
import * as extension from '../../../extension/extension'
import { isFirefox } from '../../../extension/info'
import * as permissions from '../../../extension/permissions'
import * as runtime from '../../../extension/runtime'
import storage from '../../../extension/storage'
import * as tabs from '../../../extension/tabs'
import { EnterpriseURLList } from './EnterpriseURLList'

interface State {
    customCodeHost: string
    invalid: boolean
    enterpriseUrls: string[]
    shouldDisplayAddInput: boolean
    showFirefoxExplainer: boolean
}

export class SupportedCodeHosts extends React.Component<{}, State> {
    public state: State

    constructor(props: any) {
        super(props)

        const search = window.location.search
        const params = querystring.parse(search)

        this.state = {
            customCodeHost: '',
            invalid: false,
            enterpriseUrls: [],
            shouldDisplayAddInput: !isFirefox || !!params.fullPage,
            showFirefoxExplainer: false,
        }
    }

    public componentDidMount(): void {
        storage.getSync(items => {
            this.setState(() => ({ enterpriseUrls: items.enterpriseUrls || [] }))
        })

        storage.onChanged(items => {
            const { enterpriseUrls } = items
            if (enterpriseUrls && enterpriseUrls.newValue) {
                this.setState(() => ({ enterpriseUrls: enterpriseUrls.newValue || [] }))
            }
        })
    }

    private inputChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.persist()
        this.setState(() => ({ customCodeHost: e.target.value }))
    }

    private addEnterpriseUrl = () => {
        try {
            const url = new URL(this.state.customCodeHost)
            if (!url || !url.origin || url.origin === 'null') {
                this.handleInvalidUrl()
                return
            }

            permissions
                .request(this.state.customCodeHost)
                .then(granted => {
                    if (!granted) {
                        console.log('access not granted', granted)
                        return
                    }
                    runtime.sendMessage({ type: 'setEnterpriseUrl', payload: this.state.customCodeHost }, () => {
                        this.setState(() => ({ customCodeHost: '' }))
                    })
                })
                .catch(e => {
                    // TODO: handle error
                    console.log(e)
                })
        } catch {
            this.handleInvalidUrl()
        }
    }

    private handleKeyPress = (e: React.KeyboardEvent<HTMLElement>): void => {
        if (e.charCode === 13) {
            this.addEnterpriseUrl()
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

    private openOptionsPage = (e: React.MouseEvent<HTMLElement>): void => {
        e.preventDefault()
        e.stopPropagation()

        const url = extension.getURL('/options.html?fullPage=true')

        tabs.create({
            url,
            active: true,
        })
    }

    private toggleExplainer = (e: React.MouseEvent<HTMLElement>): void => {
        e.preventDefault()
        e.stopPropagation()

        this.setState(({ showFirefoxExplainer }) => ({ showFirefoxExplainer: !showFirefoxExplainer }))
    }

    public render(): JSX.Element | null {
        return (
            <div>
                <div className="options__section-header">Supported code hosts</div>
                <div className="options__section-contents">
                    <ButtonGroup>
                        <Button disabled={true}>GitHub</Button> <Button disabled={true}>Phabricator</Button>{' '}
                    </ButtonGroup>
                    <div className="options__section-subheader">Enterprise URLs</div>
                    {this.state.shouldDisplayAddInput ? (
                        <div className="options__input-container">
                            <InputGroup>
                                <Input
                                    invalid={this.state.invalid}
                                    value={this.state.customCodeHost}
                                    onKeyPress={this.handleKeyPress}
                                    onChange={this.inputChanged}
                                    className="options__input-field"
                                    type="url"
                                />
                                <InputGroupAddon className="input-group-append" addonType="append">
                                    <Button
                                        className="options__button-icon-add"
                                        onClick={this.addEnterpriseUrl}
                                        size="sm"
                                    >
                                        <AddIcon className="icon-inline options__button-icon" />
                                        Add
                                    </Button>
                                </InputGroupAddon>
                            </InputGroup>
                            {this.state.invalid && <FormText color="muted">Please enter a URL.</FormText>}
                        </div>
                    ) : (
                        <div>
                            <p>
                                To add an Enterprise URL, visit the{' '}
                                <a href="#" onClick={this.openOptionsPage}>
                                    full options page
                                </a>.{' '}
                            </p>
                            {this.state.showFirefoxExplainer ? (
                                <p>
                                    There is an{' '}
                                    <a href="https://bugzilla.mozilla.org/show_bug.cgi?format=default&id=1382953">
                                        outstanding bug
                                    </a>{' '}
                                    with{' '}
                                    <a href="https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/optional_permissions">
                                        optional permissions
                                    </a>{' '}
                                    on Firefox that breaks requesting additional permissions from a popup or the
                                    preferences menu. The only workaround right now is opening a new tab for the options
                                    menu.{' '}
                                    <a href="#" onClick={this.toggleExplainer}>
                                        Sounds Good
                                    </a>.
                                </p>
                            ) : (
                                <a href="#" onClick={this.toggleExplainer}>
                                    Why?
                                </a>
                            )}
                        </div>
                    )}
                    <EnterpriseURLList enterpriseUrls={this.state.enterpriseUrls} />
                </div>
            </div>
        )
    }
}
