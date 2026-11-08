# KING MD email/password login repair

The existing KING MD V4 visual design and app screens have been retained. Both the main website login modal and the installed-app sign-in sheet now offer email/password sign-in and account creation.

## Account behavior
- Create an account using full name, email address and a password of at least 8 characters.
- Email addresses are unique; duplicate registrations are rejected.
- Passwords are hashed with bcryptjs before storage.
- Login issues a signed 30-day token; `/api/me` returns the signed-in user's profile.
- The existing profile editing endpoints remain protected by the account token.
- No Google/GitHub client IDs, secrets, or OAuth callback setup are required.

## Render deployment
The included `render.yaml` configures the Node service, health check, generated `JWT_SECRET`, and a persistent disk mounted at `/var/data` for account storage. Deploy this ZIP/repository as the Render web service. The disk is important: without persistent storage, account records may be lost when the service restarts or is redeployed.

## Notes
The account backend stores user records in `DATA_DIR/users.json`. The local test environment used for this repair did not have npm dependencies installed, so a live HTTP integration test could not be completed here. Render will install the declared dependencies using `npm install`.
