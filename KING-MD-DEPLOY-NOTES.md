# KING MD — Render deployment

Deploy the directory containing `package.json`, `server.js`, `index.html`, and `render.yaml` as one Render **Web Service**.

- Build: `npm install`
- Start: `npm start`
- Node: 18 or newer
- Health check: `/api/health`

Configure `APP_URL`, `JWT_SECRET`, Google/GitHub OAuth credentials, and a persistent disk as described in `RENDER-LOGIN-SETUP.md`. OAuth callback URLs must match the public hostname exactly. Keep all OAuth secrets private in Render Environment settings.

The server accepts the frontend's `x-auth-token` header and Bearer tokens, provides `/api/me` and `/api/auth/exchange`, and persists user records to `DATA_DIR`.
