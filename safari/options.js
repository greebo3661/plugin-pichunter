const DEFAULT_BASE_FOLDER = "pichunter";

const form = document.getElementById("settingsForm");
const input = document.getElementById("baseFolder");
const askWhereToSaveInput = document.getElementById("askWhereToSave");
const statusElement = document.getElementById("status");

loadSettings();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const baseFolder = sanitizeFolder(input.value || DEFAULT_BASE_FOLDER);
  input.value = baseFolder;

  try {
    await setStorage({ baseFolder, askWhereToSave: askWhereToSaveInput.checked });
    setStatus("Settings saved.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

async function loadSettings() {
  const settings = await getStorage({ baseFolder: DEFAULT_BASE_FOLDER, askWhereToSave: false });
  input.value = settings.baseFolder;
  askWhereToSaveInput.checked = Boolean(settings.askWhereToSave);
}

function sanitizeFolder(value) {
  return String(value)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+$/, DEFAULT_BASE_FOLDER)
    .slice(0, 120) || DEFAULT_BASE_FOLDER;
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

function setStorage(values) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(values, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

function setStatus(message, className) {
  statusElement.textContent = message;
  statusElement.className = `status ${className}`.trim();
}
