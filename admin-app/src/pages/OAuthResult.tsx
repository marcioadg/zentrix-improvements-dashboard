// Frontend result page for the OAuth popup.
//
// The edge function (`integrations-oauth-callback`) finishes the OAuth
// handshake server-side, then 302-redirects the browser here with the
// outcome encoded as query params. We render the success / failure
// card, post a message to window.opener so the chat / Settings UI can
// react, then close the popup.
//
// Why a frontend page instead of the edge function returning HTML:
// Supabase's edge gateway has been observed to rewrite Content-Type on
// HTML responses, leaving the popup rendered as plain text with mojibake'd
// UTF-8. Serving the result via Vercel sidesteps the gateway entirely.

import { useEffect } from "react";

interface Payload {
  ok: boolean;
  message: string;
  provider?: string;
  account_email?: string | null;
}

function parsePayload(): Payload {
  const params = new URLSearchParams(window.location.search);
  return {
    ok: params.get("ok") === "true",
    message: params.get("message") ?? "Connection complete.",
    provider: params.get("provider") ?? undefined,
    account_email: params.get("account_email") || null,
  };
}

export default function OAuthResult() {
  const payload = parsePayload();

  useEffect(() => {
    // Notify the opener so the chat / Settings page can refresh the
    // integration list without polling.
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: "zentrix:integration-connected", payload },
          "*",
        );
      }
    } catch {
      // Cross-origin opener access can throw; ignore — the connection
      // is already saved server-side.
    }
    // Auto-close after a beat so the user has time to read the card.
    const t = window.setTimeout(() => {
      try {
        window.close();
      } catch {
        // window.close() only works on popups; if this page was opened
        // as a top-level tab, we just stay put.
      }
    }, 1500);
    return () => window.clearTimeout(t);
  }, []);

  const color = payload.ok ? "#16a34a" : "#dc2626";
  const headline = payload.ok ? "✓ Connected" : "Connection failed";

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        margin: 0,
        background: "#fafafa",
      }}
    >
      <div
        style={{
          maxWidth: 360,
          padding: "28px 32px",
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 18,
            fontWeight: 600,
            color,
            margin: "0 0 12px",
          }}
        >
          {headline}
        </p>
        <p style={{ fontSize: 14, color: "#374151", margin: "0 0 16px" }}>
          {payload.message}
        </p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
          You can close this window.
        </p>
      </div>
    </div>
  );
}
