"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const T = {
  bg: "#0a0a0a", bg2: "#111111", bg3: "#1a1a1a",
  border: "#222222",
  text: "#f5f5f5", muted: "#a3a3a3", dim: "#666666",
  accent: "#f97316", accentBg: "#f9731615",
  red: "#f87171",
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How many tenants are at risk right now?",
  "What's our theoretical MRR breakdown by plan?",
  "Which tenants have the most voice activity this month?",
  "What's our platform activity this month?",
];

export default function ExecutivePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const userMessage = text.trim();
    if (!userMessage || loading) return;

    setInput("");
    setError(null);

    const next: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/mission-control/executive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Request failed");
        setMessages(messages); // revert optimistic user message
        return;
      }

      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Network error — please try again.");
      setMessages(messages);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: T.bg, color: T.text, fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px", borderBottom: `1px solid ${T.border}`,
        background: T.bg2, display: "flex", alignItems: "center", gap: 16,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: T.muted }}>
          <Link href="/mission-control" style={{ color: T.muted, textDecoration: "none" }}>← Overview</Link>
          <span style={{ color: T.dim }}>/</span>
          <span style={{ color: T.text, fontWeight: 500 }}>Executive</span>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: T.dim }}>
          Answers from live production data only · No estimates
        </div>
      </div>

      {/* Message area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ maxWidth: 600, margin: "0 auto", paddingTop: 40 }}>
            <p style={{ fontSize: 13, color: T.dim, marginBottom: 20 }}>
              Ask anything about your platform data. All answers come from live database queries — no estimates, no invented numbers.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={loading}
                  style={{
                    background: T.bg2, border: `1px solid ${T.border}`,
                    borderRadius: 6, padding: "10px 14px", textAlign: "left",
                    fontSize: 13, color: T.muted, cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.border)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "12px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  ...(m.role === "user"
                    ? {
                        background: T.accentBg,
                        border: `1px solid ${T.accent}33`,
                        color: T.text,
                      }
                    : {
                        background: T.bg2,
                        border: `1px solid ${T.border}`,
                        color: T.text,
                      }),
                }}
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{
                background: T.bg2, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "12px 16px",
                fontSize: 12, color: T.dim,
              }}>
                Querying live data…
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: "#f871711a", border: `1px solid ${T.red}33`,
              borderRadius: 6, padding: "10px 14px",
              fontSize: 12, color: T.red,
            }}>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{
        borderTop: `1px solid ${T.border}`, background: T.bg2,
        padding: "16px 24px", flexShrink: 0,
      }}>
        <div style={{
          maxWidth: 720, margin: "0 auto",
          display: "flex", gap: 10, alignItems: "flex-end",
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your platform data…"
            rows={1}
            style={{
              flex: 1, background: T.bg3, border: `1px solid ${T.border}`,
              borderRadius: 6, padding: "10px 14px",
              fontSize: 13, color: T.text, resize: "none",
              outline: "none", fontFamily: "inherit",
              lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = T.accent)}
            onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
            disabled={loading}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            style={{
              background: input.trim() && !loading ? T.accent : T.bg3,
              border: `1px solid ${input.trim() && !loading ? T.accent : T.border}`,
              borderRadius: 6, padding: "10px 16px",
              fontSize: 13, fontWeight: 500,
              color: input.trim() && !loading ? "#fff" : T.dim,
              cursor: input.trim() && !loading ? "pointer" : "default",
              transition: "background 0.15s, border-color 0.15s",
              flexShrink: 0,
            }}
          >
            {loading ? "…" : "Send"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: T.dim, textAlign: "center", margin: "10px 0 0" }}>
          Enter to send · Shift+Enter for new line · Answers from live data only
        </p>
      </div>
    </div>
  );
}
