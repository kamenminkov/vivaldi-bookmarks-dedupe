import {
	aggregateDuplicateIds,
	checkAndGroupDuplicates,
	copyAndDeduplicate,
	groupFolders
} from './bookmark-utils';
import {
	getFilePaths,
	parseBookmarkData,
	readBookmarkFile,
	writeResults
} from './file-utils';
import { BookmarkBarChild, Bookmarks } from './types';

export function init(
	filePath: string,
	withAbsolutePaths: boolean
): Promise<string | void> {
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
