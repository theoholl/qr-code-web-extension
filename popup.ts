import QRCode from "./qr.js";

async function initialize() {
  const urlInput = document.getElementById("url-input") as HTMLInputElement;
  const tabUrl = await getCurrentTabUrl();
  urlInput.value = tabUrl;
  urlInput.addEventListener("change", handleInputChanged);

  updateQrCode(tabUrl);

  const closeButton = document.getElementById("close-button") as HTMLButtonElement;
  closeButton.onclick = handleClickCloseWindowButton;

  const copyButton = document.getElementById("copy-button") as HTMLButtonElement;
  copyButton.onclick = handleClickCopyUrlButton;

  const downloadButton = document.getElementById("download-button") as HTMLButtonElement;
  downloadButton.onclick = downloadQrCode;
}

async function getCurrentTabUrl() {
  const tabs = await browser.tabs.query({ active: true });
  return tabs[0].url ?? "";
}

async function handleInputChanged() {
  const urlInput = document.getElementById("url-input") as HTMLInputElement;
  const inputValue = urlInput.value;

  if (!inputValue.trim()) {
    // Reset input to original tab URL if input is empty
    const tabUrl = await getCurrentTabUrl();
    urlInput.value = tabUrl;
    updateQrCode(tabUrl);
  } else {
    updateQrCode(inputValue);
  }
}

async function updateQrCode(url: string) {
  const qrCodeContainer = document.getElementById("qr-code") as HTMLDivElement;
  const currentQrCode = qrCodeContainer?.firstElementChild as SVGElement;

  let newQrCodeElement: HTMLElement | SVGElement;
  try {
    newQrCodeElement = generateSVG(url);
    newQrCodeElement.classList.add("w-full");
  } catch (error) {
    console.error("Error generating QR code", error);
    newQrCodeElement = createErrorMessageElement(
      "URL contains unsupported characters or is too long."
    );
  }

  if (currentQrCode) {
    currentQrCode.replaceWith(newQrCodeElement);
  } else {
    qrCodeContainer.appendChild(newQrCodeElement);
  }
}

function createErrorMessageElement(message: string): HTMLElement {
  const errorElement = document.createElement("p");
  errorElement.textContent = message;
  return errorElement;
}

function generateSVG(data: string): SVGElement {
  const matrix = QRCode.generate(data);
  const n = matrix.length;
  const moduleSize = 5;
  const margin = 4;
  const size = moduleSize * (n + 2 * margin);

  const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgElement.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svgElement.setAttribute("style", "shape-rendering:crispEdges");

  const svg = [
    "<style scoped>.bg{fill:#FFF} .fg{fill:#000}</style>",
    `<rect class="bg" x="0" y="0" width="${size}" height="${size}" />`,
  ];

  let yOffset = margin * moduleSize;
  for (let y = 0; y < n; ++y) {
    let xOffset = margin * moduleSize;
    for (let x = 0; x < n; ++x) {
      if (matrix[y][x]) {
        svg.push(
          `<rect x="${xOffset}" y="${yOffset}" class="fg" width="${moduleSize}" height="${moduleSize}" />`
        );
      }
      xOffset += moduleSize;
    }
    yOffset += moduleSize;
  }

  svgElement.innerHTML = svg.join("");
  return svgElement;
}

function generatePNG(data: string) {
  const matrix = QRCode.generate(data);
  const moduleSize = 10;
  const margin = 4;
  const n = matrix.length;
  const size = moduleSize * (n + 2 * margin);

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw "Canvas support is required for PNG output";

  // White background
  context.fillStyle = "#fff";
  context.fillRect(0, 0, size, size);

  // Black foreground blocks
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

  return canvas.toDataURL();
}

function handleClickCloseWindowButton() {
  window.close();
}

function handleClickCopyUrlButton() {
  const urlInput = document.getElementById("url-input") as HTMLInputElement;
  navigator.clipboard.writeText(urlInput.value);
  temporarilyShowCheckMark();
}

async function temporarilyShowCheckMark() {
  const copyIcon = document.getElementById("copy-icon") as HTMLImageElement;
  copyIcon.src = "symbols/done.svg";

  await new Promise(() =>
    setTimeout(() => {
      copyIcon.src = "symbols/copy.svg";
    }, 1000)
  );
}

function downloadQrCode() {
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

  const a = document.createElement("a") as HTMLAnchorElement;
  a.href = dataUrl ?? "";
  a.download = `qr-code.${format}`;
  a.click();
}

initialize();
