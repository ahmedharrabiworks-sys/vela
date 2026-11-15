"use client";
import { useFormState, useFormStatus } from "react-dom";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { sendCode, verifyCode, type LoginState } from "./actions";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button className="btn primary wide" disabled={pending}>{pending ? "One moment" : children}</button>;
}

export default function LoginForm() {
  const [sendState, send] = useFormState<LoginState, FormData>(sendCode, { step: "email" });
  const [verifyState, verify] = useFormState<LoginState, FormData>(verifyCode, { step: "code" });
  const google = () => supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });

  return (
    <div className="stack">
      <button className="btn wide" type="button" onClick={google}>Continue with Google</button>
      <div className="or"><span>or</span></div>
      {sendState.step === "code" && sendState.email ? (
        <form action={verify} className="stack">
          <p className="muted">{sendState.message} Enter the code, or open the link in the email on this device.</p>
          <input type="hidden" name="email" value={sendState.email} />
          <input name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" aria-label="Sign-in code" maxLength={10} required />
          {verifyState.error ? <p className="error">{verifyState.error}</p> : null}
          <Submit>Sign in</Submit>
        </form>
      ) : (
        <form action={send} className="stack">
          <input name="email" type="email" autoComplete="email" placeholder="you@company.com" aria-label="Email" required />
          {sendState.error ? <p className="error">{sendState.error}</p> : null}
          <Submit>Email me a sign-in code</Submit>
        </form>
      )}
    </div>
  );
}
