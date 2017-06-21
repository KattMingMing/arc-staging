import * as shelljs from "shelljs";

export function replaceWebpack(): void {
	const replaceTasks = [{
		from: "webpack/replace/JsonpMainTemplate.runtime.js",
		to: "node_modules/webpack/lib/JsonpMainTemplate.runtime.js",
	}, {
		from: "webpack/replace/log-apply-result.js",
		to: "node_modules/webpack/hot/log-apply-result.js",
	}];

	replaceTasks.forEach((task) => shelljs.cp(task.from, task.to));
}

export function copyAssets(env: string): void {
	const dir = "dist";
	shelljs.rm("-rf", dir);
	shelljs.mkdir(dir);
	shelljs.cp(`chrome/manifest.${env}.json`, `${dir}/manifest.json`);
	shelljs.cp("-R", "chrome/assets/", dir);
	shelljs.exec(`jade -O "{ env: '${env}' }" -o ${dir} chrome/views/`);
}
