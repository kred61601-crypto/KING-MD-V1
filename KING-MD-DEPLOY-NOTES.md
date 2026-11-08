# KING MD V4 — branding and logo update

## Included in this ZIP
- Visible EMMYHENZ V4 / EmmyHenz Bot branding in project text files changed to KING MD V4 / KING MD.
- Added `/logo.png`, `/favicon.ico`, favicon PNG sizes, Apple touch icon, and PWA icons. The screenshot showed broken logo images because the frontend requested `/logo.png`, which was absent from the supplied archive.
- Updated the web app manifest branding.

## Login status — backend still required
This archive is a frontend-only project. It contains calls to server routes such as:
- `/api/auth/google/start`
- `/api/auth/github/start`
- `/api/auth/exchange`
- `/api/me`

There is no backend server source, package manifest, or Render server configuration in the supplied ZIP. The frontend cannot create these server-side OAuth routes by itself. To make Google/GitHub sign-in work, deploy the matching backend and configure its OAuth client IDs/secrets and callback URLs as private Render environment variables. Do not put OAuth secrets in browser JavaScript.

## Deploy
Upload/deploy this updated frontend bundle to the same static/web service that serves the site. If Render is running a separate backend service, keep it running and configure the frontend's API routing/proxy to that backend as required by the backend project.
