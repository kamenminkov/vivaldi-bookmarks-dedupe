import fs from 'fs';
import uniq from 'lodash/uniq';

import { Bookmarks, BookmarkBarChild, BookmarkBar } from './types';
import { BookmarkUtils } from './bookmark-utils';

let queue: Array<BookmarkBar | BookmarkBarChild> = [];

export function init() {
	fs.readFile(
		'Bookmarks',
		{ encoding: 'utf8' },
		(err: Error, data: string) => {
			if (err) {
				console.warn('Bookmarks file is probably missing from the root directory.');
				console.error(err);
				return;
			}

			let bookmarks: Bookmarks;

			readBookmarkData(data)
				.then((data) => {
					bookmarks = data;
					return checkAndGroupDuplicates(data);
				})
				.then((data) => aggregateDuplicateIds(data))
				.then((duplicates) => {
					const sortedDuplicates = duplicates.sort((a, b) => (parseInt(a) - parseInt(b)));
					const sortedDuplicateIdsString = sortedDuplicates.map(e => e.toString()).join('\n');

					console.log(sortedDuplicateIdsString);
					// console.log(sortedDuplicateIdsString);

					traverseAndRemoveDuplicates(bookmarks, sortedDuplicates);
				});
		}
	);
}

function readBookmarkData(value: string): Promise<Bookmarks> {
	return new Promise((resolve, reject) => {
		resolve(JSON.parse(value));
	});
}

function checkAndGroupDuplicates(bookmarks: Bookmarks): Promise<BookmarkBarChild[][]> {
	return new Promise((resolve, reject) => {
		for (let c of bookmarks.roots.bookmark_bar.children) {
			if (c.type !== 'folder') {
				continue;
			}

			const duplicateCheck = BookmarkUtils.folderContainsDuplicates(c);

			if (!duplicateCheck.duplicatesExist) {
				continue;
			}

			if ((duplicateCheck.duplicates && duplicateCheck.duplicates.length !== 0)) {
				let duplicateGroups: BookmarkBarChild[][] = BookmarkUtils.splitDuplicatesIntoGroups(duplicateCheck.duplicates, 'id');

				resolve(duplicateGroups);
			}
		}
	});
}

function aggregateDuplicateIds(duplicateGroups: BookmarkBarChild[][]): Promise<string[]> {
	// debugger;
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

function traverseAndRemoveDuplicates(bookmarks: Bookmarks, duplicateIds: string[]): Bookmarks | any {
	let dedupedBookmarks: Bookmarks | any = null;

	// debugger;

	for (const c of bookmarks.roots.bookmark_bar.children) {
		traverseDown(c);
	}

	console.log(queue);

	// debugger;

	return dedupedBookmarks;
}

function traverseDown(e: BookmarkBarChild): void {
	switch (e.type) {
		case 'folder':
			folderCount++;

			if (e.children) {
				for (const c of e.children) {
					traverseDown(c);
				}
			}

			break;
		case 'url':
			queue.push(e);
			break;
	}
}

function writeDeduplicatedBookmarks(): void {

}

let folderCount: number = 0;