import fs, { fstat } from 'fs';
import path from 'path';

import sanitize from 'sanitize-filename';

import { Bookmarks, BookmarkBarChild, BookmarkBar, Type } from './types';
import { BookmarkUtils } from './bookmark-utils';
import * as Config from '../config';

let traverseCount: number = 0;
let excludedBookmarks: BookmarkBarChild[] = [];

export function readBookmarkFile(path: string): Promise<string> {
	return fs.promises.readFile(path, { encoding: 'utf8' });
}

export function init(
	filePath: string,
	withPaths: boolean = false
): Promise<string | void> {
	return readBookmarkFile(filePath)
		.then(data =>
			parseBookmarkData(data)
				.then(parsedData => {
					const allFolders: BookmarkBarChild[] = [];
					const queue: BookmarkBarChild[] = [];

					const dataRootsBookmarkBarChildren =
						parsedData.roots.bookmark_bar.children;

					for (const child of dataRootsBookmarkBarChildren) {
						if (child.type === 'folder') {
							traverseDown(child, queue);
						}
					}

					allFolders.push(...queue.filter(child => child.type === 'folder'));
					const groupedDuplicates: BookmarkBarChild[][] = [
						...checkAndGroupDuplicates(allFolders)
					];

					return { parsedData, groupedDuplicates };
				})
				.then(({ parsedData, groupedDuplicates }) => {
					return Promise.all([
						new Promise<Bookmarks>(resolve => resolve(parsedData)),
						aggregateDuplicateIds(groupedDuplicates)
					]);
				})
				.then(value => {
					const bookmarks: Bookmarks = value[0];
					const duplicateIds: string[] = value[1];

					return copyAndDeduplicate(bookmarks, duplicateIds);
				})
				.then(cleanedUpBookmarks => {
					let sanitizedFilePath: string = sanitize(filePath, {
						replacement: '___'
					}).replace(/\s+/gim, '_');

					const destinationDir: string = Config.WRITE_CLEAN_BOOKMARKS_IN_PLACE
						? path.dirname(filePath)
						: '.';
					const fileNameOriginalFile: string =
						withPaths && !Config.WRITE_CLEAN_BOOKMARKS_IN_PLACE
							? `${sanitizedFilePath}_original`
							: 'Bookmarks_original';
					const fileNameCleanFile: string =
						withPaths && !Config.WRITE_CLEAN_BOOKMARKS_IN_PLACE
							? `${sanitizedFilePath}_clean`
							: 'Bookmarks';

					const fullDestinationPathOriginalFile: string = path.join(
						destinationDir,
						fileNameOriginalFile
					);
					const fullDestinationPathCleanFile: string = path.join(
						destinationDir,
						fileNameCleanFile
					);

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
								{ encoding: 'utf8' }
							)
						)
						.then(() =>
							console.info(
								`Written out cleaned up bookmarks as ${fullDestinationPathCleanFile}, original file copied to ${fullDestinationPathOriginalFile} in ${destinationDir}`
							)
						);
				})
		)
		.catch(e => {
			debugger;
			return console.error(e);
		});
}

function parseBookmarkData(data: string): Promise<Bookmarks> {
	return new Promise((resolve, reject) => {
		resolve(JSON.parse(data));
	});
}

function checkAndGroupDuplicates(folders: BookmarkBarChild[]): BookmarkBarChild[][] {
	let duplicateGroups: BookmarkBarChild[][] = [];

	for (let folder of folders) {
		if (folder.children && folder.children.length === 0) {
			continue;
		}

		const duplicateCheck = BookmarkUtils.folderContainsDuplicates(folder);

		if (!duplicateCheck.duplicatesExist) {
			continue;
		}

		if (duplicateCheck.duplicates && duplicateCheck.duplicates.length !== 0) {
			duplicateGroups.push(
				...BookmarkUtils.splitDuplicatesIntoGroups(
					duplicateCheck.duplicates,
					'id'
				)
			);
		}
	}

	return duplicateGroups;
}

function aggregateDuplicateIds(duplicateGroups: BookmarkBarChild[][]): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const duplicateIds: string[] = [];

		for (const dGroup of duplicateGroups) {
			for (const i in dGroup) {
				if (i === '0') continue; // Skip the first in each group, we want to keep it.
				const id = dGroup[i].id;

				if (duplicateIds.indexOf(id) === -1) {
					duplicateIds.push(id);
				}
			}
		}

		resolve(duplicateIds);
	});
}

function copyAndDeduplicate(bookmarks: Bookmarks, idsToRemove: string[]): Bookmarks {
	const cleanedUpBookmarks = Object.assign({}, bookmarks);

	const queue: BookmarkBarChild[] = [];

	traverseCount = 0;

	for (const child of bookmarks.roots.bookmark_bar.children) {
		traverseDown(child, queue);
	}

	const folders: BookmarkBarChild[] = queue.filter(e => e.type === Type.Folder);

	for (const folder of folders) {
		folder.children = BookmarkUtils.getNonDuplicateChildren(folder, idsToRemove);
	}

	return cleanedUpBookmarks;
}

function traverseDown(e: BookmarkBarChild, queue: any[]): void {
	traverseCount++;

	console.clear();
	console.log(`[${traverseCount}] Traversing...`);

	queue.push(e);

	if (e.type === Type.Folder) {
		if (e.children) {
			const children = e.children;

			for (const child of children) {
				traverseDown(child, queue);
			}
		}
	}
}
