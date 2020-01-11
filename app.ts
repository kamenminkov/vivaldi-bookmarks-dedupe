import { init, readBookmarkFile } from './src';
import * as Config from './config';

import('./paths')
	.then((value: Object & { default: any }) => {
		const paths: string[] = value.default;

		const pathsInputIsValid: boolean = paths instanceof Array && paths.length > 0;

		if (!pathsInputIsValid) {
			throw new Error(
				`No paths found. Falling back to ${Config.DEFAULT_INPUT_FILENAME} in the project root.`
			);
		}

		const promises = paths.map((path: string) => init(path, true));

		promises.reduce(
			(promiseChain: Promise<any>, currentTask: Promise<any>) =>
				promiseChain.then(chainResults =>
					currentTask.then(currentResult => [...chainResults, currentResult])
				),
			Promise.resolve([])
		);
	})
	.catch((e: any) => {
		readBookmarkFile(Config.DEFAULT_INPUT_FILENAME);
	});
