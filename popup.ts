import QRCode from "./qr.js";

function handleClickCloseWindowButton() {
  window.close();
}

function handleClickCopyUrlButton() {
  const urlInput = document.getElementById("url-input") as HTMLInputElement;
  navigator.clipboard.writeText(urlInput?.value ?? "");
  temporarilyShowCheckMark();
}

async function getCurrentTabUrl() {
  const tabs = await browser.tabs.query({ active: true });
  const url = tabs[0].url ?? "";

  return url;
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

function updateQrCode() {
  const urlInput = document.getElementById("url-input") as HTMLInputElement;
  const currentQrCode = document.getElementById("qr-code")
    ?.firstElementChild as SVGElement;

  if (currentQrCode !== null) {
    const newQrCode = generateSVG(urlInput.value);
    currentQrCode.replaceWith(newQrCode);
  }
}

function downloadQrCode() {
  const format = (document.getElementById("format-select") as HTMLSelectElement)
    ?.value;

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

async function initialize() {
  const closeButton = document.getElementById(
    "close-button"
  ) as HTMLButtonElement;
  closeButton.onclick = handleClickCloseWindowButton;

  const copyButton = document.getElementById(
    "copy-button"
  ) as HTMLButtonElement;
  copyButton.onclick = handleClickCopyUrlButton;

  const urlInput = document.getElementById("url-input") as HTMLInputElement;
  urlInput.value = await getCurrentTabUrl();
  urlInput.addEventListener("change", updateQrCode);

  const qrCode = document.getElementById("qr-code") as HTMLDivElement;
  const svgQrCode = generateSVG(urlInput.value);
  qrCode.appendChild(svgQrCode);

  const downloadButton = document.getElementById(
    "download-button"
  ) as HTMLButtonElement;
  downloadButton.onclick = downloadQrCode;
}

function generateSVG(data: string): SVGElement {
  var matrix = QRCode.generate(data);
  var n = matrix.length;
  var modsize = 5;
  var margin = 4;
  var size = modsize * (n + 2 * margin);

  var common =
    ' class= "fg"' + ' width="' + modsize + '" height="' + modsize + '"/>';

  var e = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  e.setAttribute("viewBox", "0 0 " + size + " " + size);
  e.setAttribute("style", "shape-rendering:crispEdges");

  var svg = [
    "<style scoped>.bg{fill:#FFF}.fg{fill:#000}</style>",
    '<rect class="bg" x="0" y="0"',
    'width="' + size + '" height="' + size + '"/>',
  ];

  var yo = margin * modsize;
  for (var y = 0; y < n; ++y) {
    var xo = margin * modsize;
    for (var x = 0; x < n; ++x) {
      if (matrix[y][x]) svg.push('<rect x="' + xo + '" y="' + yo + '"', common);
      xo += modsize;
    }
    yo += modsize;
  }
  e.innerHTML = svg.join("");

  return e;
}

function generatePNG(data: string) {
		var matrix = QRCode.generate(data);
		var modsize = 10;
		var margin = 4;
		var n = matrix.length;
		var size = modsize * (n + 2 * margin);

		var canvas = document.createElement('canvas'), context;
		canvas.width = canvas.height = size;
		context = canvas.getContext('2d');
		if (!context) throw 'Canvas support is required for PNG output';

		context.fillStyle = '#fff';
		context.fillRect(0, 0, size, size);
		context.fillStyle = '#000';
		for (var i = 0; i < n; ++i) {
			for (var j = 0; j < n; ++j) {
				if (matrix[i][j]) {
					context.fillRect(modsize * (margin + j),
						modsize * (margin + i),
						modsize, modsize);
				}
			}
		}

		return canvas.toDataURL();
	}

initialize();
