import QRCode from "./qr.js";

async function initialize() {
  // Initialize the popup by setting the URL input, generating the QR code,
  // and attaching event listeners to the buttons.
  const urlInput = document.getElementById("url-input") as HTMLInputElement;
  const tabUrl = await getCurrentTabUrl();
  urlInput.value = tabUrl;
  urlInput.addEventListener("change", handleInputChanged);

  updateQrCode(tabUrl);

  const closeButton = document.getElementById("close-button") as HTMLButtonElement;
  closeButton.onclick = handleClickCloseWindowButton;

  const copyButton = document.getElementById("copy-button") as HTMLButtonElement;
  copyButton.onclick = handleClickCopyUrlButton;
  copyButton.setAttribute("aria-label", "Copy URL");

  const downloadButton = document.getElementById("download-button") as HTMLButtonElement;
  downloadButton.onclick = downloadQrCode;
}

async function getCurrentTabUrl() {
  // Retrieve the URL of the currently active browser tab.
  const tabs = await browser.tabs.query({ active: true });
  return tabs[0].url ?? "";
}

async function handleInputChanged() {
  // Handle changes to the URL input field. If the input is empty, reset it to the current tab's URL.
  const urlInput = document.getElementById("url-input") as HTMLInputElement;
  const inputValue = urlInput.value;

  if (!inputValue.trim()) {
    const tabUrl = await getCurrentTabUrl();
    urlInput.value = tabUrl;
    updateQrCode(tabUrl);
  } else {
    updateQrCode(inputValue);
  }
}

async function updateQrCode(url: string) {
  // Update the QR code displayed in the popup based on the provided URL.
  const qrCodeContainer = document.getElementById("qr-code") as HTMLDivElement;
  const currentQrCode = qrCodeContainer?.firstElementChild as SVGElement;

  let newQrCodeElement: HTMLElement | SVGElement;
  try {
    newQrCodeElement = generateSVG(url);
    newQrCodeElement.classList.add("w-full");
  } catch (error) {
    console.error("Error generating QR code:", error);
    newQrCodeElement = createErrorMessageElement(
      "The URL contains unsupported characters or is too long."
    );
  }

  if (currentQrCode) {
    currentQrCode.replaceWith(newQrCodeElement);
  } else {
    qrCodeContainer.appendChild(newQrCodeElement);
  }
}

function createErrorMessageElement(message: string): HTMLElement {
  // Create an error message element to display when QR code generation fails.
  const errorElement = document.createElement("p");
  errorElement.textContent = message;
  return errorElement;
}

function generateSVG(data: string): SVGElement {
  // Generate an SVG representation of the QR code for the given data.
  const matrix = QRCode.generate(data); // Generate the QR code matrix.
  const n = matrix.length;
  const moduleSize = 5; // Size of each QR code module (block).
  const margin = 4; // Margin around the QR code.
  const size = moduleSize * (n + 2 * margin); // Total size of the SVG.

  // Create the root SVG element.
  const svgElement = createSvgElement("svg", {
    viewBox: `0 0 ${size} ${size}`,
    style: "shape-rendering:crispEdges",
  });

  // Add a style element for QR code colors.
  const styleElement = createSvgElement("style", { scoped: "" });
  styleElement.textContent = ".bg{fill:#FFF} .fg{fill:#000}";
  svgElement.appendChild(styleElement);

  // Add a white background rectangle.
  const backgroundRect = createSvgElement("rect", {
    class: "bg",
    x: "0",
    y: "0",
    width: `${size}`,
    height: `${size}`,
  });
  svgElement.appendChild(backgroundRect);

  // Add black rectangles for each "on" module in the QR code matrix.
  let yOffset = margin * moduleSize;
  for (let y = 0; y < n; ++y) {
    let xOffset = margin * moduleSize;
    for (let x = 0; x < n; ++x) {
      if (matrix[y][x]) {
        const rect = createSvgElement("rect", {
          x: `${xOffset}`,
          y: `${yOffset}`,
          class: "fg",
          width: `${moduleSize}`,
          height: `${moduleSize}`,
        });
        svgElement.appendChild(rect);
      }
      xOffset += moduleSize;
    }
    yOffset += moduleSize;
  }

  return svgElement;
}

function createSvgElement(tag: string, attributes: Record<string, string>): SVGElement {
  // Helper function to create an SVG element with the specified attributes.
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

function generatePNG(data: string): string {
  // Generate a PNG representation of the QR code for the given data.
  const matrix = QRCode.generate(data); // Generate the QR code matrix.
  const moduleSize = 10; // Size of each QR code module (block).
  const margin = 4; // Margin around the QR code.
  const n = matrix.length;
  const size = moduleSize * (n + 2 * margin); // Total size of the canvas.

  // Create a canvas element to draw the QR code.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw "Canvas support is required for PNG output";

  // Draw a white background.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, size, size);

  // Draw black rectangles for each "on" module in the QR code matrix.
  context.fillStyle = "#000";
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      if (matrix[i][j]) {
        context.fillRect(
          moduleSize * (margin + j),
          moduleSize * (margin + i),
          moduleSize,
          moduleSize
        );
      }
    }
  }

  // Return the QR code as a data URL.
  return canvas.toDataURL();
}

function handleClickCloseWindowButton() {
  // Close the popup window when the close button is clicked.
  window.close();
}

function handleClickCopyUrlButton() {
  // Copy the URL from the input field to the clipboard and show a temporary checkmark.
  const urlInput = document.getElementById("url-input") as HTMLInputElement;
  navigator.clipboard.writeText(urlInput.value);
  temporarilyShowCheckMark();
}

async function temporarilyShowCheckMark() {
  // Temporarily replace the copy icon with a checkmark icon to indicate success.
  const copyIcon = document.getElementById("copy-icon") as HTMLImageElement;
  copyIcon.src = "symbols/done.svg";

  await new Promise(() =>
    setTimeout(() => {
      copyIcon.src = "symbols/copy.svg";
    }, 1000)
  );
}

function downloadQrCode() {
  // Download the QR code in the selected format (PNG or SVG).
  const format = (document.getElementById("format-select") as HTMLSelectElement)?.value;

  const urlInput = document.getElementById("url-input") as HTMLInputElement;
  let dataUrl;

  if (format === "png") {
    dataUrl = generatePNG(urlInput.value);
  } else if (format === "svg") {
    const newQrCode = generateSVG(urlInput.value);
    const svgString = new XMLSerializer().serializeToString(newQrCode);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    dataUrl = URL.createObjectURL(blob);
  }

  // Create a temporary anchor element to trigger the download.
  const a = document.createElement("a") as HTMLAnchorElement;
  a.href = dataUrl ?? "";
  a.download = `qr-code.${format}`;
  a.click();
}

initialize();
