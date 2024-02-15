function handleClickCloseWindowButton() {
    window.close();
}

function handleClickCopyUrlButton() {
    const urlInput = document.getElementById("url-input");
    navigator.clipboard.writeText(urlInput.value);
    temporarilyShowCheckMark();
}

async function getCurrentTabUrl() {
    const tabs = await browser.tabs.query({ active: true });
    const url = tabs[0].url ?? "";
    
    return url;
}

async function temporarilyShowCheckMark() {
    const copyIcon = document.getElementById("copy-icon");
    copyIcon.src = "symbols/done.svg";

    await new Promise(() => setTimeout(
        () => {
            copyIcon.src = "symbols/copy.svg";
        }, 1000)
    );
}

function updateQrCode() {
    const urlInput = document.getElementById("url-input");
    const currentQrCode = document.getElementById("qr-code").firstElementChild;

    if (currentQrCode !== null) {
        const newQrCode = QRCode.generateSVG(urlInput.value);
        currentQrCode.replaceWith(newQrCode);
    }
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