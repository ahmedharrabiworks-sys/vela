import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  denied: "This account does not have access.",
  failed: "Sign-in did not complete. Try again.",
};

export default function LoginPage({ searchParams }: { searchParams: { e?: string } }) {
  return (
    <main className="login">
      <div className="card loginCard">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Vela" style={{ height: 32, width: "auto", alignSelf: "flex-start" }} />
        <h1>Sales dashboard</h1>
        <p className="muted">Private. Sign in with an approved account.</p>
        {searchParams.e && ERRORS[searchParams.e] ? <p className="error">{ERRORS[searchParams.e]}</p> : null}
        <LoginForm />
      </div>
    </main>
  );
}
