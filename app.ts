import * as fs from 'fs';
import inquirer from 'inquirer';
import * as Config from './config';
import {
	aggregateDuplicateBookmarks,
	checkAndGroupDuplicates,
	copyAndDeduplicate,
	groupFolders
} from './src/bookmark-utils';
import { parseBookmarkData, readBookmarkFile, writeResults } from './src/file-utils';
import { BookmarkBarChild, Bookmarks } from './src/types';

preparePrompt();

function showPrompt(paths: string[]): void {
	inquirer
		.createPromptModule()({
			name: 'paths',
			message: 'Select the files you want to process',
			choices: paths,
			type: 'checkbox'
		})
		.then((result: { paths: string[] }) => {
			processPaths(result.paths);
		})
		.catch(e => {
			console.error(e);
		});
}

function preparePrompt(): Promise<Error | void> {
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
				// TODO: Fix this case so that `Bookmarks` is written to the project directory
				pathsToProcess.push(fs.realpathSync(bookmarksFilePath[0])); // convert to absolute path so that it can be processed like the rest
			} else {
				console.info(
					`No ${Config.DEFAULT_INPUT_FILENAME} file found in root of project.`
				);
			}

			if (pathsToProcess.length === 0) {
				throw new Error(
					`Neither paths in ${'./paths'} nor ${
						Config.DEFAULT_INPUT_FILENAME
					} found. Exiting...`
				);
			}

			return showPrompt(pathsToProcess);
		})
		.catch(e => {
			throw e;
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
				duplicateBookmarks: aggregateDuplicateBookmarks(groupedDuplicates)
			};
		})
		.then(({ bookmarks, duplicateBookmarks }) => {
			if (duplicateBookmarks.length === 0) {
				throw new Error(
					`No duplicates found. New output files won't be written.`
				);
			}

			return { bookmarks, duplicateBookmarks };
		})
		.then(async ({ bookmarks, duplicateBookmarks }) => {
			const bookmarksForPrompt: {
				name: string;
				value: BookmarkBarChild;
			}[] = duplicateBookmarks.map(bookmark => ({
				name: `${bookmark.name} (${bookmark.url})`,
				value: bookmark
			}));

			console.clear();

			let idsToRemove: string[] = await inquirer
				.createPromptModule()({
					name: 'bookmarksToRemove',
					message: 'Select bookmarks to remove',
					choices: bookmarksForPrompt,
					pageSize: 30,
					type: 'checkbox'
				})
				.then((result: { bookmarksToRemove: BookmarkBarChild[] }) =>
					result.bookmarksToRemove.map(b => b.id)
				)
				.catch(e => {
					throw e;
				});

			return copyAndDeduplicate(bookmarks, idsToRemove);
		})
		.then(cleanedUpBookmarks => {
			return writeResults(filePath, cleanedUpBookmarks);
		})
		.catch(e => console.error(e));
}
