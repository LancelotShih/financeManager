import React from "react";

export default function NavBar({ page, setPage }) {
  return (
    <nav style={{
      display: "flex",
      gap: 24,
      padding: "1rem 2rem",
      background: "var(--bg-card)",
      color: "var(--text-main)",
      alignItems: "center",
      marginBottom: 32,
      borderRadius: 12,
      boxShadow: "0 2px 12px 0 rgba(0,0,0,0.30)"
    }}>
      {[
        ["Dashboard", "dashboard"],
        ["Portfolio", "portfolio"],
        ["Cash", "cash"],
        ["Treasuries", "treasuries"],
        ["Retirement", "retirement"]
      ].map(([label, key]) => (
        <button
          key={key}
          onClick={() => setPage(key)}
          style={{
            background: page === key ? "#1976d2" : "transparent",
            color: page === key ? "#fff" : "var(--text-main)",
            border: "none",
            borderRadius: 8,
            padding: "0.5rem 1.2rem",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 16,
            transition: "background 0.2s, color 0.2s"
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
