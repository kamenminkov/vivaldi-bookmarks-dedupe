import * as fs from 'fs';
import inquirer from 'inquirer';
import { exit } from 'process';
import * as Config from './config';
import {
	aggregateDuplicateIds,
	checkAndGroupDuplicates,
	copyAndDeduplicate,
	groupFolders
} from './src/bookmark-utils';
import {
	getFilePaths,
	parseBookmarkData,
	readBookmarkFile,
	writeResults
} from './src/file-utils';
import { BookmarkBarChild, Bookmarks } from './src/types';

preparePrompt();

function showPrompt(paths: string[]) {
	let prompt = inquirer.createPromptModule({});

	prompt({
		name: 'paths',
		message: 'Select paths you want to process',
		choices: paths,
		type: 'checkbox'
	})
		.then(a => {
			console.log(a);

			debugger;
			exit(1);
		})
		.catch(e => console.error(e));
}

function preparePrompt(): any {
	Promise.all([importPaths(), testBookmarksFile()])
		.then(([pathsFromFile, bookmarksFilePath]) => {
			let paths: string[] = [];

			if (pathsInputIsValid(pathsFromFile.default)) {
				paths.push(...pathsFromFile.default);
			} else {
				console.info(
					`No paths found. Falling back to ${Config.DEFAULT_INPUT_FILENAME} in the project root.`
				);
			}

			if (pathsInputIsValid(bookmarksFilePath)) {
				paths.push(fs.realpathSync(bookmarksFilePath[0]));
			} else {
				console.info(
					`No ${Config.DEFAULT_INPUT_FILENAME} file found in root of project.`
				);
			}

			if (paths.length === 0) {
				throw new Error(
					`Neither paths in ${'./paths'} nor ${
						Config.DEFAULT_INPUT_FILENAME
					} found. Exiting...`
				);
			}

			showPrompt(paths);
		})
		.catch(e => {
			debugger;
		});
}

function importPaths(path: string = './paths'): Promise<Object & { default: string[] }> {
	return import(path as any);
}

function testBookmarksFile(
	path: string = Config.DEFAULT_INPUT_FILENAME
): Promise<string[]> {
	return new Promise<string[]>(resolve => resolve(fs.existsSync(path) ? [path] : []));
}

function pathsInputIsValid(paths: string[]): boolean {
	return (
		paths instanceof Array &&
		paths.length > 0 &&
		paths.every(path => fs.existsSync(path))
	);
}

function test() {
	import('./paths' as any)
		.then((value: Object & { default: any }) => {
			const paths: string[] = value.default;

			if (!pathsInputIsValid(paths)) {
				throw new Error(
					`No paths found. Falling back to ${Config.DEFAULT_INPUT_FILENAME} in the project root.`
				);
			}

			const promises = paths.map((path: string) => init(path, true));

			promises.reduce(
				(promiseChain: Promise<any>, currentTask: Promise<any>) =>
					promiseChain.then(chainResults =>
						currentTask.then(currentResult => [
							...chainResults,
							currentResult
						])
					),
				Promise.resolve([])
			);
		})
		.catch((e: any) => {
			console.error(e);

			init(Config.DEFAULT_INPUT_FILENAME, false).catch(e => {
				console.error('No Bookmarks file found in root of project.');
			});
		});
}

function init(filePath: string, withAbsolutePaths: boolean): Promise<string | void> {
	return readBookmarkFile(filePath)
		.then(data => parseBookmarkData<Bookmarks>(data))
		.then(parsedData => {
			const allFolders: BookmarkBarChild[] = groupFolders(parsedData);
			const groupedDuplicates: BookmarkBarChild[][] = [
				...checkAndGroupDuplicates(allFolders)
			];

			return {
				bookmarks: parsedData,
				duplicateIds: aggregateDuplicateIds(groupedDuplicates)
			};
		})
		.then(({ bookmarks, duplicateIds }) => {
			if (duplicateIds.length === 0) {
				throw new Error(
					`No duplicates found. New output files won't be written.`
				);
			}

			return copyAndDeduplicate(bookmarks, duplicateIds);
		})
		.then(cleanedUpBookmarks => {
			let {
				fullDestinationPathOriginalFile,
				fullDestinationPathCleanFile,
				fileNameCleanFile,
				fileNameOriginalFile,
				destinationDir
			} = getFilePaths(filePath, withAbsolutePaths);

			writeResults(
				filePath,
				fullDestinationPathOriginalFile,
				fullDestinationPathCleanFile,
				cleanedUpBookmarks,
				fileNameCleanFile,
				fileNameOriginalFile,
				destinationDir
			);
		})
		.catch(e => console.error(e));
}
