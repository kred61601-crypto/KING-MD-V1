# Render setup

1. Create/update the Render Web Service using this project and the included `render.yaml`.
2. Ensure the persistent disk in `render.yaml` is attached at `/var/data`.
3. Deploy. Render installs the dependencies and starts `node server.js`.
4. Check `https://YOUR-SERVICE.onrender.com/api/health` for `{ "status": "ok" }`.
5. Open the site, choose Sign In / Sign Up, create an account with name, email and password, then sign out and sign in again to verify it.

No Google or GitHub OAuth credentials are required. Keep the generated `JWT_SECRET` private and do not remove the persistent disk if you want accounts to survive deploys.
