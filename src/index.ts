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

					const groupedDuplicates = [];

					groupedDuplicates.push(...checkAndGroupDuplicates(allFolders));

					return { parsedData, groupedDuplicates };
				})
				.then(({ parsedData, groupedDuplicates }) => {
					const dataPromise = new Promise<Bookmarks>((resolve, reject) => {
						return resolve(parsedData);
					});

					const duplicatesPromise: Promise<string[]> = aggregateDuplicateIds(
						groupedDuplicates
					);

					return Promise.all([dataPromise, duplicatesPromise]);
				})
				.then(value => {
					const bookmarks: Bookmarks = value[0];
					const duplicates: string[] = value[1];

					const sortedDuplicates = duplicates.sort(
						(a, b) => parseInt(a) - parseInt(b)
					);

					return copyAndDeduplicate(bookmarks, duplicates);
				})
				.then(cleanedUp => {
					debugger;
					fs.writeFile(
						'Bookmarks_cleaned_up.json',
						JSON.stringify(cleanedUp),
						{ encoding: 'utf8' },
						() => {
							debugger;
						}
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
	console.log('=====: checkAndGroupDuplicates', checkAndGroupDuplicates);
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
		if (duplicateGroups.length === 0) {
			reject();
		}

		const duplicateIds: string[] = [];

		for (const dGroup of duplicateGroups) {
			for (const i in dGroup) {
				if (i === '0') continue; // Skip the first in each group, we want to keep it.
				duplicateIds.push(dGroup[i].id);
			}
		}

		if (duplicateIds.length === 0) {
			reject();
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
