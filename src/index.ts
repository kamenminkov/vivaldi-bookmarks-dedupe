import fs from 'fs';
import uniq from 'lodash/uniq';

import { Bookmarks, BookmarkBarChild, BookmarkBar, Type } from './types';
import { BookmarkUtils } from './bookmark-utils';

let traverseCount: number = 0;
let excludedBookmarks: BookmarkBarChild[] = [];

export function init() {
	fs.readFile(
		'Bookmarks',
		{ encoding: 'utf8' },
		(err: NodeJS.ErrnoException | null, data: string) => {
			if (err) {
				console.warn(
					'Bookmarks file is probably missing from the root directory.'
				);

				return;
			}

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
					fs.promises
						.copyFile('Bookmarks', 'Bookmarks_original')
						.then(() => fs.promises.unlink('Bookmarks'))
						.then(() =>
							fs.promises.writeFile(
								'Bookmarks',
								JSON.stringify(cleanedUpBookmarks),
								{ encoding: 'utf8' }
							)
						)
						.then(() =>
							console.info(
								`Written out cleaned up bookmarks as 'Bookmarks', original file copied to 'Bookmarks_original'`
							)
						);
				});
		}
	);
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
				duplicateIds.push(dGroup[i].id);
			}
		}

		resolve(uniq(duplicateIds));
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
