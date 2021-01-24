import * as fs from 'fs';
import path from 'path';
import sanitize from 'sanitize-filename';
import * as Config from '../config';
import { resetRemovedBookmarks } from './bookmark-utils';
import { Bookmarks } from './types';

export function getFullPath(destDir: string, filename: string): string {
	return path.join(destDir, filename);
}

export function getFileNameCleanFile(
	sanitizedFilePath: string,
	fromProjectRoot: boolean
): string {
	return fromProjectRoot || Config.WRITE_CLEAN_BOOKMARKS_IN_PLACE
		? Config.DEFAULT_INPUT_FILENAME
		: `${sanitizedFilePath}_clean`;
}

export function getFilePaths(rawFilePath: string) {
	const projectDir: string = getProjectDir();

	const fromProjectRoot: boolean = path.dirname(rawFilePath) === projectDir;

	const filePath = fromProjectRoot ? path.basename(rawFilePath) : rawFilePath;
	const originalFileDir: string = path.dirname(filePath);

	const sanitizedFilePath: string = getSanitizedFilePath(filePath);

	const destDir: string = getDestinationDir(
		originalFileDir,
		Config.WRITE_CLEAN_BOOKMARKS_IN_PLACE
	);
	const fileNameOriginalFile: string = getFileNameOriginalFile(
		sanitizedFilePath,
		fromProjectRoot
	);
	const fileNameCleanFile: string = getFileNameCleanFile(
		sanitizedFilePath,
		fromProjectRoot
	);

	return {
		fileNameCleanFile,
		fileNameOriginalFile,
		destDir
	};
}

export function getFileNameOriginalFile(
	sanitizedFilePath: string,
	fromProjectRoot: boolean
): string {
	return fromProjectRoot || Config.WRITE_CLEAN_BOOKMARKS_IN_PLACE
		? `${Config.DEFAULT_INPUT_FILENAME}_original`
		: `${sanitizedFilePath}_original`;
}

export function getDestinationDir(
	originalFileDir: string,
	writeResultsInPlace: boolean
): string {
	const projectDir: string = getProjectDir();

	return originalFileDir === projectDir || !writeResultsInPlace
		? projectDir
		: originalFileDir;
}

function getProjectDir(): string {
	return process.cwd();
}

export function getSanitizedFilePath(filePath: string): string {
	return sanitize(filePath, {
		replacement: '___'
	}).replace(/\s+/gim, '_');
}

export function readBookmarkFile(path: string): Promise<string> {
	return fs.promises.readFile(path, { encoding: 'utf8' });
}

export function parseBookmarkData<T>(data: string): Promise<T> {
	return new Promise((resolve, reject) => {
		resolve(JSON.parse(data));
	});
}

export function writeResults(filePath: string, cleanedUpBookmarks: Bookmarks): void {
	let { fileNameCleanFile, fileNameOriginalFile, destDir } = getFilePaths(filePath);

	const fullDestPathOriginalFile: string = getFullPath(destDir, fileNameOriginalFile);
	const fullDestPathCleanFile: string = getFullPath(destDir, fileNameCleanFile);

	fs.promises
		.copyFile(filePath, fullDestPathOriginalFile)
		.then(() => {
			if (fs.existsSync(fullDestPathCleanFile)) {
				fs.promises.unlink(fullDestPathCleanFile);
			}
		})
		.then(() =>
			fs.promises.writeFile(
				fullDestPathCleanFile,
				JSON.stringify(cleanedUpBookmarks),
				{
					encoding: 'utf8'
				}
			)
		)
		.then(() => {
			console.info(
				`Written out cleaned up bookmarks as "${fileNameCleanFile}", original file copied to "${fileNameOriginalFile}" in "${destDir}"`
			);

			resetRemovedBookmarks();
		})
		.catch(e => {
			// TODO: Find out possible cases when this might fail
			console.error(`Couldn't write output files.`);
		});
}
