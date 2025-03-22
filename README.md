# QR code browser extension

This browser extension generates a QR code for the currently open browser tab that can be scanned with a QR code-enabled device or downloaded to print or share.

![Screenshot of the browser extension](screenshot.png)

# Working on this extension

All you need for working on this extension is a recent version of Node.js and npm. If you want to execute the tests, you need Deno as well. To make it easier to work on this extension, you can use the provided development container.

To transpile the TypeScript code to JavaScript and generate the CSS files, run:

```sh
npm run build
```

See this page for more information on how to debug the extension in your browser: [https://extensionworkshop.com/documentation/develop/debugging/](https://extensionworkshop.com/documentation/develop/debugging/)