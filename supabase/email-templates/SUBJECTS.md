# Vela email template subject lines

Paste each subject into Supabase Dashboard -> Authentication -> Email Templates,
next to the matching HTML body.

| Template file | Supabase template | Subject line |
|---|---|---|
| confirm-signup.html | Confirm signup | Confirm your Vela account |
| reset-password.html | Reset password | Reset your Vela password |
| change-email.html | Change email address | Confirm your new email for Vela |
| magic-link.html | Magic link | Your Vela sign-in link |

All four templates use Supabase's built-in variables exactly as required:
`{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .SiteURL }}`.
