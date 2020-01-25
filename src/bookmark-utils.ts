import { BookmarkBarChild, Type, Child } from './types';
import { arrayContainsDuplicates } from './common-utils';

const closeMatch = (a: BookmarkBarChild, b: BookmarkBarChild): boolean =>
	stripProtocol(a.url) === stripProtocol(b.url);
const stripProtocol = (s: string): string => s.replace(/https?/gim, '');

export class BookmarkUtils {
	public static bookmarksFolderContainsDuplicates(bookmarks: Child[]) {
		return arrayContainsDuplicates<Child>(bookmarks, 'url', closeMatch);
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
					closeMatch(b, duplicates[i])
				)
			) {
				continue;
			}

			const currentDuplicateGroup: BookmarkBarChild[] = [];

			for (let j = 1; j < duplicates.length; j++) {
				let duplicateI: BookmarkBarChild = duplicates[i];
				let duplicateJ: BookmarkBarChild = duplicates[j];

				if (closeMatch(duplicateI, duplicateJ)) {
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

	public static getBookmarksToRemove(
		folder: BookmarkBarChild,
		idsToRemove: string[]
	): Child[] {
		return folder.children!.filter((child: BookmarkBarChild) =>
			idsToRemove.includes(child.id)
		);
	}
}
