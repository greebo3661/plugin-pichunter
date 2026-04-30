if (!window.__pichunterContentLoaded) {
  window.__pichunterContentLoaded = true;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "PICHUNTER_COLLECT_IMAGES") {
      return false;
    }

    try {
      sendResponse({ ok: true, result: collectPageImages() });
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }

    return false;
  });
}

function collectPageImages() {
  const urls = new Map();

  for (const image of document.images) {
    addImageUrl(urls, image.currentSrc || image.src);
    addSrcset(urls, image.srcset);
  }

  for (const source of document.querySelectorAll("picture source[srcset], source[srcset]")) {
    addSrcset(urls, source.getAttribute("srcset"));
  }

  for (const link of document.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href");
    if (isImageUrl(href)) {
      addImageUrl(urls, href);
    }
  }

  return {
    title: document.title || "untitled-page",
    url: location.href,
    images: Array.from(urls.values()).map((url, index) => ({
      url,
      filename: buildImageFilename(url, index)
    }))
  };
}

function addSrcset(urls, srcset) {
  if (!srcset) {
    return;
  }

  for (const candidate of srcset.split(",")) {
    const url = candidate.trim().split(/\s+/)[0];
    addImageUrl(urls, url);
  }
}

function addImageUrl(urls, value) {
  const absoluteUrl = toAbsoluteHttpUrl(value);
  if (!absoluteUrl) {
    return;
  }

  urls.set(absoluteUrl, absoluteUrl);
}

function toAbsoluteHttpUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, location.href);
    if (!/^https?:$/i.test(url.protocol)) {
      return null;
    }

    return url.href;
  } catch (error) {
    return null;
  }
}

function isImageUrl(value) {
  const absoluteUrl = toAbsoluteHttpUrl(value);
  if (!absoluteUrl) {
    return false;
  }

  return /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(absoluteUrl);
}

function buildImageFilename(url, index) {
  const extension = getImageExtension(url);
  const fallbackName = `image-${String(index + 1).padStart(3, "0")}${extension}`;

  try {
    const pathname = new URL(url).pathname;
    const lastPart = decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "");
    const sanitized = sanitizeFilename(lastPart);

    if (sanitized && /\.[a-z0-9]+$/i.test(sanitized)) {
      return sanitized;
    }
  } catch (error) {
    return fallbackName;
  }

  return fallbackName;
}

function getImageExtension(url) {
  const match = String(url).match(/\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#].*)?$/i);
  return match ? `.${match[1].toLowerCase()}` : ".jpg";
}

function sanitizeFilename(value) {
  return String(value)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+$/, "image")
    .slice(0, 120);
}
