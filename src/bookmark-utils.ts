import { BookmarkBarChild, Type, Child, Bookmarks } from './types';

let traverseCount: number = 0;
let removedBookmarks: BookmarkBarChild[] = [];

const closeMatch = (a: string, b: string): boolean =>
	stripProtocol(a) === stripProtocol(b);
const stripProtocol = (s: string): string => s.replace(/https?/gim, '');

export function folderContainsDuplicates(
	folder: BookmarkBarChild
): { duplicatesExist: boolean; duplicates?: BookmarkBarChild[] } {
	const duplicates: BookmarkBarChild[] = [];

	if (!folder.children || folder.children.length === 0) {
		return { duplicatesExist: false };
	}

	for (let i = 0; i < folder.children.length; i++) {
		for (let j = 1; j < folder.children.length; j++) {
			if (i === j) {
				continue;
			}

			let childI = folder.children[i];
			let childJ = folder.children[j];

			if (childI.type === Type.Folder || childJ.type === Type.Folder) {
				continue;
			}

			if (childI.url && childJ.url) {
				if (closeMatch(childI.url, childJ.url)) {
					if (!duplicates.includes(childJ)) {
						duplicates.push(childJ);
					}
				}
			}
		}
	}

	if (duplicates.length === 0) {
		return { duplicatesExist: false };
	} else {
		return { duplicatesExist: true, duplicates: duplicates };
	}
}

export function groupFolders(parsedData: Bookmarks): BookmarkBarChild[] {
	const allFolders: BookmarkBarChild[] = [];
	const queue: BookmarkBarChild[] = [];

	const dataRootsBookmarkBarChildren = parsedData.roots.bookmark_bar.children;

	for (const child of dataRootsBookmarkBarChildren) {
		if (child.type === 'folder') {
			traverseDown(child, queue);
		}
	}

	allFolders.push(...queue.filter(child => child.type === 'folder'));
	return allFolders;
}

export function splitDuplicatesIntoGroups(
	duplicates: BookmarkBarChild[],
	sortBy: 'date_added' | 'id' = 'id'
): BookmarkBarChild[][] {
	const groups: BookmarkBarChild[][] = [];

	for (let i = 0; i < duplicates.length; i++) {
		if (
			groups.length &&
			groups[groups.length - 1].some((b: BookmarkBarChild) =>
				closeMatch(b.url, duplicates[i].url)
			)
		) {
			continue;
		}

		const currentDuplicateGroup: BookmarkBarChild[] = [];

		for (let j = 1; j < duplicates.length; j++) {
			let duplicateI: BookmarkBarChild = duplicates[i];
			let duplicateJ: BookmarkBarChild = duplicates[j];

			if (closeMatch(duplicateI.url, duplicateJ.url)) {
				if (currentDuplicateGroup.indexOf(duplicateI) === -1) {
					currentDuplicateGroup.push(duplicateI);
				}

				if (currentDuplicateGroup.indexOf(duplicateJ) === -1) {
					currentDuplicateGroup.push(duplicateJ);
				}
			}
		}

		groups.push(
			currentDuplicateGroup.sort(
				(a, b) => parseInt(a[sortBy]) - parseInt(b[sortBy])
			)
		);
	}

	return groups;
}

export function getNonDuplicateChildren(
	folder: BookmarkBarChild,
	duplicateIds: string[]
): Child[] {
	return folder.children!.filter(child => duplicateIds.indexOf(child.id) === -1);
}

export function getBookmarksToRemove(
	folder: BookmarkBarChild,
	idsToRemove: string[]
): Child[] {
	return folder.children!.filter((child: BookmarkBarChild) =>
		idsToRemove.includes(child.id)
	);
}

export function aggregateDuplicateIds(duplicateGroups: BookmarkBarChild[][]): string[] {
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

	return duplicateIds;
}

export function copyAndDeduplicate(
	bookmarks: Bookmarks,
	idsToRemove: string[]
): Bookmarks {
	const cleanedUpBookmarks = Object.assign({}, bookmarks);

	const queue: BookmarkBarChild[] = [];

	traverseCount = 0;

	for (const child of bookmarks.roots.bookmark_bar.children) {
		traverseDown(child, queue);
	}

	const folders: BookmarkBarChild[] = queue.filter(e => e.type === Type.Folder);

	for (const folder of folders) {
		removedBookmarks.push(...getBookmarksToRemove(folder, idsToRemove));
		folder.children = getNonDuplicateChildren(folder, idsToRemove);
	}

	return cleanedUpBookmarks;
}

export function resetRemovedBookmarks() {
	// TODO: Add folder info (i.e. which folder any removed bookmark was in)

	console.info(`Removed bookmarks:`);
	console.info(`${removedBookmarks.map(b => `${b.name} (${b.url})`).join('\n')}`);

	removedBookmarks = [];
}

export function traverseDown(e: BookmarkBarChild, queue: any[]): void {
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
