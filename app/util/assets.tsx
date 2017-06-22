/**
 * Converts a relative path within an extension install directory to a fully-qualified URL.
 * @param img Image name
 */
export function getAssetURL(img: string): string {
	return chrome.extension.getURL(`img/${img}`);
}
