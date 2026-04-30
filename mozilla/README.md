# pichunter for Firefox

## Purpose

`pichunter` saves DOM images from the active page by domain and page title.

Saved path format when the save dialog option is disabled:

```text
Downloads/<base folder>/<domain>/<page title>/<image file>
```

The default base folder is `pichunter`. Change it in the extension settings.

Firefox extensions cannot persistently select an arbitrary output folder from settings. Enable the save dialog option to choose a destination manually for each image.

The settings page includes minimum and maximum file size sliders. The default is no filtering: minimum `0 B`, maximum `No limit`.

## Services and Ports

No services are started.

No ports are used.

## Access URLs

- Firefox temporary add-ons: `about:debugging#/runtime/this-firefox`
- Extension settings: popup `Settings` button or the add-on details page.
- Saved images: Firefox's configured Downloads directory, or Firefox's save dialog if enabled.

## Auth Entry Points

No extension-specific login exists.

For authenticated websites, log in normally in Firefox first, then run `pichunter` on the already-authenticated tab.

## Required Environment Variables

None.

## Install in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on`.
3. Select this file: `plugin-pichunter\mozilla\manifest.json`.
4. Pin `pichunter` if needed.
5. Open a web page and click the extension icon.
6. Click `Save page images`.

## Use

1. Open the target page.
2. Wait until dynamic content finishes loading.
3. Click `pichunter`.
4. Optional: click `Settings`, configure the base folder inside Downloads, and enable the save dialog if needed.
5. Optional: adjust the minimum and maximum file size sliders.
6. Click `Save page images`.
7. Open the saved images under `Downloads/<base folder>/<domain>/<page title>/`, or use the save dialog destinations if enabled.

## Rebuild

No build step is required. The extension is plain HTML/CSS/JavaScript.

After editing files, reload the temporary add-on on `about:debugging#/runtime/this-firefox`.

## Smoke Check

1. Open any `https://` page with visible images.
2. Click the `pichunter` extension icon.
3. Click `Save page images`.
4. Confirm image files appear under `Downloads/pichunter/<domain>/<page title>/`.
5. Open `Settings`, set a minimum size that excludes small icons, run save again, and confirm fewer files are saved or skipped by size.
6. Enable `Ask where to save each image`, run save again, and confirm Firefox opens a save dialog.

## Current Limitations and Known Risks

- Firefox cannot persistently reuse an arbitrary selected folder from extension settings.
- The default path is always inside Firefox's configured Downloads directory unless the save dialog is enabled.
- Only DOM image URLs are saved in the MVP: `img`, `srcset`, `picture source`, and simple image links.
- CSS background images, canvas content, blob-only generated images, and images inside inaccessible iframes are not saved.
- Lazy-loaded images that have not resolved to an `http` or `https` URL are not saved.
- Some sites can block direct image downloads.
- File size filtering requires fetching image data before saving, so blocked image requests are reported as failed.
- Browser-internal and restricted pages such as `about:` pages and Mozilla add-on pages cannot be scanned.
