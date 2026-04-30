const DEFAULT_BASE_FOLDER = "pichunter";
const DEFAULT_MIN_FILE_SIZE_BYTES = 0;
const DEFAULT_MAX_FILE_SIZE_BYTES = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "PICHUNTER_SAVE_IMAGES") {
    return false;
  }

  saveImagesFromActiveTab()
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function saveImagesFromActiveTab() {
  const tab = await getActiveTab();
  if (!tab?.id || !tab.url) {
    throw new Error("No active tab found.");
  }

  if (!/^https?:\/\//i.test(tab.url)) {
    throw new Error("This page cannot be scanned. Open an http or https page.");
  }

  await executeContentScript(tab.id);

  const pageInfo = await sendToTab(tab.id, { type: "PICHUNTER_COLLECT_IMAGES" });
  if (!pageInfo.images.length) {
    throw new Error("No DOM images found on this page.");
  }

  const settings = await getStorage({
    baseFolder: DEFAULT_BASE_FOLDER,
    askWhereToSave: false,
    minFileSizeBytes: DEFAULT_MIN_FILE_SIZE_BYTES,
    maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES
  });
  const path = buildSavePath(tab, pageInfo, settings.baseFolder);

  return downloadImages(path, pageInfo.images, Boolean(settings.askWhereToSave), parseSizeLimits(settings));
}

async function downloadImages(path, images, saveAs, sizeLimits) {
  const results = [];
  const failures = [];
  let skippedCount = 0;
  const usedNames = new Set();

  for (const image of images) {
    try {
      const blob = await fetchImageBlob(image.url);
      if (!matchesSizeLimits(blob.size, sizeLimits)) {
        skippedCount += 1;
        continue;
      }

      const filename = `${path.baseFolder}/${path.domain}/${path.title}/${reserveFilename(usedNames, image.filename)}`;
      const downloadId = await downloadFile({
        url: await blobToDataUrl(blob),
        filename,
        conflictAction: "uniquify",
        saveAs
      });

      results.push({ downloadId, filename });
    } catch (error) {
      failures.push({ url: image.url, error: error.message });
    }
  }

  if (!results.length) {
    throw new Error(`No images were saved. Skipped ${skippedCount} image(s), failed ${failures.length} image(s).`);
  }

  return {
    count: results.length,
    failedCount: failures.length,
    skippedCount,
    firstFile: results[0]?.filename || "",
    storageMode: "downloads"
  };
}

async function fetchImageBlob(url) {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.blob();
}

function parseSizeLimits(settings) {
  const minBytes = Math.max(0, Number(settings.minFileSizeBytes) || 0);
  const maxBytes = settings.maxFileSizeBytes === null || settings.maxFileSizeBytes === undefined
    ? null
    : Math.max(0, Number(settings.maxFileSizeBytes) || 0);

  return { minBytes, maxBytes };
}

function matchesSizeLimits(size, limits) {
  if (size < limits.minBytes) {
    return false;
  }

  return limits.maxBytes === null || size <= limits.maxBytes;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image data."));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function buildSavePath(tab, pageInfo, configuredBaseFolder) {
  const baseFolder = sanitizePathPart(configuredBaseFolder || DEFAULT_BASE_FOLDER);
  const domain = sanitizePathPart(new URL(tab.url).hostname);
  const title = sanitizePathPart(pageInfo.title || tab.title || "untitled-page");

  return { baseFolder, domain, title };
}

function reserveFilename(usedNames, filename) {
  const safeName = sanitizePathPart(filename || "image.jpg");
  const dotIndex = safeName.lastIndexOf(".");
  const base = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
  const extension = dotIndex > 0 ? safeName.slice(dotIndex) : "";
  let candidate = safeName;
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${base}-${suffix}${extension}`;
    suffix += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function sanitizePathPart(value) {
  return String(value)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+$/, "untitled")
    .slice(0, 120) || "untitled";
}

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(tabs[0]);
    });
  });
}

function executeContentScript(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.executeScript(tabId, { file: "content.js" }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

function sendToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response?.ok) {
        reject(new Error(response?.error || "Content script failed."));
        return;
      }

      resolve(response.result);
    });
  });
}

function downloadFile(options) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(options, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(downloadId);
    });
  });
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
