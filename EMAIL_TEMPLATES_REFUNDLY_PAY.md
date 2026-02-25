# Refundly Pay - Supabase Email Templates

Use these in Supabase Authentication -> Email Templates.

Important: Supabase templates require a public logo URL.  
Use this currently live logo URL in templates:

`https://www.refundlypay.com/assets/refundly-logo.jpg`

## Confirm Signup

Subject:

`Confirm your Refundly Pay account`

Body:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Confirm your email</title>
  </head>
  <body style="margin:0;padding:0;background:#f2f7f4;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(2,6,23,.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#0b1f17 0%,#14532d 55%,#10b981 100%);padding:20px 24px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="https://www.refundlypay.com/assets/refundly-logo.jpg" alt="Refundly Pay" style="height:34px;vertical-align:middle;border:0;">
                    </td>
                    <td align="right" style="color:#d1fae5;font-size:12px;font-weight:600;vertical-align:middle;">
                      Secure Account Access
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 26px 8px 26px;">
                <span style="display:inline-block;background:#ecfdf5;border:1px solid #86efac;color:#166534;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;">
                  One-time verification
                </span>
                <h1 style="margin:16px 0 10px 0;font-size:30px;line-height:1.2;color:#0f172a;">Confirm your email</h1>
                <p style="margin:0 0 18px 0;font-size:15px;line-height:1.75;color:#334155;">
                  Welcome to Refundly Pay. Verify your email to activate your account and continue securely.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 26px 10px 26px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#10b981);color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-size:15px;font-weight:800;">
                  Verify Email
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 26px 24px 26px;">
                <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;line-height:1.6;">
                  If the button does not work, open this link:
                </p>
                <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.65;">
                  <a href="{{ .ConfirmationURL }}" style="color:#0f766e;text-decoration:none;">{{ .ConfirmationURL }}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Reset Password

Subject:

`Reset your Refundly Pay password`

Body:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Reset password</title>
  </head>
  <body style="margin:0;padding:0;background:#f2f7f4;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(2,6,23,.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#0b1f17 0%,#166534 55%,#10b981 100%);padding:20px 24px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="https://www.refundlypay.com/assets/refundly-logo.jpg" alt="Refundly Pay" style="height:34px;vertical-align:middle;border:0;">
                    </td>
                    <td align="right" style="color:#d1fae5;font-size:12px;font-weight:600;vertical-align:middle;">
                      Security Notice
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 26px 8px 26px;">
                <span style="display:inline-block;background:#f0fdf4;border:1px solid #86efac;color:#166534;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;">
                  Password reset request
                </span>
                <h1 style="margin:16px 0 10px 0;font-size:30px;line-height:1.2;color:#0f172a;">Reset your password</h1>
                <p style="margin:0 0 18px 0;font-size:15px;line-height:1.75;color:#334155;">
                  We received a request to reset your Refundly Pay password. Continue below to set a new one.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 26px 10px 26px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#10b981);color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-size:15px;font-weight:800;">
                  Reset Password
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 26px 24px 26px;">
                <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;line-height:1.6;">
                  If the button does not work, open this link:
                </p>
                <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.65;">
                  <a href="{{ .ConfirmationURL }}" style="color:#0f766e;text-decoration:none;">{{ .ConfirmationURL }}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```
