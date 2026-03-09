# Authentificator (Admin TOTP)

This document explains how to bind a TOTP authenticator (Google Authenticator, Microsoft Authenticator, Authy, etc.) to the Shello Demo admin accounts and how the flow works end-to-end.

## What This Adds

- Admin-only two-factor authentication (2FA) using TOTP.
- Secure secret storage (AES-256-GCM) on the backend.
- Admin security screen to enable/disable authenticator.
- Login challenge flow for admins (email/password or Google sign-in).

## Environment Setup

Add the following to Backend/server/.env:

```env
TWO_FACTOR_ENCRYPTION_KEY=replace-with-a-strong-random-secret
```

Generate a strong key (32+ bytes):

- Windows PowerShell:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

- Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Restart the backend after adding the key.

## Admin Flow (Enable Authenticator)

1) Log in as an admin.
2) Go to Admin → Security (`/admin/security`).
3) Click **Generate setup**.
4) Scan the QR code in your authenticator app, or enter the manual secret.
5) Enter the 6-digit code from the app and click **Verify & enable**.

Once enabled, every admin login requires a TOTP code.

## Admin Flow (Disable Authenticator)

1) Go to Admin → Security.
2) Enter a valid 6-digit code.
3) Click **Disable**.

## Login Flow (Admins)

- If an admin has 2FA enabled, login will return a `TWO_FACTOR_REQUIRED` challenge.
- The UI switches to the code prompt and verifies the TOTP code.
- On success, access and refresh tokens are issued.

### API Behavior

- `POST /api/v1/auth/login`
  - Returns tokens for non-admins.
  - Returns `TWO_FACTOR_REQUIRED` for admin accounts with 2FA enabled.

- `GET /api/v1/auth/google/callback`
  - Returns tokens for non-admins.
  - Returns `twoFactorRequired: true` payload for admin accounts with 2FA enabled.

- `POST /api/v1/auth/2fa/login`
  - Verifies the 6-digit code and completes login.

## API Endpoints

Admin-only endpoints:

- `GET /api/v1/auth/2fa/status`
- `POST /api/v1/auth/2fa/setup`
- `POST /api/v1/auth/2fa/enable`   body: `{ "code": "123456" }`
- `POST /api/v1/auth/2fa/disable`  body: `{ "code": "123456" }`

Public endpoint (login challenge):

- `POST /api/v1/auth/2fa/login`  body: `{ "token": "...", "code": "123456" }`

## Security Notes

- Secrets are encrypted with AES-256-GCM before saving to MongoDB.
- Admin-only restriction is enforced by backend role checks.
- TOTP verification uses a short time window to allow minor clock drift.

## Troubleshooting

- **TWO_FACTOR_KEY_MISSING**: Set `TWO_FACTOR_ENCRYPTION_KEY` in Backend/server/.env.
- **INVALID_TWO_FACTOR_CODE**: Check your device time sync or regenerate setup.
- **Login stuck after Google sign-in**: Ensure the popup is allowed and `/admin/security` setup is complete.

## Next Improvements (Optional)

- Backup recovery codes for admin accounts.
- Per-user 2FA (optional) instead of admin-only.
- Audit log for 2FA enable/disable events.
