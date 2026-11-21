# KING MD multi-server setup

## Registering servers
- Open **Admin → Server Fleet → Add Server**.
- Paste the public HTTPS URL of an already-deployed KING MD bot engine.
- Enter a display name and the maximum bot slots for that engine, then press **Add Server**.
- The panel saves the engine in `DATA_DIR/servers.json` and refreshes the Fleet list.
- Both `/api/admin/servers/add` and the legacy `/admin/servers/add` endpoint are supported.

The panel does not create Render services automatically. Deploy each engine separately, then register its URL. Each engine must have independent persistent WhatsApp session storage and the same private `PAIR_BRIDGE_KEY` as the panel. Never reuse one engine's auth/session directory on another engine.

## Multi-server behavior
- Pairing and QR requests try the registered engines and prefer the engine with the fewest paired bots.
- Bot counts are read from each engine's `/api/count` endpoint, with `/api/status` as a fallback for the fleet display.
- Dashboard totals combine the registered server capacities and the unique phone numbers reported by the engines.
- Removing a server from the panel only unregisters its URL; it does not delete that external engine or its WhatsApp sessions.

## Persistence
Mount persistent storage for the panel and set `DATA_DIR` to that mount path. Without persistent storage, `servers.json`, user data, and bot records can be lost when the hosting instance is replaced. The included Render blueprint uses `/var/data`.

## 24/7 operation
Render Free services can sleep when idle. A periodic ping does not guarantee continuous uptime or real-time WhatsApp event handling. For continuous message processing, run the panel and each WhatsApp engine on always-on hosting or a VPS.

## Security
Set a strong unique `JWT_SECRET`. Set a strong private `PAIR_BRIDGE_KEY` on the panel and every engine. Keep both values out of browser code and public repositories. Use HTTPS engine URLs.
