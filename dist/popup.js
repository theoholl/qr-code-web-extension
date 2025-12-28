import QRCode from "./qr.js";
async function initialize() {
    // Initialize the popup by setting the URL input, generating the QR code,
    // and attaching event listeners to the buttons.
    const urlInput = document.getElementById("url-input");
    const tabUrl = await getCurrentTabUrl();
    urlInput.value = tabUrl;
    urlInput.addEventListener("input", handleInputUpdated);
    urlInput.addEventListener("blur", handleInputBlur);
    updateQrCode(tabUrl);
    const closeButton = document.getElementById("close-button");
    closeButton.onclick = handleClickCloseWindowButton;
    const copyButton = document.getElementById("copy-button");
    copyButton.onclick = handleClickCopyUrlButton;
    copyButton.setAttribute("aria-label", "Copy URL");
    const downloadButton = document.getElementById("download-button");
    downloadButton.onclick = downloadQrCode;
}
async function getCurrentTabUrl() {
    // Retrieve the URL of the currently active browser tab.
    const tabs = await browser.tabs.query({ active: true });
    return tabs[0].url ?? "";
}
function handleInputUpdated() {
    // Update the QR code on each input change.
    const urlInput = document.getElementById("url-input");
    updateQrCode(urlInput.value);
}
async function handleInputBlur() {
    // If the user leaves the field empty, reset it to the current tab's URL.
    const urlInput = document.getElementById("url-input");
    if (urlInput.value.trim())
        return;
    const tabUrl = await getCurrentTabUrl();
    urlInput.value = tabUrl;
    updateQrCode(tabUrl);
}
async function updateQrCode(url) {
    // Update the QR code displayed in the popup based on the provided URL.
    const qrCodeContainer = document.getElementById("qr-code");
    const trimmedUrl = url.trim();
    // Hide any output when the field is empty.
    if (!trimmedUrl) {
        qrCodeContainer.replaceChildren();
        return;
    }
    const currentQrCode = qrCodeContainer?.firstElementChild;
    const isDarkMode = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
    let newQrCodeElement;
    try {
        const img = document.createElement("img");
        img.alt = "QR code";
        img.src = generatePNG(trimmedUrl, "transparent", isDarkMode ? "#fff" : "#27272a", true);
        img.classList.add("w-full");
        newQrCodeElement = img;
    }
    catch (error) {
        console.error("Error generating QR code:", error);
        newQrCodeElement = createErrorMessageElement("The URL contains unsupported characters or is too long.");
    }
    if (currentQrCode) {
        currentQrCode.replaceWith(newQrCodeElement);
    }
    else {
        qrCodeContainer.appendChild(newQrCodeElement);
    }
}
function createErrorMessageElement(message) {
    // Create an error message element to display when QR code generation fails.
    const errorElement = document.createElement("p");
    errorElement.textContent = message;
    return errorElement;
}
function generateSVG(data) {
    // Generate an SVG representation of the QR code for the given data.
    const matrix = QRCode.generate(data); // Generate the QR code matrix.
    const n = matrix.length;
    const moduleSize = 10; // Size of each QR code module (block).
    const size = moduleSize * (n + 2); // Total size of the SVG.
    // Create the root SVG element.
    const svgElement = createSvgElement("svg", {
        viewBox: `0 0 ${size} ${size}`,
        style: "shape-rendering:crispEdges",
    });
    // Add a white background rectangle.
    const backgroundRect = createSvgElement("rect", {
        x: "0",
        y: "0",
        width: `${size}`,
        height: `${size}`,
        fill: "white",
    });
    svgElement.appendChild(backgroundRect);
    // Add black rectangles for each "on" module in the QR code matrix.
    let yOffset = moduleSize;
    for (let y = 0; y < n; ++y) {
        let xOffset = moduleSize;
        for (let x = 0; x < n; ++x) {
            if (matrix[y][x]) {
                const rect = createSvgElement("rect", {
                    x: `${xOffset}`,
                    y: `${yOffset}`,
                    width: `${moduleSize}`,
                    height: `${moduleSize}`,
                    fill: "black",
                });
                svgElement.appendChild(rect);
            }
            xOffset += moduleSize;
        }
        yOffset += moduleSize;
    }
    return svgElement;
}
function createSvgElement(tag, attributes) {
    // Helper function to create an SVG element with the specified attributes.
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
    return element;
}
function generatePNG(data, backgroundColor, qrModuleColor, withRoundedCorners) {
    // Generate a PNG representation of the QR code for the given data.
    const modulesMatrix = QRCode.generate(data); // Generate the QR code matrix.
    const moduleSize = 10; // Size of each QR code module (block).
    const padding = 3; // Padding around the QR code.
    const matrixSideLength = modulesMatrix.length;
    // Ratio of the resolution in physical pixels to the resolution in CSS pixels used for scaling the image
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    // Total matrix size: size of a module * number of modules + padding on both sides.
    const matrixSize = moduleSize * (matrixSideLength + 2 * padding); // Total size of the canvas.
    // Create a canvas element to draw the QR code.
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = matrixSize * dpr;
    const context = canvas.getContext("2d");
    if (!context)
        throw "Canvas support is required for PNG output";
    // Draw in CSS pixel coordinates, scaled to device pixels.
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Draw a background.
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, matrixSize, matrixSize);
    // Draw modules for the QR code matrix.
    context.fillStyle = qrModuleColor;
    const isOn = (y, x) => y >= 0 && x >= 0 && y < matrixSideLength && x < matrixSideLength && modulesMatrix[y][x];
    // Clamp radius to be between 0 and half the module size.
    const clampRadius = (r, moduleSize) => Math.max(0, Math.min(r, moduleSize / 2));
    // Base radius for rounded corners.
    const baseRadius = withRoundedCorners
        ? clampRadius(Math.round(moduleSize * 0.45), moduleSize)
        : 0;
    const drawRoundedRect = (ctx, x, y, width, height, radii) => {
        // Start to draw a path, begin in the top-left corner.
        ctx.beginPath();
        ctx.moveTo(x + radii.topLeft, y);
        // Move to the top-right corner.
        ctx.lineTo(x + width - radii.topRight, y);
        if (radii.topRight > 0)
            ctx.quadraticCurveTo(x + width, y, x + width, y + radii.topRight);
        else
            ctx.lineTo(x + width, y);
        // Move to the bottom-right corner.
        ctx.lineTo(x + width, y + height - radii.bottomRight);
        if (radii.bottomRight > 0)
            ctx.quadraticCurveTo(x + width, y + height, x + width - radii.bottomRight, y + height);
        else
            ctx.lineTo(x + width, y + height);
        // Move to the bottom-left corner.
        ctx.lineTo(x + radii.bottomLeft, y + height);
        if (radii.bottomLeft > 0)
            ctx.quadraticCurveTo(x, y + height, x, y + height - radii.bottomLeft);
        else
            ctx.lineTo(x, y + height);
        // Move to the top-left corner to close the rectangle.
        ctx.lineTo(x, y + radii.topLeft);
        if (radii.topLeft > 0)
            ctx.quadraticCurveTo(x, y, x + radii.topLeft, y);
        else
            ctx.lineTo(x, y);
        // Close the path and fill the rectangle.
        ctx.closePath();
        ctx.fill();
    };
    for (let y = 0; y < matrixSideLength; ++y) {
        for (let x = 0; x < matrixSideLength; ++x) {
            if (!modulesMatrix[y][x])
                continue;
            // Round corners that are exposed along the two orthogonal edges.
            const tl = !isOn(y - 1, x) && !isOn(y, x - 1) ? baseRadius : 0;
            const tr = !isOn(y - 1, x) && !isOn(y, x + 1) ? baseRadius : 0;
            const bl = !isOn(y + 1, x) && !isOn(y, x - 1) ? baseRadius : 0;
            const br = !isOn(y + 1, x) && !isOn(y, x + 1) ? baseRadius : 0;
            const px = moduleSize * (padding + x);
            const py = moduleSize * (padding + y);
            if (tl || tr || bl || br) {
                // Draw rectangle with rounded corners
                drawRoundedRect(context, px, py, moduleSize, moduleSize, {
                    topLeft: tl,
                    topRight: tr,
                    bottomRight: br,
                    bottomLeft: bl,
                });
            }
            else {
                // Draw rectangle without rounded corners
                context.fillRect(px, py, moduleSize, moduleSize);
            }
        }
    }
    // Return the QR code as a data URL.
    return canvas.toDataURL("image/png");
}
function handleClickCloseWindowButton() {
    // Close the popup window when the close button is clicked.
    window.close();
}
function handleClickCopyUrlButton() {
    // Copy the URL from the input field to the clipboard and show a temporary checkmark.
    const urlInput = document.getElementById("url-input");
    navigator.clipboard.writeText(urlInput.value);
    temporarilyShowCheckMark();
}
async function temporarilyShowCheckMark() {
    // Temporarily replace the copy icon with a checkmark icon to indicate success.
    const copySymbolContainer = document.getElementById("copy-symbol-container");
    const doneSymbolContainer = document.getElementById("done-symbol-container");
    copySymbolContainer.classList.toggle("hidden", true);
    doneSymbolContainer.classList.toggle("hidden", false);
    await new Promise(() => setTimeout(() => {
        copySymbolContainer.classList.toggle("hidden", false);
        doneSymbolContainer.classList.toggle("hidden", true);
    }, 1000));
}
function downloadQrCode() {
    // Download the QR code in the selected format (PNG or SVG).
    const format = document.getElementById("format-select")?.value;
    const urlInput = document.getElementById("url-input");
    const trimmedUrl = urlInput.value.trim();
    if (!trimmedUrl)
        return;
    let dataUrl;
    if (format === "png") {
        dataUrl = generatePNG(trimmedUrl, "#fff", "#000", false);
    }
    else if (format === "svg") {
        const newQrCode = generateSVG(trimmedUrl);
        const svgString = new XMLSerializer().serializeToString(newQrCode);
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        dataUrl = URL.createObjectURL(blob);
    }
    // Create a temporary anchor element to trigger the download.
    const a = document.createElement("a");
    a.href = dataUrl ?? "";
    a.download = `qr-code.${format}`;
    a.click();
}
initialize();
