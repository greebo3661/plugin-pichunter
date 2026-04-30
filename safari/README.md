# pichunter for Safari

## Purpose

`pichunter` saves DOM images from the active page by domain and page title.

Saved path format when the save dialog option is disabled:

```text
Downloads/<base folder>/<domain>/<page title>/<image file>
```

The default base folder is `pichunter`. Change it in the extension settings.

Safari Web Extension source must be converted and built on macOS with Xcode before it can run.

## Services and Ports

No services are started.

No ports are used.

## Access URLs

- Safari extensions: Safari `Settings` / `Preferences` -> `Extensions`
- Extension settings: popup `Settings` button or Safari extension settings.
- Saved images: Safari's configured Downloads directory, or Safari's save dialog if enabled.

## Auth Entry Points

No extension-specific login exists.

For authenticated websites, log in normally in Safari first, then run `pichunter` on the already-authenticated tab.

## Required Environment Variables

None.

## Convert and Install in Safari

1. Use macOS with Xcode installed.
2. Convert this folder into a Safari Web Extension project:

```shell
xcrun safari-web-extension-converter plugin-pichunter/safari
```

3. Open the generated Xcode project.
4. Build and run the extension host app.
5. Enable the extension in Safari `Settings` / `Preferences` -> `Extensions`.
6. Open a web page and click the extension icon.
7. Click `Save page images`.

## Use

1. Open the target page.
2. Wait until dynamic content finishes loading.
3. Click `pichunter`.
4. Optional: click `Settings`, configure the base folder inside Downloads, and enable the save dialog if needed.
5. Click `Save page images`.
6. Open the saved images under `Downloads/<base folder>/<domain>/<page title>/`, or use the save dialog destinations if enabled.

## Rebuild

The extension source is plain HTML/CSS/JavaScript, but Safari requires conversion and Xcode build steps.

After editing source files, rebuild the Safari Web Extension project in Xcode and reload the extension in Safari.

## Smoke Check

1. Convert and build the Safari Web Extension on macOS with Xcode.
2. Enable `pichunter` in Safari.
3. Open any `https://` page with visible images.
4. Click the `pichunter` extension icon.
5. Click `Save page images`.
6. Confirm image files appear under `Downloads/pichunter/<domain>/<page title>/`.
7. Open `Settings`, enable `Ask where to save each image`, run save again, and confirm Safari opens a save dialog.

## Current Limitations and Known Risks

- Safari source requires macOS/Xcode conversion before it can run.
- Safari cannot persistently reuse an arbitrary selected folder from extension settings.
- The default path is inside Safari's configured Downloads directory unless the save dialog is enabled.
- Only DOM image URLs are saved in the MVP: `img`, `srcset`, `picture source`, and simple image links.
- CSS background images, canvas content, blob-only generated images, and images inside inaccessible iframes are not saved.
- Lazy-loaded images that have not resolved to an `http` or `https` URL are not saved.
- Some sites can block direct image downloads.
- Browser-internal and restricted pages cannot be scanned.
