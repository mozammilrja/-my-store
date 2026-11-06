# Mobile and installable web apps (PWA)

Last updated: 2026-11-06.

Both frontends are Progressive Web Apps: they work in any modern phone,
tablet or desktop browser, and can be installed to the home screen without
an app store. There is no separate Android or iOS app.

| | Storefront (`apps/storefront`) | Operations portal (`apps/operations`) |
| --- | --- | --- |
| Manifest | `src/app/manifest.ts` → `/manifest.webmanifest` | `public/manifest.webmanifest` |
| Name on the home screen | AVELIQ | AVELIQ Ops |
| Opens at | `/in` | `/` (then the person's own workspace) |
| Shortcuts (long-press the icon) | Shop new arrivals, Your bag, Your orders | Deliveries today, Warehouse orders, Seller Hub, Admin overview |
| Icon colours | Cream background, black mark | Indigo background, white mark |
| Service worker | `public/sw.js`, registered by `src/components/pwa/pwa-register.tsx` | `public/sw.js`, registered by `src/portal/pwa.tsx` |
| Install offer | `src/components/pwa/install-prompt.tsx` | `src/portal/pwa.tsx` (banner and an "Install app" item in the account menu) |
| Offline page | `public/offline.html` | `public/offline.html`, plus a cached app shell |

Icons are generated from the brand mark by
`node apps/storefront/scripts/build-pwa-icons.mjs`. For each app it writes 192
and 512 px icons, 192 and 512 px maskable icons (the mark kept inside the 80%
safe zone), a 180 px Apple touch icon, and a 96 px notification badge.

## Installing

| Device and browser | How | What we show |
| --- | --- | --- |
| Android: Chrome, Edge, Samsung Internet | The browser's install dialog | An "Install" button that opens it |
| iPhone and iPad: Safari (iOS 16.4+ for push) | Share → Add to Home Screen; there is no install event | Step-by-step text |
| iPhone: Chrome, Firefox and other browsers | iOS only installs from Safari (and from Chrome's share menu on iOS 16.4+) | Nothing |
| Desktop: Chrome, Edge | Install icon in the address bar | The same "Install" button |
| Desktop: Firefox, Safari on macOS | Firefox can't install; Safari 17+ uses File → Add to Dock | Nothing |

When the offer appears:
- **Storefront:** after three pages or 30 seconds of browsing. Never in checkout, order or account pages. "Not now" hides it for 30 days.
- **Operations portal:** on phones and tablets only, after signing in to Warehouse, Delivery or Seller Hub. "Not now" hides it for 30 days. "Install app" stays in the account menu.

Neither appears once the app is installed.

**Installed mode:** the app opens full screen (`display: standalone`), and
`viewport-fit=cover` lets fixed bars respect the notch and home indicator
through `env(safe-area-inset-*)`.

## What the service workers cache

An allow-list. Anything not on it goes to the network and is never stored.

| | Storefront | Operations |
| --- | --- | --- |
| Content-hashed build files | `/_next/static/…` with a hash in the name, cache-first | `/assets/…` with a hash in the name, cache-first |
| Public media | `/fonts`, `/brand`, `/icons`, `/images`, `/_next/image`: stale-while-revalidate, at most 150 entries | `/fonts`, `/brand`, `/icons`: stale-while-revalidate |
| Pages | Never. They can show the shopper's name, bag and orders. | The app shell (`index.html`, identical for everyone, no data), refreshed on every online visit |
| Offline fallback | `/offline.html` | Cached shell, else `/offline.html` |

**Never cached by either:**
- the API: it is on its own origin, and both workers ignore every other origin;
- authentication responses, sessions and cookies;
- customer, order, payment, delivery and seller data;
- checkout and Razorpay;
- `/api` routes;
- every request that isn't a GET.

Only responses from this site that succeeded and set no cookie are stored.
The browser keeps these caches per site and per user profile; they are not
shared caches.

**Updates:** a new release changes the hashed file names, so old cache
entries are never served for new code. The cache names carry a version, and
older caches are deleted when the new worker activates. The operations shell
is fetched from the network first, so a new release shows on the next load.

In development neither worker caches the dev servers' unhashed files. They
register only in production builds, unless `NEXT_PUBLIC_ENABLE_SW=1`
(storefront) or `VITE_ENABLE_SW=1` (portal) is set.

## Offline and poor networks

- **Shoppers:** a page that can't load shows the offline page, which reloads by itself when the connection returns. The bag is stored on the server, so nothing is lost. Browsing, checkout and payment need a connection; we don't pretend otherwise.
- **Operations portal:**
  - A banner at the top says "You're offline" and later "Back online".
  - The installed app still opens offline from the cached shell and says it can't reach the server.
  - Anything tapped while offline (confirm delivery, record a failed attempt, start delivery) is kept and sent automatically on reconnect. The rider sees "No connection… will be sent as soon as you're back online", and the button reads "Waiting for network".
  - If a send fails mid-way, the delivery is read again from the server, because the server may already have recorded it. The form keeps what was typed, and "Try again" resends it.
  - The server refuses a second delivery of the same parcel, so retries can't double-deliver.
- **Limit:** a queued action lives in the open app. If the app is closed while offline, it is not sent. Browsers can't run it later reliably: Background Sync doesn't exist in Safari. The rider is told to keep the screen open.
- **Photos:** proof-of-delivery photos are shrunk on the phone to 1600 px JPEG at 80% before upload, so a 5-10 MB camera photo becomes about 200-400 KB.

## Camera

- **Proof of delivery:** `<input type="file" accept="image/*" capture="environment">` opens the rear camera on Android and iOS, with the gallery as the alternative.
- **Barcode scanning (warehouse):**
  - Keyboard-wedge and Bluetooth scanners work everywhere: the scan field is a text field.
  - The camera button uses the browser's Barcode Detection API where it exists (Chrome on Android, ChromeOS, macOS).
  - Elsewhere, including iPhone, iPad and desktop Linux, it uses the MIT-licensed `barcode-detector` polyfill: ZXing compiled to WebAssembly. That is about 925 KB (≈350 KB compressed), served from our own site, and fetched only the first time the camera is opened.
- **Requirements:** the camera needs HTTPS (or localhost) and the person's permission. The portal's nginx sends `Permissions-Policy: camera=(self), geolocation=(self)`; the storefront allows neither.

## Push notifications

- **Who can turn them on:** riders (Profile), warehouse staff (bell in the top bar) and shoppers (Account → Notifications). Each asks the browser's permission only when that person turns notifications on, never on page load.
- **Supported:** Android and desktop browsers support web push. iPhones and iPads do only for apps added to the home screen, on iOS 16.4 or later; in a Safari tab the controls say to install first.
- **Delivery:** through the existing VAPID web push in the API (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`). Free; no paid service. Without the keys, the controls say notifications aren't set up.

## What browsers can't do, and the alternative

| Not possible in a web app | Practical alternative |
| --- | --- |
| Rider location in the background (screen off, app closed) | Location is shared while the delivery screen is open; riders keep it open between stops. Truly continuous tracking needs a native app. |
| Sending queued actions after the app is closed (Background Sync; absent in Safari) | Actions are sent on reconnect while the app is open; riders are told to keep it open. |
| Push on iPhone without installing | Add to Home Screen first (iOS 16.4+); SMS and WhatsApp updates continue for customers and riders. |
| Install prompt on iOS, or on Firefox desktop | Written instructions (iOS); otherwise the site works in the browser as is. |
| Direct label printing to Bluetooth or USB thermal printers | Print from the browser's print dialog (labels have print CSS), or use a printer with AirPrint or Mopria. |
| Barcode scanning on very old phones without camera access or WebAssembly | Type the code, or use a handheld scanner. |
| Offline checkout or payment | Not offered: prices, stock and payment need the live server. |

## Tests

| What | Command | Covers |
| --- | --- | --- |
| Portal PWA | `npm run test:e2e:pwa` (apps/operations) | Production build:<br>- manifest and every icon's real size<br>- Chrome installability<br>- cache contents: only shell and static files, nothing from the API<br>- offline start<br>- iPhone install guidance and "Not now"<br>- Android install button<br>- sign-in, reset and account pages at 360, 375, 390, 414, 768 and 1280 px<br>- camera barcode scan through the WebAssembly decoder, with Chrome fed a fake camera showing a Code 128 slip |
| Rider offline | `npm run test:e2e:areas` (apps/operations) | Confirming a delivery with the connection dropped: it waits and says so, nothing reaches the server, then on reconnect it is sent once and the customer's OTP is consumed |
| Storefront PWA | `npm run test:e2e:pwa` (apps/storefront) | Production build:<br>- manifest and icons<br>- installability<br>- cache contents: no pages, bag, account or API<br>- offline page and recovery<br>- iPhone guidance (not in checkout)<br>- Android install button |
| Responsive | the storefront and portal responsive specs | Every route at 360, 375, 390, 414 and 768 px plus desktop |
