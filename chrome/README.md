# pichunter for Chrome / Edge / Yandex Browser

## Purpose

`pichunter` saves DOM images from the active page by domain and page title.

If a folder is selected in settings, saved path format:

```text
<selected folder>/<domain>/<page title>/<image file>
```

If no folder is selected, fallback saved path format:

```text
Downloads/<base folder>/<domain>/<page title>/<image file>
```

The default fallback base folder is `pichunter`. Change it in the extension settings.

## Services and Ports

No services are started.

No ports are used.

## Access URLs

- Chrome extensions: `chrome://extensions`
- Microsoft Edge extensions: `edge://extensions`
- Yandex Browser extensions: `browser://extensions`
- Extension settings: popup `Settings` button or the browser extension details page.
- Saved images: selected folder from settings, or the browser's configured Downloads directory as fallback.

## Auth Entry Points

No extension-specific login exists.

For authenticated websites, log in normally in the target browser first, then run `pichunter` on the already-authenticated tab.

## Required Environment Variables

None.

## Install in Google Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder: `plugin-pichunter\chrome`.
5. Pin `pichunter` if needed.
6. Open a web page and click the extension icon.
7. Click `Save page images`.

## Install in Microsoft Edge

1. Open `edge://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder: `plugin-pichunter\chrome`.
5. Pin `pichunter` if needed.
6. Open a web page and click the extension icon.
7. Click `Save page images`.

## Install in Yandex Browser

1. Open `browser://extensions`.
2. Enable `Developer mode`, if the page shows it.
3. Click `Load unpacked extension` / `Загрузить распакованное расширение`.
4. Select this folder: `plugin-pichunter\chrome`.
5. Pin or open `pichunter` from the extensions menu.
6. Open a web page and click the extension icon.
7. Click `Save page images`.

If `browser://extensions` does not show developer controls, try `chrome://extensions`; Yandex Browser supports many Chromium extension URLs.

## Use

1. Open the target page.
2. Wait until dynamic content finishes loading.
3. Click `pichunter`.
4. Optional: click `Settings`, then `Choose folder...` to select the image root directory through the system folder picker.
5. Click `Save page images`.
6. Open the saved images under `<selected folder>/<domain>/<page title>/`, or under `Downloads/<base folder>/<domain>/<page title>/` if no folder is selected.

## Rebuild

No build step is required. The extension is plain HTML/CSS/JavaScript.

After editing files, reload the unpacked extension on the browser extensions page.

## Smoke Check

1. Open any `https://` page with visible images.
2. Click the `pichunter` extension icon.
3. Open `Settings` and click `Choose folder...`.
4. Select a local folder and grant write permission.
5. Confirm the popup shows `<selected folder>/<domain>/<page title>/`.
6. Click `Save page images`.
7. Confirm image files appear under `<selected folder>/<domain>/<page title>/`.
8. Click `Use Downloads folder`, run save again, and confirm the Downloads fallback is used.

## Current Limitations and Known Risks

- Folder selection uses the Chromium File System Access API. If folder permission is revoked or unavailable, the extension falls back to the browser Downloads directory.
- The Downloads fallback path is a subfolder inside the browser Downloads directory.
- Only DOM image URLs are saved in the MVP: `img`, `srcset`, `picture source`, and simple image links.
- CSS background images, canvas content, blob-only generated images, and images inside inaccessible iframes are not saved.
- Lazy-loaded images that have not resolved to an `http` or `https` URL are not saved.
- Direct folder writes fetch image URLs from the extension context; some sites can block those requests.
- Browser-internal pages such as `chrome://`, `edge://`, `browser://`, the Chrome Web Store, and pages that block scripting cannot be scanned.
