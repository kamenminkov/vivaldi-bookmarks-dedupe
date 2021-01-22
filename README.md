# Vivaldi Bookmark Dedupe

This is a simple tool to help resolve bookmark duplication that sometimes happens when using Vivaldi Sync.

## Getting started

Clone the project or download it as a zip

### Prerequisites:

-   Node.js, tested with `v13.2.0`

## How to use:

Use case `#1`, manual:

1. Copy your `Bookmarks` file from Vivaldi's profile directory into this directory.
2. Execute `npm run start`.
3. Close Vivaldi and copy `Bookmarks` back into Vivaldi's profile directory.

Use case `#2`, semi-automated:

1.  Provide a `paths.ts` file containing a default export which is an array of strings, each element being a full path to a `Bookmarks` file of a Vivaldi instance (see example below).

    -   By default, original and cleaned up file will be written to the tool's root directory
    -   However, if in `config.ts` `WRITE_CLEAN_BOOKMARKS_IN_PLACE` is `true`, then the clean file will be written directly to the source directory, in which case the respective Vivaldi instance should be closed before running the tool

2.  Execute `npm run start`.

`paths.ts` example on Windows with two Vivaldi instances:

```typescript
const paths = [
	`C:\\Users\\<USERNAME>\\My Program Files\\Vivaldi Snapshot\\User Data\\Default\\Bookmarks`,
	`C:\\Users\\<USERNAME>\\AppData\\Local\\Vivaldi\\User Data\\Default\\Bookmarks`
];

export default paths;
```

Untested on other platforms, but _should_ work the same way.

### Notes:

-   You can find each Vivaldi instance's profile directory by going to `Vivaldi -> Help -> About` and looking for `Profile Path`.

In use case `#1`, or `#2` when `WRITE_CLEAN_BOOKMARKS_IN_PLACE` is set to `true`,

-   the cleaned up bookmarks file will appear in the place of the old one (`Bookmarks`)
-   the original `Bookmarks` file will be renamed to `Bookmarks_original` in case you need it.

Otherwise, if paths are provided in use case `#2` and `WRITE_CLEAN_BOOKMARKS_IN_PLACE` is `false`, the original source directory will be prepended to the output file names to help you identify each one. In that case you must manually copy each one to its original directory and then rename it. Theoretically, for multiple instances synced to the same account, it should be possible to just use the same cleaned up file.

## Built With

-   [Node.js](https://github.com/nodejs/node)
-   [TypeScript](https://github.com/microsoft/TypeScript)
-   [Inquirer.js](https://github.com/SBoudrias/Inquirer.js)

## TODO

-   ~~Automate copying bookmarks from Vivaldi's dir and back into it~~
-   ~~Have a way to select which bookmark files are processed (if multiple are provided)~~
-   ~~Implement a way to select which duplicates are removed~~
-   Have the CLI prompt for settings, e.g. input and output file name and `WRITE_CLEAN_BOOKMARKS_IN_PLACE`

## Authors

-   [**Kamen Minkov**](https://github.com/kamenminkov) - _Initial work_

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Thanks

Thanks to the whole Vivaldi team for making an awesome browser.

## Acknowledgments

This tool is to be used without any warranty, i.e. I am not responsible for any data loss that might occur. Always have a copy of your bookmarks in a safe place before using this tool.

I am not affiliated in any way with Vivaldi Technologies besides being a user of their products.
