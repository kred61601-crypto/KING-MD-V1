# KING MD V4 — Login and AI configuration

## What changed
- Google and GitHub OAuth credentials can now be saved from `/admin-oauth-settings.html` by a signed-in KING MD administrator.
- The credentials are written to `data/private-provider-config.json` on the server. They are never returned by the status API or embedded in browser JavaScript.
- OAuth callback URLs are derived from the active request host (unless the existing `APP_URL` value is already set), so the app does not require a new `APP_URL` Render variable.
- The AI assistant checks the private saved Groq key first, then the existing `GROQ_API_KEY` environment setting as a backward-compatible fallback.
- The existing email/password account system and both Google/GitHub login buttons are preserved.

## First-time setup (inside the app)
1. Sign in to KING MD V4 using an existing administrator account.
2. Open `https://YOUR-DOMAIN/admin-oauth-settings.html`.
3. Register Google and GitHub OAuth apps with the callback URLs displayed on that page.
4. Paste the provider Client ID and Client Secret into the matching fields and save.
5. Optionally paste a Groq API key to enable generative AI replies. Without an AI provider key, the built-in support assistant remains available but cannot provide unrestricted generative AI.

## Important provider requirement
Google and GitHub do not let an application invent its own OAuth Client ID or Client Secret. These must be created in the provider developer consoles. The app stores and uses them without requiring you to add new Render environment variables.

## Storage warning
Credentials are saved under `DATA_DIR` (defaults to this project's `data/` folder). The included `render.yaml` already declares a persistent disk mounted at `/var/data` and sets `DATA_DIR` to that path when the service is deployed from the blueprint. If your existing Render service was not created from that blueprint or does not have that disk attached, its local filesystem may be ephemeral and settings can be lost on redeploy; persistent storage is required for long-term retention. This is a hosting storage limitation, not something an app code change can bypass.

## Security
- Never commit `data/private-provider-config.json` to a public repository.
- The server blocks public HTTP access to `/data/*`.
- Only administrator-authenticated API requests can save provider credentials.
