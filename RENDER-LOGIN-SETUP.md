# KING MD — Render login repair

## What was broken
The browser login uses Google/GitHub OAuth routes (`/api/auth/:provider/start`) and exchanges a one-time code at `/api/auth/exchange`. The old server only had placeholder `/api/auth/google` and `/api/auth/github` redirects. It did not implement `/api/me` and read only `Authorization: Bearer`, while this frontend sends `x-auth-token`.

## Deploy on Render
1. Open the existing KING MD web service.
2. Set **Root Directory** to the folder containing `package.json` (leave blank if this project folder is the repository root).
3. Set **Build Command** to `npm install` and **Start Command** to `npm start`.
4. Deploy this updated project.
5. Mount a persistent disk at `/var/data` and set `DATA_DIR=/var/data`. The included `render.yaml` describes a 1 GB disk. Persistent disks may require a paid Render plan; without one, account data can be lost after restarts/redeploys.

## Required Render environment variables
- `APP_URL` = exact public origin, e.g. `https://your-service.onrender.com` (no trailing slash)
- `JWT_SECRET` = long random secret (at least 32 characters)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `DATA_DIR` = `/var/data` when a persistent disk is mounted there

Leave a provider's credentials unset only if you do not offer that provider. Its sign-in button will show a configuration message.

## OAuth callback URLs
Google Cloud Console **Authorized redirect URI**:
`https://YOUR-DOMAIN/api/auth/google/callback`

GitHub OAuth App **Authorization callback URL**:
`https://YOUR-DOMAIN/api/auth/github/callback`

Replace `YOUR-DOMAIN` with the exact hostname in `APP_URL`. The credentials must belong to the provider app whose callback URLs you configured.

## Test
- `https://YOUR-DOMAIN/api/health` should return JSON with `"status":"ok"`.
- Use the Google/GitHub buttons from the actual website.
- OAuth cannot complete until valid provider credentials and matching callback URLs are supplied.

## Important
This repair implements the backend OAuth flow and token exchange. It cannot create provider credentials or configure external provider consoles on your behalf. Never share OAuth secrets in chat. The username/password endpoints remain for compatibility, but the current app's visible sign-in sheet is OAuth-based.
