# Refundly Regression Checklist

## Auth
- Register with valid inputs and confirm verification email is sent.
- Verify email using `verify-email.html` link and confirm dashboard access.
- Login with valid credentials and confirm session persists.
- Login with invalid credentials and confirm generic error response.
- Forgot password from `forgot-password.html` and confirm reset email flow.
- Reset password from `reset-password.html` and confirm new password works.

## Session And Security
- Confirm `GET /api/csrf-token` returns token for active session.
- Confirm protected POST endpoints reject missing/invalid CSRF token.
- Confirm logout invalidates session and redirects to public pages.
- Confirm admin and user sessions are isolated.

## Claims
- Submit claim with valid file (PDF/JPG/PNG/GIF <= 5MB).
- Attempt upload with invalid type/extension and confirm rejection.
- Attempt upload over 5MB and confirm rejection.
- Verify dashboard/history reflect newly submitted claim.

## Admin
- Admin login with valid credentials.
- View claims list and apply status update.
- Confirm status update writes entry in `claim_history`.
- Confirm non-admin requests to admin APIs are blocked.

## Docs And Operations
- Setup from `README.md` and `DEPLOYMENT.md` on a clean machine.
- Confirm environment variable names and required values are complete.
- Confirm incident checklist steps are actionable.
