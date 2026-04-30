const DEFAULT_BASE_FOLDER = "pichunter";

const form = document.getElementById("settingsForm");
const input = document.getElementById("baseFolder");
const statusElement = document.getElementById("status");
const chooseDirectoryButton = document.getElementById("chooseDirectoryButton");
const clearDirectoryButton = document.getElementById("clearDirectoryButton");
const directoryStatusElement = document.getElementById("directoryStatus");

loadSettings();
loadDirectoryStatus();

chooseDirectoryButton.addEventListener("click", chooseDirectory);
clearDirectoryButton.addEventListener("click", clearDirectory);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const baseFolder = sanitizeFolder(input.value || DEFAULT_BASE_FOLDER);
  input.value = baseFolder;

  try {
    await chrome.storage.sync.set({ baseFolder });
    setStatus("Settings saved.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

async function loadSettings() {
  const settings = await chrome.storage.sync.get({ baseFolder: DEFAULT_BASE_FOLDER });
  input.value = settings.baseFolder;
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
