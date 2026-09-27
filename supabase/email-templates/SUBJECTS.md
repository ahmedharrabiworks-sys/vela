# Vela email template subject lines

Paste each subject into Supabase Dashboard -> Authentication -> Email Templates,
next to the matching HTML body. Re-paste all 4 bodies too -- v2 (this round)
replaces the raw fallback link with a 6-digit code hero + a one-tap
token_hash link to /auth/confirm, unifies on Inter, and drops the support
email footer line.

| Template file | Supabase template | Subject line |
|---|---|---|
| confirm-signup.html | Confirm signup | Your Vela code: {{ .Token }} |
| reset-password.html | Reset password | Your Vela code: {{ .Token }} |
| change-email.html | Change email address | Confirm your new email for Vela |
| magic-link.html | Magic link | Your Vela code: {{ .Token }} |

All four templates now use `{{ .Token }}` (the 6-digit code) and
`{{ .TokenHash }}` (the one-tap link's query param) instead of
`{{ .ConfirmationURL }}` -- requires Email OTP to be enabled with a 6-digit
length in Supabase Auth settings (already configured this round: length 6,
expiry 900s). `change-email.html` also uses `{{ .NewEmail }}`.
