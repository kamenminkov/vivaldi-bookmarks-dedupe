import * as fs from 'fs';
import {
	aggregateDuplicateIds,
	copyAndDeduplicate,
	folderContainsDuplicates,
	groupFolders,
	resetRemovedBookmarks,
	splitDuplicatesIntoGroups
} from './bookmark-utils';
import { getFilePaths, parseBookmarkData } from './file-utils';
import { BookmarkBarChild, Bookmarks } from './types';

function readBookmarkFile(path: string): Promise<string> {
	return fs.promises.readFile(path, { encoding: 'utf8' });
}

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

export function writeResults(
	filePath: string,
	fullDestinationPathOriginalFile: string,
	fullDestinationPathCleanFile: string,
	cleanedUpBookmarks: Bookmarks,
	fileNameCleanFile: string,
	fileNameOriginalFile: string,
	destDir: string
) {
	fs.promises
		.copyFile(filePath, fullDestinationPathOriginalFile)
		.then(() => {
			if (fs.existsSync(fullDestinationPathCleanFile)) {
				fs.promises.unlink(fullDestinationPathCleanFile);
			}
		})
		.then(() =>
			fs.promises.writeFile(
				fullDestinationPathCleanFile,
				JSON.stringify(cleanedUpBookmarks),
				{
					encoding: 'utf8'
				}
			)
		)
		.then(() => {
			console.info(
				`Written out cleaned up bookmarks as "${fileNameCleanFile}", original file copied to "${fileNameOriginalFile}" in "${destDir}"`
			);

			resetRemovedBookmarks();
		})
		.catch(e => {
			// TODO: Find out possible cases when this might fail
			console.error(`Couldn't write output files.`);
		});
}

function checkAndGroupDuplicates(folders: BookmarkBarChild[]): BookmarkBarChild[][] {
	let duplicateGroups: BookmarkBarChild[][] = [];

	for (let folder of folders) {
		if (folder.children && folder.children.length === 0) {
			continue;
		}

		const duplicateCheck = folderContainsDuplicates(folder);

		if (!duplicateCheck.duplicatesExist) {
			continue;
		}

		if (duplicateCheck.duplicates && duplicateCheck.duplicates.length !== 0) {
			duplicateGroups.push(
				...splitDuplicatesIntoGroups(duplicateCheck.duplicates, 'id')
			);
		}
	}

	return duplicateGroups;
}
