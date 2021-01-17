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

import('./paths' as any)
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
		console.error(e);

		init(Config.DEFAULT_INPUT_FILENAME, false).catch(e => {
			console.error('No Bookmarks file found in root of project.');
		});
	});

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
