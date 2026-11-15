# KING MD Pairing Website and WhatsApp Engine

Deploy this folder as the **website** service. It forwards pairing requests and status checks to a separate WhatsApp engine; it does not run Baileys sessions itself.

## Required website environment variables

- `ENGINE_URL`: the public base URL of the WhatsApp engine service (no trailing slash).
- `PAIR_BRIDGE_KEY`: the same private bridge key configured on the engine.
- `JWT_SECRET`: a random secret of at least 32 characters.
- `DATA_DIR`: persistent disk path (the included Render blueprint uses `/var/data`).

`pairing.config.js` supplies development defaults for `ENGINE_URL` and `PAIR_BRIDGE_KEY`; Render environment variables override those defaults. Keep the engine bridge key private and make the value identical on both services.

## Engine API contract

The engine must implement:

- `POST /api/pair` with JSON `{ "phoneNumber": "..." }`, authenticated by `x-pair-bridge-key`; it returns `{ "success": true, "pairingCode": "..." }`.
- `GET /api/status?numbers=...`, with the same header; it returns `{ "success": true, "bots": { "254...": "online" } }`. Connected states may also be reported as `connected`, `open`, `active`, or `ready`; the website normalizes these to `online`.
- `DELETE /api/session/:phone`, with the same header.

The bot must continue running in the engine after the pairing code is entered. The website cannot infer a successful WhatsApp connection merely because it generated a code; the engine's status endpoint must report the live connection state.

## Health check

The website exposes `GET /api/health`.


## QR scan mode (KING MD V4 engine)

The deploy screen also offers **QR code** mode. The app calls `POST /request-qr`; the website forwards this to the engine's authenticated `POST /api/qr` endpoint. The engine creates a WhatsApp Web QR from Baileys and returns a PNG data URL for the app to display.

The QR flow currently uses the engine's legacy single `./session` store (one QR-linked account per engine). For multiple separate bot accounts, use the existing phone-number **Pair code** flow, which stores sessions under `./sessions/<number>`.

Set the same `PAIR_BRIDGE_KEY` on the app and engine. Set `ENGINE_URL` (or `ENGINE_URLS`) on the app to the deployed KING MD V4 engine URL. Do not expose `PAIR_BRIDGE_KEY` in browser code.
