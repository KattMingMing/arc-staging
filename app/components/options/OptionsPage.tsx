import * as querystring from 'query-string'
import * as React from 'react'
import { FormGroup, Input, Label } from 'reactstrap'
import { getExtensionVersion } from '../../../app/util/context'
import { getURL } from '../../../extension/extension'
import storage from '../../../extension/storage'
import { ConfigWarning } from './ConfigWarning'
import { ServerConnection } from './ServerConnection'
import { SupportedCodeHosts } from './SupportedCodeHosts'

interface State {
    repositoryFileTreeEnabled: boolean
    repositorySearchEnabled: boolean
    openEditorEnabled: boolean
}

// Make safari not be abnoxious <angry face>
const safariInputAttributes = {
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
}

export class OptionsPage extends React.Component<{}, State> {
    public state = {
        repositoryFileTreeEnabled: false,
        repositorySearchEnabled: false,
        openEditorEnabled: false,
    }

    public componentDidMount(): void {
        storage.getSync(items => {
            this.setState(() => ({
                repositoryFileTreeEnabled:
                    items.repositoryFileTreeEnabled === undefined || items.repositoryFileTreeEnabled,
                repositorySearchEnabled: items.repositorySearchEnabled === undefined || items.repositorySearchEnabled,
                openEditorEnabled: items.openEditorEnabled,
            }))
        })
    }

    private onFileTreeToggled = () => {
        storage.setSync({ repositoryFileTreeEnabled: !this.state.repositoryFileTreeEnabled }, () => {
            this.setState(() => ({ repositoryFileTreeEnabled: !this.state.repositoryFileTreeEnabled }))
        })
    }

    private onRepositorySearchToggled = () => {
        storage.setSync({ repositorySearchEnabled: !this.state.repositorySearchEnabled }, () => {
            this.setState(() => ({ repositorySearchEnabled: !this.state.repositorySearchEnabled }))
        })
    }

    private onEditorToggled = () => {
        storage.setSync({ openEditorEnabled: !this.state.openEditorEnabled }, () => {
            this.setState(() => ({ openEditorEnabled: !this.state.openEditorEnabled }))
        })
    }

    public render(): JSX.Element | null {
        const search = window.location.search
        const searchParams = querystring.parse(search)
        return (
            <div className="options__container">
                <div>
                    {searchParams.popup && (
                        <div className="options__overlay-header">
                            <div className="options__overlay-container">
                                <img
                                    className="options__overlay-icon"
                                    src={getURL('img/sourcegraph-light-head-logo.svg')}
                                />
                            </div>
                            <div className="options__version">v{getExtensionVersion()}</div>
                        </div>
                    )}
                    <div className="options__section">
                        <div className="options__section-header">Search</div>
                        <div className="options__section-contents">
                            <FormGroup check={true}>
                                <Label className="options__input">
                                    <Input
                                        onClick={this.onRepositorySearchToggled}
                                        checked={Boolean(this.state.repositorySearchEnabled)}
                                        className="options__input-checkbox"
                                        type="checkbox"
                                        {...safariInputAttributes as any}
                                    />{' '}
                                    <div className="options__input-label">
                                        Display Sourcegraph search toggle in code host search input.
                                    </div>
                                </Label>
                            </FormGroup>
                        </div>
                    </div>
                    <div className="options__divider" />
                    <div className="options__section">
                        <div className="options__section-header">Navigation</div>
                        <div className="options__section-contents">
                            <FormGroup check={true}>
                                <Label className="options__input">
                                    <Input
                                        onClick={this.onFileTreeToggled}
                                        checked={Boolean(this.state.repositoryFileTreeEnabled)}
                                        className="options__input-checkbox"
                                        type="checkbox"
                                        {...safariInputAttributes as any}
                                    />{' '}
                                    <div className="options__input-label">Display repository file tree navigation.</div>
                                </Label>
                            </FormGroup>
                        </div>
                    </div>
                    <div className="options__divider" />
                    <div className="options__section">
                        <div className="options__section-header">Editor (beta)</div>
                        <div className="options__section-contents">
                            <FormGroup check={true}>
                                <Label className="options__input">
                                    <Input
                                        onClick={this.onEditorToggled}
                                        checked={Boolean(this.state.openEditorEnabled)}
                                        className="options__input-checkbox"
                                        type="checkbox"
                                        {...safariInputAttributes as any}
                                    />{' '}
                                    <div className="options__input-label">
                                        Enable Links that open{' '}
                                        <a
                                            href="https://about.sourcegraph.com/products/editor"
                                            target="_blank"
                                            // tslint:disable-next-line
                                            onClick={e => e.stopPropagation()}
                                            className="options__alert-link"
                                        >
                                            Sourcegraph Editor.
                                        </a>
                                    </div>
                                </Label>
                            </FormGroup>
                        </div>
                    </div>
                    <div className="options__divider" />
                    <div className="options__section options__section-borderless">
                        <ConfigWarning />
                    </div>
                    <ServerConnection />
                </div>
                <div className="options__divider" />
                <div className="options__section">
                    <SupportedCodeHosts />
                </div>
            </div>
        )
    }
}
