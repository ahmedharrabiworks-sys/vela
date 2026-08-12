import { McLoginButton } from "./McLoginButton";

const ERROR_MESSAGES: Record<string, string> = {
  no_code:           "Authentication failed. No code received.",
  auth_failed:       "Authentication failed. Please try again.",
  not_authorized:    "Access denied.",
  oauth_init_failed: "Could not start sign-in. Try again.",
  session_expired:   "Session expired. Please sign in again.",
};

export default function McLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMessage = searchParams.error
    ? (ERROR_MESSAGES[searchParams.error] ?? "An error occurred.")
    : null;

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
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 4px" }}>
          Mission Control
        </h1>
        <p style={{ color: "#666", margin: 0, fontSize: "0.8rem" }}>
          Restricted access
        </p>
      </div>

      {errorMessage && (
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
          {errorMessage}
        </p>
      )}

      <McLoginButton />
    </main>
  );
}
