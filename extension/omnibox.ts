import chrome from './browser'

export const setDefaultSuggestion = (suggestion: browser.omnibox.Suggestion) => {
    if (chrome && chrome.omnibox) {
        chrome.omnibox.setDefaultSuggestion(suggestion)
    }
}

export const onInputChanged = (
    handler: (text: string, suggest: (suggestResults: browser.omnibox.SuggestResult[]) => void) => void
) => {
    if (chrome && chrome.omnibox) {
        chrome.omnibox.onInputChanged.addListener(handler)
    }
}

export const onInputEntered = (handler: (url: string, disposition: string) => void) => {
    if (chrome && chrome.omnibox) {
        chrome.omnibox.onInputEntered.addListener(handler)
    }
}
