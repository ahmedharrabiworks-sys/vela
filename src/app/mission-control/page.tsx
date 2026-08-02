// Placeholder — middleware guarantees only allowlisted + TOTP-verified users reach here.
// Phase 1 data routes and the actual dashboard UI are built in subsequent steps.
export default function MissionControlHome() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "12px",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
        Mission Control
      </h1>
      <p style={{ color: "#888", margin: 0, fontSize: "0.875rem" }}>
        Access verified. Dashboard coming in Phase 1 Step 3.
      </p>
    </main>
  );
}
