# Tab QR Code

Generate a QR code for the currently open browser tab.

![Screenshot of the browser extension](screenshot.png)

This browser extension generates a QR code for the currently open browser tab, which can be scanned with a QR code-enabled device or downloaded for printing or sharing.

# Working on This Extension

This extension is written in TypeScript and uses TailwindCSS for styling. The build process is managed by npm scripts, which handle the transpilation of TypeScript to JavaScript and the generation of CSS files.

Important files and directories in the project:

- `popup.html`: The HTML file containing the popup interface.
- `popup.ts`: The TypeScript file that manages the popup interface and displays the QR code.
- `qr.ts`: The TypeScript file responsible for generating the QR code.
- `styles/fonts.css`: Loads the `Inter` font from the `fonts/` directory.
- `styles/styles.css`: Imports TailwindCSS, the TailwindCSS forms plugin, and the `Inter` font.

To work on this extension, you need a recent version of Node.js and npm. If you want to run the tests, you will also need Deno. A development container is provided to simplify the development process.

To build the extension, run the following command in the root directory of the project. This will transpile the TypeScript code to JavaScript and generate the CSS files as well as as a ZIP file for the extension:

```sh
npm run build
```

For more information on debugging the extension in your browser, visit: [https://extensionworkshop.com/documentation/develop/debugging/](https://extensionworkshop.com/documentation/develop/debugging/)