# Public contract & migration reference

The exhaustive list of hooks, config attributes, and backend endpoints the SDK
depends on, plus the mapping from the **legacy** (pre-SDK `site` bundle)
markup. Platform templates and external sites must move to the new hooks in one
coordinated cutover (no back-compat is shipped).

## Activation hooks (markup that turns a widget on)

| Widget         | Legacy                                   | New (SDK)                  |
| -------------- | ---------------------------------------- | -------------------------- |
| eSign trigger  | `class="esign-trigger"`                  | `data-r2-esign`            |
| Add to cart    | `data-add-to-cart`                       | `data-r2-add-to-cart`      |
| Cart always-on | `data-cart-show` (on `<body>`)           | `data-r2-cart-show`        |
| Share toolbar  | `data-share` (on `<html>`/`<body>`)      | `data-r2-share`            |
| Form uploads   | `data-controller="form-uploads"`         | `data-r2-uploads`          |
| Upload error   | `data-form-uploads-target="error"`       | `data-r2-uploads-error`    |
| Upload URL     | `data-form-uploads-url-value`            | `data-r2-uploads-url`      |
| Checkout done  | `id="checkout-success"`                  | `data-r2-checkout-success` |

## Config attributes (unchanged — the documented data API)

These carry per-element configuration and are **not** renamed:

- eSign: `data-template-id`, `data-document-name`, `data-signer-email`,
  `data-signer-name`, `data-redirect-url`, `data-metadata-*`
- Add to cart: `data-product-id`, `data-name`, `data-price`, `data-currency`,
  `data-image-url`, `data-esign-template-id`, `data-max-quantity`,
  `data-customizations`

## Generated element IDs / classes

| Purpose            | Legacy                       | New                        |
| ------------------ | ---------------------------- | -------------------------- |
| Floating cart icon | `#floating-cart-icon`        | `#r2-cart-icon`            |
| Floating cart badge| `#floating-cart-badge`       | `#r2-cart-badge`           |
| Share icon         | `#share-icon`                | `#r2-share-icon`           |
| Share modal overlay| `#share-modal-overlay`       | `#r2-share-modal-overlay`  |
| eSign loading      | `.esign-loading`             | `.r2-esign-loading`        |
| eSign error msg    | `.esign-error-message`       | `.r2-esign-error-msg`      |
| Upload busy        | `.is-uploading`              | `.r2-uploading`            |
| Toolbar singleton  | `window.__floatingToolbar`   | `window.__r2FloatingToolbar` |

Bootstrap-based chrome (`alert`, `btn-close`, `spinner-border`, `bi-*` icon
fonts) is gone — replaced by scoped `.r2-toast*` styles and inline SVG icons.

## Backend endpoints (owned by the platform, unchanged)

| Widget        | Endpoint                                   |
| ------------- | ------------------------------------------ |
| eSign         | `POST /api/esign/create-contract`          |
| Cart page     | `/app/shop/cart` (platform-served page)    |
| Share modal   | `/app/share/manage` (iframe, platform-served) |
| Form presign  | `POST /app/forms/presign`                  |
| Form submit   | `POST /app/forms/submit`                   |

## Scope notes

- **Cart page** (`/app/shop/cart`) is rendered and served by the platform, not
  the SDK. It consumes `R2.Cart` (or imports `Cart` from the package) for its
  storage API, but its rendering/discount/checkout logic stays in the platform — same as
  the eSign `sign`/`complete` pages and the carousel splitter.
- The shared `discount_code` / `checkout_session_id` sessionStorage keys are
  preserved so the eSign → Stripe Checkout hop still works.

## State persistence keys (localStorage / sessionStorage)

- `cart` (localStorage) — cart contents, schema `version: 2`
- `discount_code` (sessionStorage) — applied discount, survives the eSign hop
- `checkout_session_id`, `esign_document_id` (sessionStorage) — checkout flow
