function handleClickCloseWindowButton() {
    window.close();
}

function handleClickCopyUrlButton() {
    const urlInput = document.getElementById("url-input");
    navigator.clipboard.writeText(urlInput.value);
}

async function getCurrentTabUrl() {
    const tabs = await browser.tabs.query({ active: true });
    const url = tabs[0].url ?? "";
    
    return url;
}

function updateQrCode() {
    const urlInput = document.getElementById("url-input");
    const qrCode = document.getElementById("qr-code");
    const oldHtmlTable = document.getElementsByClassName("qrcode")[0];
    const newhtmlTable = QRCode.generateSVG(urlInput.value);
    qrCode.replaceChild(newhtmlTable, oldHtmlTable);
}

async function initialize() {
    const closeButton = document.getElementById("close-button");
    closeButton.onclick = handleClickCloseWindowButton;

    const copyButton = document.getElementById("copy-button");
    copyButton.onclick = handleClickCopyUrlButton;

    const urlInput = document.getElementById("url-input");
    urlInput.value = await getCurrentTabUrl();
    urlInput.addEventListener("change", updateQrCode);

    const qrCode = document.getElementById("qr-code");
    const htmlTable = QRCode.generateSVG(urlInput.value);
    qrCode.appendChild(htmlTable);
}

initialize();