import fs from 'fs';
import path from 'path';
import sanitize from 'sanitize-filename';
import * as Config from '../config';
import { BookmarkUtils } from './bookmark-utils';
import { notesFolderContainsDuplicates } from './notes-utils';
import { BookmarkBarChild, Bookmarks, Child, Notes, NotesChild, Type } from './types';

let traverseCount: number = 0;
let removedBookmarks: BookmarkBarChild[] = [];
let removedNotes: NotesChild[] = [];

export function readFile(path: string): Promise<string> {
	return fs.promises.readFile(path, { encoding: 'utf8' });
}

export function init(filePath: string, withPaths: boolean = false): Promise<[unknown, unknown]> {
	let notesPromise: Promise<string | void>;

	if (!Config.PROCESS_NOTES) {
		notesPromise = Promise.resolve();
	} else {
		notesPromise = readFile('Notes').then(data => {
			readFile('Notes').then(data =>
				parseJSONData<Notes>(data)
					.then(parsedData => {
						const duplicateCheck = notesFolderContainsDuplicates(parsedData.children);

						if (!duplicateCheck.duplicatesExist) {
							return Promise.reject();
						}

						const duplicateIds: string[] = duplicateCheck.duplicates!.map(d => d.id);

						removedNotes = duplicateCheck.duplicates!.slice();

						const nonDuplicateNotes: NotesChild[] = parsedData.children.filter(
							n => !duplicateIds.includes(n.id)
						);

						return {
							...parsedData,
							children: nonDuplicateNotes
						};
					})
					.then(notes => {
						fs.promises.copyFile('Notes', 'Notes_original').then(() =>
							fs.promises.writeFile('Notes', JSON.stringify(notes), {
								encoding: 'utf8'
							})
						);
					})
					.then(() => {
						console.info(
							`Written out cleaned up notes as "Notes", original file copied to "Notes_original"`
						);

						console.info(
							`Removed notes:\n${removedNotes
								.map(n => n.content)
								.join('\n')
								.trim()}`
						);

						removedNotes = [];
					})
			);

			return new Promise((resolve, reject) => resolve());
		});
	}

	let bookmarkPromise: Promise<string | void>;

	if (!Config.PROCESS_BOOKMARKS) {
		bookmarkPromise = Promise.resolve();
	} else {
		bookmarkPromise = readFile(filePath)
			.then(data =>
				parseJSONData<Bookmarks>(data)
					.then(parsedData => {
						const allFolders: BookmarkBarChild[] = [];
						const queue: BookmarkBarChild[] = [];
						const dataRootsBookmarkBarChildren = parsedData.roots.bookmark_bar.children;

						for (const child of dataRootsBookmarkBarChildren) {
							if (child.type === 'folder') {
								traverseDown(child, queue);
							}
						}

						allFolders.push(...queue.filter(child => child.type === 'folder'));
						const groupedDuplicates: BookmarkBarChild[][] = [...checkAndGroupDuplicates(allFolders)];

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

						const fullDestinationPathOriginalFile: string = path.join(destinationDir, fileNameOriginalFile);
						const fullDestinationPathCleanFile: string = path.join(destinationDir, fileNameCleanFile);

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
									`Written out cleaned up bookmarks as "${fileNameCleanFile}", original file copied to "${fileNameOriginalFile}" in "${destinationDir}"`
								);

								console.info(
									`Removed bookmarks:\n${removedBookmarks
										.map(b => `${b.name} (${b.url})`)
										.join('\n')
										.trim()}`
								);

								removedBookmarks = [];
							});
					})
			)
			.catch(e => {
				debugger;
				return console.error(e);
			});
	}

	return Promise.all([notesPromise, bookmarkPromise]);
}

function parseJSONData<T>(data: string): Promise<T> {
	return new Promise((resolve, reject) => {
		try {
			resolve(JSON.parse(data));
		} catch (err) {
			reject(err);
		}
	});
}

function checkAndGroupDuplicates(folders: BookmarkBarChild[]): BookmarkBarChild[][] {
	let duplicateGroups: BookmarkBarChild[][] = [];

	for (let folder of folders) {
		if (folder.children && folder.children.length === 0) {
			continue;
		}

		const duplicateCheck = BookmarkUtils.bookmarksFolderContainsDuplicates(folder.children as Child[]);

		if (!duplicateCheck.duplicatesExist) {
			continue;
		}

		if (duplicateCheck.duplicates && duplicateCheck.duplicates.length !== 0) {
			duplicateGroups.push(...BookmarkUtils.splitDuplicatesIntoGroups(duplicateCheck.duplicates, 'id'));
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
		removedBookmarks.push(...BookmarkUtils.getBookmarksToRemove(folder, idsToRemove));

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
