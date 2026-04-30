const DEFAULT_BASE_FOLDER = "pichunter";

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

  const settings = await getStorage({ baseFolder: DEFAULT_BASE_FOLDER, askWhereToSave: false });
  const path = buildSavePath(tab, pageInfo, settings.baseFolder);

  return downloadImages(path, pageInfo.images, Boolean(settings.askWhereToSave));
}

async function downloadImages(path, images, saveAs) {
  const results = [];
  const failures = [];
  const usedNames = new Set();

  for (const image of images) {
    try {
      const filename = `${path.baseFolder}/${path.domain}/${path.title}/${reserveFilename(usedNames, image.filename)}`;
      const downloadId = await downloadFile({
        url: image.url,
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
    throw new Error(`No images were saved. Failed ${failures.length} image(s).`);
  }

  return {
    count: results.length,
    failedCount: failures.length,
    firstFile: results[0]?.filename || "",
    storageMode: "downloads"
  };
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
