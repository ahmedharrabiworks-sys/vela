export default function MissionControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#f5f5f5",
      }}
    >
      {children}
    </div>
  );
}
