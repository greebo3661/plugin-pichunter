# pichunter

Browser extensions for saving DOM images from the active page by domain and page title.

## Projects

- `chrome` - Chromium MV3 version for Google Chrome, Microsoft Edge, and Yandex Browser.
- `mozilla` - Firefox WebExtensions version.
- `safari` - Safari Web Extension source. It must be converted and built on macOS with Xcode.

Each browser-specific folder has its own `README.md` with installation, usage, smoke-check steps, and limitations.

## Purpose

`pichunter` scans the active page for DOM image URLs and saves them under a site/page folder.

MVP image sources:

- `img.currentSrc`
- `img.src`
- `img[srcset]`
- `picture source[srcset]`
- `a[href]` values that end with a common image extension

Chromium version can save to a selected folder:

```text
<selected folder>/<domain>/<page title>/<image file>
```

Downloads fallback path:

```text
Downloads/<base folder>/<domain>/<page title>/<image file>
```

## Services and Ports

No services are started.

No ports are used.

## Access URLs

- Chrome: `chrome://extensions`
- Edge: `edge://extensions`
- Yandex Browser: `browser://extensions`
- Firefox temporary add-ons: `about:debugging#/runtime/this-firefox`
- Safari extensions: Safari `Settings` / `Preferences` -> `Extensions`

## Auth Entry Points

No extension-specific login exists.

For authenticated websites, log in normally in the target browser first, then run `pichunter` on the already-authenticated tab.

## Required Environment Variables

None.

## Download

Git is required for the clone/update commands.

### Windows

```powershell
git clone https://github.com/greebo3661/plugin-pichunter.git
cd plugin-pichunter
```

Update an existing Windows checkout:

```powershell
git pull
```

Open the project folder from PowerShell:

```powershell
explorer .
```

### macOS

```shell
git clone https://github.com/greebo3661/plugin-pichunter.git
cd plugin-pichunter
```

Update an existing macOS checkout:

```shell
git pull
```

Open the project folder from Terminal:

```shell
open .
```

### Download Without Git

1. Open `https://github.com/greebo3661/plugin-pichunter`.
2. Click `Code`.
3. Click `Download ZIP`.
4. Extract the ZIP to a local folder.

## Install

### Windows

Chrome:

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select `plugin-pichunter\chrome`.
5. Configure folder or fallback Downloads folder name in the extension settings.

Microsoft Edge:

1. Open `edge://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select `plugin-pichunter\chrome`.
5. Configure folder or fallback Downloads folder name in the extension settings.

Yandex Browser:

1. Open `browser://extensions` or `chrome://extensions`.
2. Enable developer controls if the page shows them.
3. Click `Load unpacked extension` / `Загрузить распакованное расширение`.
4. Select `plugin-pichunter\chrome`.
5. Configure folder or fallback Downloads folder name in the extension settings.

Firefox:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on`.
3. Select `plugin-pichunter\mozilla\manifest.json`.
4. Configure the Downloads base folder and optional save dialog in the extension settings.

### macOS

Chrome / Edge / Yandex Browser:

1. Open `chrome://extensions` in Chrome, `edge://extensions` in Edge, or `browser://extensions` in Yandex Browser.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select `plugin-pichunter/chrome`.
5. Configure folder or fallback Downloads folder name in the extension settings.

Firefox:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on`.
3. Select `plugin-pichunter/mozilla/manifest.json`.
4. Configure the Downloads base folder and optional save dialog in the extension settings.

Safari:

1. Use macOS with Xcode.
2. Convert `plugin-pichunter/safari` into a Safari Web Extension project.
3. Build and enable the extension in Safari `Settings` / `Preferences` -> `Extensions`.
4. Configure the Downloads base folder and optional save dialog in the extension settings.

## Run / Rebuild / Smoke Check

No build step is required. The extensions are plain HTML/CSS/JavaScript.

After changing extension files, reload the unpacked extension on the browser extensions page.

See:

- `chrome/README.md`
- `mozilla/README.md`
- `safari/README.md`

## Current Limitations and Known Risks

- Only DOM image URLs are saved in the MVP.
- CSS background images, canvas content, blob-only generated images, and images inside inaccessible iframes are not saved.
- Lazy-loaded images that have not resolved to an `http` or `https` URL are not saved.
- Some image downloads can fail when a website blocks direct image requests, hotlinking, or authenticated image access.
- Chromium uses a folder picker where supported; otherwise images are saved under the browser Downloads directory.
- Firefox cannot persistently reuse an arbitrary selected folder from extension settings; use its save dialog option for manual destination choice.
- Safari source requires macOS/Xcode conversion before it can run. Safari also lacks Chromium's persistent folder picker.
- Browser-internal and restricted pages cannot be scanned.
