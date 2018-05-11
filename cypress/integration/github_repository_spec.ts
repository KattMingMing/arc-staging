/// <reference types="cypress" />

const RepoHomepagePage = 'https://github.com/gorilla/mux'

describe('GitHub', () => {
    it('.should() - assert that Sourcegraph View Repository is injected', () => {
        cy.visit(RepoHomepagePage)
        cy.get('.pagehead-actions').find('li#open-on-sourcegraph')
    })

    it('.should() - assert that BlobAnnotators are mounted for a file', () => {
        cy.visit(RepoHomepagePage)
        cy.contains('mux.go').click()
        cy.get('.file-actions')
    })

    it('should() - assert file tooltips are provided', () => {
        const elements = cy
            .contains('NewRouter')
            .get('span')
            .filter('.pl-en')
        const first = elements.first()
        first.scrollIntoView()
        first.trigger('mouseover')
        elements.first().click({ force: true })
        cy.contains('Go to definition')
    })

    const VIEW_FILE_BASE_BUTTON = 'View File (base)'
    const VIEW_FILE_HEAD_BUTTON = 'View File (head)'

    it('should() - (Unified PR) assert base tooltips are provided', () => {
        cy.visit('https://github.com/gorilla/mux/pull/366/files?diff=unified')
        cy.contains(VIEW_FILE_BASE_BUTTON)
        cy.contains(VIEW_FILE_HEAD_BUTTON)
        const elements = cy
            .get('span')
            .filter('.pl-en')
            .contains('useInterface')
        const first = elements.first()
        first.scrollIntoView()
        first.trigger('mouseover')
        elements.first().click({ force: true })
        cy.contains('Go to definition')
    })

    it('should() - (Unified PR) assert head tooltips are provided', () => {
        cy.visit('https://github.com/gorilla/mux/pull/366/files?diff=unified')
        cy.contains(VIEW_FILE_BASE_BUTTON)
        cy.contains(VIEW_FILE_HEAD_BUTTON)
        const elements = cy
            .get('span')
            .filter('.pl-en')
            .contains('MethodMiddleware')
        const first = elements.first()
        first.scrollIntoView()
        first.trigger('mouseover')
        elements.first().click({ force: true })
        cy.contains('Go to definition')
    })

    it('should() - (Split PR) assert base tooltips are provided', () => {
        cy.visit('https://github.com/gorilla/mux/pull/366/files?diff=split')
        cy.contains(VIEW_FILE_BASE_BUTTON)
        cy.contains(VIEW_FILE_HEAD_BUTTON)
        const elements = cy
            .get('span')
            .filter('.pl-en')
            .contains('useInterface')
        const first = elements.first()
        first.scrollIntoView()
        first.trigger('mouseover')
        elements.first().click({ force: true })
        cy.contains('Go to definition')
    })

    it('should() - (Split PR) assert head tooltips are provided', () => {
        cy.visit('https://github.com/gorilla/mux/pull/366/files?diff=split')
        cy.contains(VIEW_FILE_BASE_BUTTON)
        cy.contains(VIEW_FILE_HEAD_BUTTON)
        const elements = cy
            .get('span')
            .filter('.pl-en')
            .contains('MethodMiddleware')
        const first = elements.first()
        first.scrollIntoView()
        first.trigger('mouseover')
        elements.first().click({ force: true })
        cy.contains('Go to definition')
    })
})
