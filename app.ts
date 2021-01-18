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

function showPrompt(paths: string[]): Promise<string | void | any[]> {
	return inquirer
		.createPromptModule()({
			name: 'paths',
			message: 'Select the files you want to process',
			choices: paths,
			type: 'checkbox'
		})
		.then((result: { paths: string[] }) => processPaths(result.paths))
		.catch(e => console.error(e));
}

function preparePrompt(): Promise<void | Error | undefined> {
	return Promise.all([importPaths(), testBookmarksFile()])
		.then(([pathsFromFile, bookmarksFilePath]) => {
			// TODO: Consider using a data type for paths instead of bare strings
			let pathsToProcess: string[] = [];

			if (pathsInputIsValid(pathsFromFile.default)) {
				pathsToProcess.push(...pathsFromFile.default);
			} else {
				console.info(
					`No paths found. Falling back to ${Config.DEFAULT_INPUT_FILENAME} in the project root.`
				);
			}

			if (pathsInputIsValid(bookmarksFilePath)) {
				pathsToProcess.push(fs.realpathSync(bookmarksFilePath[0])); // convert to absolute path so that it can be processed like the rest
			} else {
				console.info(
					`No ${Config.DEFAULT_INPUT_FILENAME} file found in root of project.`
				);
			}

			if (pathsToProcess.length === 0) {
				return new Error(
					`Neither paths in ${'./paths'} nor ${
						Config.DEFAULT_INPUT_FILENAME
					} found. Exiting...`
				);
			}

			showPrompt(pathsToProcess);
		})
		.catch(e => {
			console.error(e);
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

function processPaths(paths: string[]): Promise<string | void | any[]> {
	const promises = paths.map((path: string) => init(path, true));

	return Promise.all(promises).catch(e => console.error(e));
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
