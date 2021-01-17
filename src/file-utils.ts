import path from 'path';
import sanitize from 'sanitize-filename';
import * as Config from '../config';

export function getFullDestinationPathCleanFile(
	destinationDir: string,
	fileNameCleanFile: string
): string {
	return path.join(destinationDir, fileNameCleanFile);
}

export function getFullDestinationPathOriginalFile(
	destinationDir: string,
	fileNameOriginalFile: string
): string {
	return path.join(destinationDir, fileNameOriginalFile);
}

export function getFileNameCleanFile(
	withPaths: boolean,
	sanitizedFilePath: string
): string {
	return withPaths && !Config.WRITE_CLEAN_BOOKMARKS_IN_PLACE
		? `${sanitizedFilePath}_clean`
		: 'Bookmarks';
}

export function getFilePaths(filePath: string, withAbsolutePaths: boolean) {
	const sanitizedFilePath: string = getSanitizedFilePath(filePath);
	const destinationDir: string = getDestinationDir(filePath);
	const fileNameOriginalFile: string = getFileNameOriginalFile(
		withAbsolutePaths,
		sanitizedFilePath
	);
	const fileNameCleanFile: string = getFileNameCleanFile(
		withAbsolutePaths,
		sanitizedFilePath
	);
	const fullDestinationPathOriginalFile: string = getFullDestinationPathOriginalFile(
		destinationDir,
		fileNameOriginalFile
	);
	const fullDestinationPathCleanFile: string = getFullDestinationPathCleanFile(
		destinationDir,
		fileNameCleanFile
	);

	return {
		fullDestinationPathOriginalFile,
		fullDestinationPathCleanFile,
		fileNameCleanFile,
		fileNameOriginalFile,
		destinationDir
	};
}

export function getFileNameOriginalFile(
	withPaths: boolean,
	sanitizedFilePath: string
): string {
	return withPaths && !Config.WRITE_CLEAN_BOOKMARKS_IN_PLACE
		? `${sanitizedFilePath}_original`
		: 'Bookmarks_original';
}

export function getDestinationDir(filePath: string): string {
	return Config.WRITE_CLEAN_BOOKMARKS_IN_PLACE ? path.dirname(filePath) : '.';
}

export function getSanitizedFilePath(filePath: string): string {
	return sanitize(filePath, {
		replacement: '___'
	}).replace(/\s+/gim, '_');
}

export function parseBookmarkData<T>(data: string): Promise<T> {
	return new Promise((resolve, reject) => {
		resolve(JSON.parse(data));
	});
}
