const DEFAULT_BASE_FOLDER = "pichunter";
const DEFAULT_MIN_FILE_SIZE_BYTES = 0;
const DEFAULT_MAX_FILE_SIZE_BYTES = null;
const SIZE_SLIDER_MAX = 100;
const SIZE_CURVE_MAX_BYTES = 100 * 1024 * 1024;

const form = document.getElementById("settingsForm");
const input = document.getElementById("baseFolder");
const statusElement = document.getElementById("status");
const chooseDirectoryButton = document.getElementById("chooseDirectoryButton");
const clearDirectoryButton = document.getElementById("clearDirectoryButton");
const directoryStatusElement = document.getElementById("directoryStatus");
const minFileSizeInput = document.getElementById("minFileSize");
const maxFileSizeInput = document.getElementById("maxFileSize");
const minFileSizeValue = document.getElementById("minFileSizeValue");
const maxFileSizeValue = document.getElementById("maxFileSizeValue");

loadSettings();
loadDirectoryStatus();

chooseDirectoryButton.addEventListener("click", chooseDirectory);
clearDirectoryButton.addEventListener("click", clearDirectory);
minFileSizeInput.addEventListener("input", updateSizeLabels);
maxFileSizeInput.addEventListener("input", updateSizeLabels);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const baseFolder = sanitizeFolder(input.value || DEFAULT_BASE_FOLDER);
  const minFileSizeBytes = sliderToBytes(minFileSizeInput.value, false);
  const maxFileSizeBytes = sliderToBytes(maxFileSizeInput.value, true);
  input.value = baseFolder;

  if (maxFileSizeBytes !== null && minFileSizeBytes > maxFileSizeBytes) {
    setStatus("Minimum file size cannot be greater than maximum file size.", "error");
    return;
  }

  try {
    await chrome.storage.sync.set({ baseFolder, minFileSizeBytes, maxFileSizeBytes });
    setStatus("Settings saved.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    baseFolder: DEFAULT_BASE_FOLDER,
    minFileSizeBytes: DEFAULT_MIN_FILE_SIZE_BYTES,
    maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES
  });
  input.value = settings.baseFolder;
  minFileSizeInput.value = bytesToSlider(settings.minFileSizeBytes || DEFAULT_MIN_FILE_SIZE_BYTES, false);
  maxFileSizeInput.value = bytesToSlider(settings.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES, true);
  updateSizeLabels();
}

async function chooseDirectory() {
  if (!window.showDirectoryPicker) {
    setDirectoryStatus("Folder picker is not available in this browser. Use Downloads fallback.", "error");
    return;
  }

  try {
    const directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    const permission = await directoryHandle.requestPermission({ mode: "readwrite" });

    if (permission !== "granted") {
      setDirectoryStatus("Folder permission was not granted.", "error");
      return;
    }

    await saveDirectoryHandle(directoryHandle);
    setDirectoryStatus(`Selected folder: ${directoryHandle.name}`, "success");
  } catch (error) {
    if (error.name === "AbortError") {
      setDirectoryStatus("Folder selection cancelled.", "");
      return;
    }

    setDirectoryStatus(error.message, "error");
  }
}

async function clearDirectory() {
  try {
    await deleteDirectoryHandle();
    setDirectoryStatus("Using Downloads fallback.", "success");
  } catch (error) {
    setDirectoryStatus(error.message, "error");
  }
}

async function loadDirectoryStatus() {
  try {
    const directoryHandle = await getDirectoryHandle();

    if (!directoryHandle) {
      setDirectoryStatus("No folder selected. Using Downloads fallback.", "");
      return;
    }

    const permission = await directoryHandle.queryPermission({ mode: "readwrite" });
    if (permission === "granted") {
      setDirectoryStatus(`Selected folder: ${directoryHandle.name}`, "success");
      return;
    }

    setDirectoryStatus(`Selected folder: ${directoryHandle.name}. Click "Choose folder..." to refresh permission.`, "");
  } catch (error) {
    setDirectoryStatus(error.message, "error");
  }
}

function sanitizeFolder(value) {
  return String(value)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+$/, DEFAULT_BASE_FOLDER)
    .slice(0, 120) || DEFAULT_BASE_FOLDER;
}

function updateSizeLabels() {
  minFileSizeValue.textContent = formatBytes(sliderToBytes(minFileSizeInput.value, false));
  const maxFileSizeBytes = sliderToBytes(maxFileSizeInput.value, true);
  maxFileSizeValue.textContent = maxFileSizeBytes === null ? "No limit" : formatBytes(maxFileSizeBytes);
}

function sliderToBytes(value, allowUnlimited) {
  const numericValue = Number(value);
  if (allowUnlimited && numericValue >= SIZE_SLIDER_MAX) {
    return null;
  }
  if (numericValue <= 0) {
    return 0;
  }

  const ratio = Math.min(numericValue, SIZE_SLIDER_MAX - 1) / (SIZE_SLIDER_MAX - 1);
  return Math.round(Math.pow(ratio, 2.4) * SIZE_CURVE_MAX_BYTES);
}

function bytesToSlider(bytes, allowUnlimited) {
  if (allowUnlimited && (bytes === null || bytes === undefined)) {
    return SIZE_SLIDER_MAX;
  }
  if (!bytes) {
    return 0;
  }

  const ratio = Math.pow(Math.min(bytes, SIZE_CURVE_MAX_BYTES) / SIZE_CURVE_MAX_BYTES, 1 / 2.4);
  return Math.min(SIZE_SLIDER_MAX - 1, ratio * (SIZE_SLIDER_MAX - 1));
}

function formatBytes(bytes) {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}

function setStatus(message, className) {
  statusElement.textContent = message;
  statusElement.className = `status ${className}`.trim();
}

function setDirectoryStatus(message, className) {
  directoryStatusElement.textContent = message;
  directoryStatusElement.className = `status ${className}`.trim();
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

async function saveDirectoryHandle(directoryHandle) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("settings", "readwrite");
    const store = transaction.objectStore("settings");
    const request = store.put(directoryHandle, "directoryHandle");

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
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

async function deleteDirectoryHandle() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("settings", "readwrite");
    const store = transaction.objectStore("settings");
    const request = store.delete("directoryHandle");

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
