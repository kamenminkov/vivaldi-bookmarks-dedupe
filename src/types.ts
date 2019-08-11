export interface Bookmarks {
	checksum: string;
	roots: Roots;
	version: number;
}

export interface Roots {
	bookmark_bar: BookmarkBar;
	other: BookmarkBar;
	sync_transaction_version: string;
	synced: BookmarkBar;
	trash: BookmarkBar;
}

export interface BookmarkBar {
	children: BookmarkBarChild[];
	date_added: string;
	date_modified: string;
	id: string;
	name: string;
	sync_transaction_version?: string;
	type: Type;
}

export interface BookmarkBarChild {
	children?: Child[];
	date_added: string;
	date_modified?: string;
	id: string;
	meta_info?: FluffyMetaInfo;
	name: string;
	sync_transaction_version: string;
	type: Type;
	url: string;
}

export interface Child {
	date_added: string;
	id: string;
	meta_info?: PurpleMetaInfo;
	name: string;
	sync_transaction_version: string;
	type: Type;
	url: string;
	children?: Child[];
	date_modified?: string;
}

export interface PurpleMetaInfo {
	Description?: string;
	Nickname?: Nickname;
	Speeddial?: string;
	Thumbnail?: string;
	last_visited_desktop?: string;
	Visited?: string;
}

export enum Nickname {
	Empty = '',
	F = 'f',
	S = 's',
	Vtb = 'vtb',
}

export enum Type {
	Folder = 'folder',
	URL = 'url',
}

export interface FluffyMetaInfo {
	Description?: string;
	Nickname?: Nickname;
	Speeddial?: string;
	Thumbnail?: string;
	last_visited_desktop?: string;
}