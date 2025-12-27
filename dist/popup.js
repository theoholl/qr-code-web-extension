import QRCode from "./qr.js";
async function initialize() {
    // Initialize the popup by setting the URL input, generating the QR code,
    // and attaching event listeners to the buttons.
    const urlInput = document.getElementById("url-input");
    const tabUrl = await getCurrentTabUrl();
    urlInput.value = tabUrl;
    urlInput.addEventListener("change", handleInputChanged);
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
async function handleInputChanged() {
    // Handle changes to the URL input field. If the input is empty, reset it to the current tab's URL.
    const urlInput = document.getElementById("url-input");
    const inputValue = urlInput.value;
    if (!inputValue.trim()) {
        const tabUrl = await getCurrentTabUrl();
        urlInput.value = tabUrl;
        updateQrCode(tabUrl);
    }
    else {
        updateQrCode(inputValue);
    }
}
async function updateQrCode(url) {
    // Update the QR code displayed in the popup based on the provided URL.
    const qrCodeContainer = document.getElementById("qr-code");
    const currentQrCode = qrCodeContainer?.firstElementChild;
    let newQrCodeElement;
    try {
        const isDarkMode = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
        const img = document.createElement("img");
        img.alt = "QR code";
        img.src = generatePNG(url, isDarkMode);
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
function generateSVG(data, forDownload = false) {
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
        ...(forDownload ? { fill: "white" } : { class: "fill-white dark:fill-zinc-900" }),
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
                    ...(forDownload ? { fill: "black" } : { class: "fill-black dark:fill-white" }),
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
function generatePNG(data, isDarkMode) {
    const moduleColor = isDarkMode ? "#fff" : "#000";
    const backgroundColor = isDarkMode ? "#18181b" : "#fff";
    const clampRadius = (r, moduleSize) => Math.max(0, Math.min(r, moduleSize / 2));
    const drawRoundedRect = (ctx, x, y, width, height, radii) => {
        const { topLeft: topLeftRadius, topRight: topRightRadius, bottomRight: bottomRightRadius, bottomLeft: bottomLeftRadius, } = radii;
        ctx.beginPath();
        ctx.moveTo(x + topLeftRadius, y);
        ctx.lineTo(x + width - topRightRadius, y);
        if (topRightRadius > 0)
            ctx.quadraticCurveTo(x + width, y, x + width, y + topRightRadius);
        else
            ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + height - bottomRightRadius);
        if (bottomRightRadius > 0)
            ctx.quadraticCurveTo(x + width, y + height, x + width - bottomRightRadius, y + height);
        else
            ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + bottomLeftRadius, y + height);
        if (bottomLeftRadius > 0)
            ctx.quadraticCurveTo(x, y + height, x, y + height - bottomLeftRadius);
        else
            ctx.lineTo(x, y + height);
        ctx.lineTo(x, y + topLeftRadius);
        if (topLeftRadius > 0)
            ctx.quadraticCurveTo(x, y, x + topLeftRadius, y);
        else
            ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();
    };
    // Generate a PNG representation of the QR code for the given data.
    const modulesMatrix = QRCode.generate(data); // Generate the QR code matrix.
    const moduleSize = 10; // Size of each QR code module (block).
    const padding = 3; // Padding around the QR code.
    const matrixSideLength = modulesMatrix.length;
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
    context.fillStyle = moduleColor;
    const isOn = (y, x) => y >= 0 && x >= 0 && y < matrixSideLength && x < matrixSideLength && modulesMatrix[y][x];
    const baseRadius = clampRadius(Math.round(moduleSize * 0.45), moduleSize);
    for (let y = 0; y < matrixSideLength; ++y) {
        for (let x = 0; x < matrixSideLength; ++x) {
            if (!modulesMatrix[y][x])
                continue;
            // Round corners that are exposed along the two orthogonal edges.
            // Diagonal neighbors do not block rounding.
            const tl = !isOn(y - 1, x) && !isOn(y, x - 1) ? baseRadius : 0;
            const tr = !isOn(y - 1, x) && !isOn(y, x + 1) ? baseRadius : 0;
            const bl = !isOn(y + 1, x) && !isOn(y, x - 1) ? baseRadius : 0;
            const br = !isOn(y + 1, x) && !isOn(y, x + 1) ? baseRadius : 0;
            const px = moduleSize * (padding + x);
            const py = moduleSize * (padding + y);
            if (tl || tr || bl || br) {
                drawRoundedRect(context, px, py, moduleSize, moduleSize, {
                    topLeft: tl,
                    topRight: tr,
                    bottomRight: br,
                    bottomLeft: bl,
                });
            }
            else {
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
    let dataUrl;
    if (format === "png") {
        dataUrl = generatePNG(urlInput.value, false);
    }
    else if (format === "svg") {
        const newQrCode = generateSVG(urlInput.value, true);
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
