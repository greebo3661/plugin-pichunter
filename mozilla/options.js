const DEFAULT_BASE_FOLDER = "pichunter";
const DEFAULT_MIN_FILE_SIZE_BYTES = 0;
const DEFAULT_MAX_FILE_SIZE_BYTES = null;
const SIZE_SLIDER_MAX = 100;
const SIZE_CURVE_MAX_BYTES = 100 * 1024 * 1024;

const form = document.getElementById("settingsForm");
const input = document.getElementById("baseFolder");
const askWhereToSaveInput = document.getElementById("askWhereToSave");
const statusElement = document.getElementById("status");
const minFileSizeInput = document.getElementById("minFileSize");
const maxFileSizeInput = document.getElementById("maxFileSize");
const minFileSizeValue = document.getElementById("minFileSizeValue");
const maxFileSizeValue = document.getElementById("maxFileSizeValue");

loadSettings();

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
    await setStorage({ baseFolder, askWhereToSave: askWhereToSaveInput.checked, minFileSizeBytes, maxFileSizeBytes });
    setStatus("Settings saved.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

async function loadSettings() {
  const settings = await getStorage({
    baseFolder: DEFAULT_BASE_FOLDER,
    askWhereToSave: false,
    minFileSizeBytes: DEFAULT_MIN_FILE_SIZE_BYTES,
    maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES
  });
  input.value = settings.baseFolder;
  askWhereToSaveInput.checked = Boolean(settings.askWhereToSave);
  minFileSizeInput.value = bytesToSlider(settings.minFileSizeBytes || DEFAULT_MIN_FILE_SIZE_BYTES, false);
  maxFileSizeInput.value = bytesToSlider(settings.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES, true);
  updateSizeLabels();
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
