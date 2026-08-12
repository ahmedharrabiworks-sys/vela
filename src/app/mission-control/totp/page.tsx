import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPendingCookie } from "@/lib/mission-control-auth";

export default async function McTotpPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const cookieStore = cookies();
  const pendingValue = cookieStore.get("mc_totp_pending")?.value;
  const email = pendingValue ? await verifyPendingCookie(pendingValue) : null;

  // No valid pending cookie — the OAuth step was skipped or expired
  if (!email) {
    redirect("/mission-control/login?error=session_expired");
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "24px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 4px" }}>
          Two-factor verification
        </h1>
        <p style={{ color: "#666", margin: 0, fontSize: "0.8rem" }}>
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      {searchParams.error === "invalid_code" && (
        <p
          style={{
            color: "#f87171",
            fontSize: "0.85rem",
            margin: 0,
            padding: "8px 16px",
            background: "rgba(248,113,113,0.1)",
            borderRadius: "4px",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          Invalid code. Please try again.
        </p>
      )}

      <form
        method="POST"
        action="/mission-control/totp/verify"
        style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}
      >
        <input
          name="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="000000"
          required
          autoFocus
          autoComplete="one-time-code"
          style={{
            width: "140px",
            padding: "10px 14px",
            fontSize: "1.5rem",
            letterSpacing: "0.3em",
            textAlign: "center",
            background: "#1a1a1a",
            color: "#f5f5f5",
            border: "1px solid #333",
            borderRadius: "6px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 28px",
            background: "#FF6B35",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.9rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Verify
        </button>
      </form>

      <a
        href="/mission-control/login"
        style={{ color: "#555", fontSize: "0.8rem", textDecoration: "none" }}
      >
        ← Back to login
      </a>
    </main>
  );
}
