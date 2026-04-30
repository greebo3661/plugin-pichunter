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
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error("No active tab found.");
  }

  if (!/^https?:\/\//i.test(tab.url)) {
    throw new Error("This page cannot be scanned. Open an http or https page.");
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
  });

  const pageInfo = await sendToTab(tab.id, { type: "PICHUNTER_COLLECT_IMAGES" });
  if (!pageInfo.images.length) {
    throw new Error("No DOM images found on this page.");
  }

  const path = await buildSavePath(tab, pageInfo);
  const directoryHandle = await getStoredDirectoryHandle();

  if (directoryHandle && await hasReadWritePermission(directoryHandle)) {
    return saveImagesToDirectory(directoryHandle, path, pageInfo.images);
  }

  return downloadImages(path, pageInfo.images, false);
}

async function saveImagesToDirectory(rootHandle, path, images) {
  const domainHandle = await rootHandle.getDirectoryHandle(path.domain, { create: true });
  const pageHandle = await domainHandle.getDirectoryHandle(path.title, { create: true });
  const results = [];
  const failures = [];
  const usedNames = new Set();

  for (const image of images) {
    try {
      const filename = await reserveDirectoryFilename(pageHandle, usedNames, image.filename);
      const response = await fetch(image.url, { credentials: "include" });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const fileHandle = await pageHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(await response.blob());
      await writable.close();
      results.push(`${rootHandle.name}/${path.domain}/${path.title}/${filename}`);
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
    firstFile: results[0],
    storageMode: "directory"
  };
}

async function downloadImages(path, images, saveAs) {
  const results = [];
  const failures = [];
  const usedNames = new Set();

  for (const image of images) {
    try {
      const filename = `${path.baseFolder}/${path.domain}/${path.title}/${reserveFilename(usedNames, image.filename)}`;
      const downloadId = await chrome.downloads.download({
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

async function buildSavePath(tab, pageInfo) {
  const settings = await chrome.storage.sync.get({ baseFolder: DEFAULT_BASE_FOLDER });
  const baseFolder = sanitizePathPart(settings.baseFolder || DEFAULT_BASE_FOLDER);
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

async function reserveDirectoryFilename(directoryHandle, usedNames, filename) {
  const safeName = sanitizePathPart(filename || "image.jpg");
  let candidate = safeName;
  const dotIndex = candidate.lastIndexOf(".");
  const base = dotIndex > 0 ? candidate.slice(0, dotIndex) : candidate;
  const extension = dotIndex > 0 ? candidate.slice(dotIndex) : "";
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase()) || await fileExists(directoryHandle, candidate)) {
    candidate = `${base}-${suffix}${extension}`;
    suffix += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

async function fileExists(directoryHandle, filename) {
  try {
    await directoryHandle.getFileHandle(filename);
    return true;
  } catch (error) {
    if (error.name === "NotFoundError") {
      return false;
    }

    throw error;
  }
}

function sanitizePathPart(value) {
  return String(value)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+$/, "untitled")
    .slice(0, 120) || "untitled";
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

async function getStoredDirectoryHandle() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pichunter", 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore("settings");
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("settings", "readonly");
      const store = transaction.objectStore("settings");
      const getRequest = store.get("directoryHandle");

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => resolve(getRequest.result || null);
    };
  });
}

async function hasReadWritePermission(directoryHandle) {
  if (!directoryHandle.queryPermission) {
    return false;
  }

  return (await directoryHandle.queryPermission({ mode: "readwrite" })) === "granted";
}
