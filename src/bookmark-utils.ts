import { BookmarkBarChild, Type, Child } from './types';

const closeMatch = (a: string, b: string): boolean =>
	stripProtocol(a) === stripProtocol(b);
const stripProtocol = (s: string): string => s.replace(/https?/gim, '');

export class BookmarkUtils {
	public static folderContainsDuplicates(
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

	public static splitDuplicatesIntoGroups(
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

	public static getNonDuplicateChildren(
		folder: BookmarkBarChild,
		duplicateIds: string[]
	): Child[] {
		return folder.children!.filter(child => duplicateIds.indexOf(child.id) === -1);
	}
}
