const DEFAULT_BASE_FOLDER = "pichunter";

const saveButton = document.getElementById("saveButton");
const optionsButton = document.getElementById("optionsButton");
const statusElement = document.getElementById("status");
const savePathElement = document.getElementById("savePath");

init();

async function init() {
  const settings = await getStorage({ baseFolder: DEFAULT_BASE_FOLDER, askWhereToSave: false });
  savePathElement.textContent = settings.askWhereToSave
    ? "Safari save dialog/<domain>/<page title>/"
    : `Downloads/${settings.baseFolder}/<domain>/<page title>/`;

  saveButton.addEventListener("click", saveImages);
  optionsButton.addEventListener("click", openOptionsPage);
}

async function saveImages() {
  setBusy(true);
  setStatus("Saving images from the active page...", "");

  chrome.runtime.sendMessage({ type: "PICHUNTER_SAVE_IMAGES" }, (response) => {
    setBusy(false);

    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message, "error");
      return;
    }

    if (!response?.ok) {
      setStatus(response?.error || "Save failed.", "error");
      return;
    }

    const failedText = response.result.failedCount
      ? ` Failed: ${response.result.failedCount}.`
      : "";
    const skippedText = response.result.skippedCount
      ? ` Skipped by size: ${response.result.skippedCount}.`
      : "";
    setStatus(`Saved ${response.result.count} image(s).${skippedText}${failedText} First: ${response.result.firstFile}`, "success");
  });
}

function openOptionsPage() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
    return;
  }

  window.open(chrome.runtime.getURL("options.html"));
}

function getStorage(defaults) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(defaults, (settings) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(settings);
    });
  });
}

function setBusy(isBusy) {
  saveButton.disabled = isBusy;
  optionsButton.disabled = isBusy;
}

function setStatus(message, className) {
  statusElement.textContent = message;
  statusElement.className = `status ${className}`.trim();
}
