const DEFAULT_BASE_FOLDER = "pichunter";

const saveButton = document.getElementById("saveButton");
const optionsButton = document.getElementById("optionsButton");
const statusElement = document.getElementById("status");
const savePathElement = document.getElementById("savePath");

init();

async function init() {
  const settings = await chrome.storage.sync.get({ baseFolder: DEFAULT_BASE_FOLDER });
  const directoryHandle = await getDirectoryHandle().catch(() => null);

  if (directoryHandle && await hasReadWritePermission(directoryHandle)) {
    savePathElement.textContent = `${directoryHandle.name}/<domain>/<page title>/`;
  } else {
    savePathElement.textContent = `Downloads/${settings.baseFolder}/<domain>/<page title>/`;
  }

  saveButton.addEventListener("click", saveImages);
  optionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
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

function setBusy(isBusy) {
  saveButton.disabled = isBusy;
  optionsButton.disabled = isBusy;
}

function setStatus(message, className) {
  statusElement.textContent = message;
  statusElement.className = `status ${className}`.trim();
}

async function hasReadWritePermission(directoryHandle) {
  if (!directoryHandle.queryPermission) {
    return false;
  }

  return (await directoryHandle.queryPermission({ mode: "readwrite" })) === "granted";
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pichunter", 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore("settings");
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getDirectoryHandle() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("settings", "readonly");
    const store = transaction.objectStore("settings");
    const request = store.get("directoryHandle");

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}
