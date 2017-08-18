import * as github from "app/github/util";
import { getDomain } from "app/util";
import { Domain, SourcegraphURL } from "app/util/types";

export function parseURL(loc: Location = window.location): SourcegraphURL {
	const domain = getDomain(loc);
	if (domain !== Domain.SOURCEGRAPH) {
		return {};
	}

	const urlsplit = loc.pathname.slice(1).split("/");
	if (urlsplit.length < 3 && urlsplit[0] !== "github.com") {
		return {};
	}

	let uri = urlsplit.slice(0, 3).join("/");
	let rev: string | undefined;
	let path: string | undefined;
	const uriSplit = uri.split("@");
	if (uriSplit.length > 0) {
		uri = uriSplit[0];
		rev = uriSplit[1];
	}

	if (loc.pathname.indexOf("/-/blob/") !== -1) {
		path = urlsplit.slice(5).join("/");
	}

	return { uri, rev, path };
}

export function openSourcegraphTab(url: string, withModifierKey: boolean): void {
	chrome.runtime.sendMessage({ type: "openSourcegraphTab", url: url, withModifierKey: withModifierKey });
}

export interface TreeNode {
	text: string;
	children: any[] | undefined;
	state: NodeState | undefined;
	id?: string;
	a_attr?: {
		href: string,
	};
}

interface NodeState {
	selected?: boolean;
	opened?: boolean;
}

interface FileData {
	name: string;
}

/**
 * buildFileTree is responsible for taking the graphql response from listFiles and building it into
 * the tree structure. It takes an optional parameter of a path that should be the selected node.
 * @param data Array of file names in the form of {name: "path/to/file" }
 */
export function buildFileTree(data: FileData[], commit: string): any[] {
	const gitHubState = github.getGitHubState(window.location.href);
	if (!gitHubState) {
		return [];
	}
	const input = data.map(file => {
		return `${file.name}`;
	});

	const output = [];
	let k: number = 0;
	const baseURL = `https://github.com/${gitHubState.owner}/${gitHubState.repo}/blob/${commit}/`;
	for (let i = 0; i < input.length; i++) {
		const chain: any[] = input[i].split("/");
		let currentNode: TreeNode[] | undefined = output;
		for (let j = 0; j < chain.length; j++) {
			const wantedNode: string = chain[j];
			const lastNode = currentNode;
			if (currentNode) {
				for (k = 0; k < currentNode.length; k++) {
					if (currentNode[k].text === wantedNode && currentNode[k].children !== undefined) {
						currentNode = currentNode[k].children;
						break;
					}
				}
			}
			// If we couldn't find an item in this list of children
			// that has the right name, create one:
			if (lastNode === currentNode) {
				if (chain[chain.length - 1] === wantedNode) {
					const newNode = currentNode![k] = { text: wantedNode, children: undefined, id: input[i], state: {}, a_attr: { href: `${baseURL}${input[i]}` } };
					currentNode = newNode.children;
				} else {
					const newNode = currentNode![k] = { text: wantedNode, children: [], state: {} };
					currentNode = newNode.children;
				}
			}
		}
	}
	return output;
}
