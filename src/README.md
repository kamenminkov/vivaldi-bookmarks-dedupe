# Vivaldi Bookmark Dedupe

This is a simple tool to help resolve bookmark duplication that sometimes happens when using Vivaldi Sync.

## Getting started

Clone the project or download it as a zip

### Prerequisites:

-   Node.js, tested with `v13.2.0`

### How to use:

1. Copy your `Bookmarks` file from Vivaldi's profile directory into this directory.
2. Execute `npm run start`.
3. Close Vivaldi and copy `Bookmarks` back into Vivaldi's profile directory.

Notes:

-   The cleaned up bookmarks file will appear in the place of the old one (`Bookmarks`)
-   The original `Bookmarks` file will be renamed to `Bookmarks_original` in case you need it
-   You can find Vivaldi's profile directory by going to `Vivaldi -> Help -> About` and looking for `Profile Path`.

## Built With

-   [Node.js](https://github.com/nodejs/node)
-   [TypeScript](https://github.com/microsoft/TypeScript)

## Authors

-   [**Kamen Minkov**](https://github.com/kamenminkov) - _Initial work_

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Thanks

Thanks to the whole Vivaldi team for making an awesome browser.

## Acknowledgments

This tool is to be used without any warranty, i.e. I am not responsible for any data loss that might occur. Always have a copy of your bookmarks in a safe place before using this tool.

I am not affiliated in any way with Vivaldi Technologies besides being a user of their products.
