import { arrayContainsDuplicates } from './common-utils';
import { NotesChild } from './types';

export const notesFolderContainsDuplicates = (notes: NotesChild[]) =>
	arrayContainsDuplicates<NotesChild>(notes, 'content', notesAreEqual);

export function notesAreEqual(a: NotesChild, b: NotesChild): boolean {
	return a.content === b.content;
}
