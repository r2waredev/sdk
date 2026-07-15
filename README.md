# @r2ware/sdk

Zero-dependency JavaScript SDK for adding r2ware platform features — **forms**,
**shop**, **e-signatures**, and **sharing** — to any static website.

- **Vanilla JS, no dependencies.** No frameworks, no design systems, no icon fonts.
- **One small bundle** (~19 KB JS, ~1 KB CSS). Each widget self-gates on its own
  markup, so the SDK stays inert until a page actually uses a feature.
- **Markup-driven.** Drop in `data-r2-*` attributes; no JavaScript to write.

## Install

Load from jsDelivr at an **exact version** (never `@latest` or a range — those
let jsDelivr push surprise updates to live pages):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@r2ware/sdk@1.0.0/dist/r2ware.min.css">
<script src="https://cdn.jsdelivr.net/npm/@r2ware/sdk@1.0.0/dist/r2ware.min.js"></script>
```

Or via npm for bundled apps:

```js
import '@r2ware/sdk'          // self-initializes on load
import '@r2ware/sdk/style'    // styles
```

The bundle auto-initializes on `DOMContentLoaded`. After injecting widget markup
dynamically, call `R2.init()` again. Configure eSign via a global before the
script tag if needed:

```html
<script>window.R2_CONFIG = { esign: { timeout: 15000 } }</script>
```

## Widgets

### eSign trigger

```html
<button data-r2-esign
        data-template-id="template_abc123"
        data-document-name="Client Agreement"
        data-signer-email="client@example.com"
        data-signer-name="John Doe"
        data-redirect-url="/thank-you"
        data-metadata-order-id="1234">
  Sign Agreement
</button>
```

On click, creates a contract via `POST /api/esign/create-contract` and redirects
to the returned signing URL. `data-metadata-*` attributes become contract
metadata (`data-metadata-order-id` → `order_id`).

### Shop cart

```html
<button data-r2-add-to-cart
        data-product-id="prod_1"
        data-name="T-Shirt"
        data-price="2500"
        data-currency="usd"
        data-max-quantity="10"
        data-image-url="/img/shirt.jpg"
        data-esign-template-id="">
  Add to cart
</button>
```

Adds the item to a `localStorage` cart and shows a floating cart button that
links to the platform-served cart page (`/app/shop/cart`). Set `data-r2-cart-show`
on `<body>` to always show the cart button. Add `data-r2-checkout-success` to a
post-payment page to clear the cart.

The cart's storage API is exposed as `R2.Cart` (`getItems`, `addItem`,
`getTotals`, `clear`, …).

### Share toolbar

```html
<body data-r2-share>
```

Adds a floating share button that opens the platform's share-management modal
(`/app/share/manage`). Opt in with `data-r2-share` on `<html>` or `<body>`.

### Form uploads

```html
<form action="/app/forms/submit" method="post" data-r2-uploads>
  <input type="text" name="full_name">
  <input type="file" name="resume">
  <div data-r2-uploads-error hidden></div>
  <button type="submit">Send</button>
</form>
```

Uploads files directly to S3 via a presigned POST (`/app/forms/presign`) and
carries the resulting keys in a hidden `_attachments` field. Progressive
enhancement: without JS the text fields still submit. Override the presign
endpoint with `data-r2-uploads-url`.

## Versioning & releases

The package version is derived from the git tag at release time — pushing a
`vX.Y.Z` tag triggers the GitHub Actions `publish` workflow, which builds and
publishes to npm via **trusted publishing** (OIDC, no stored token; signed
provenance attached automatically). The `version` field in `package.json` is a
placeholder the workflow overwrites from the tag, so it is never hand-maintained
for releases.

Trusted publishing is configured on the `@r2ware/sdk` package (npmjs.com →
package Settings → trusted publisher: `r2waredev/sdk` → `publish.yml`). The
first release (`v0.1.0`) was published manually so the package would exist;
every release since then publishes from CI token-free. To cut a release:

```sh
git tag vX.Y.Z
git push origin vX.Y.Z   # triggers the publish workflow
```

## Develop

```sh
npm install
npm run build   # -> dist/r2ware.min.{js,css} (+ sourcemaps)
```

See [CONTRACT.md](CONTRACT.md) for the full hook/endpoint reference and the
mapping from the legacy (pre-SDK) markup.

## License

MIT
