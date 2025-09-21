import React, { useState } from "react";
import NavBar from "./NavBar";
import { Page } from "./pages";

function App() {
  const [page, setPage] = useState("dashboard");
  return (
    <div>
      <NavBar page={page} setPage={setPage} />
      <div style={{ padding: 32 }}>
        <Page page={page} />
      </div>
    </div>
  );
}

export default App;
