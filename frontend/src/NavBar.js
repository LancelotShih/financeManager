import React from "react";

export default function NavBar({ page, setPage }) {
  return (
    <nav style={{
      display: "flex",
      gap: 24,
      padding: "1rem 2rem",
      background: "#222",
      color: "#fff",
      alignItems: "center",
      marginBottom: 32,
      borderRadius: 12
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
            background: page === key ? "#fff" : "#222",
            color: page === key ? "#222" : "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.5rem 1.2rem",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 16
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
