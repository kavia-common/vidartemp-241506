import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import EstateOverview from "./views/EstateOverview.jsx";
import SystemExplorer from "./views/SystemExplorer.jsx";
import AmendmentConsole from "./views/AmendmentConsole.jsx";
import GovernanceTraceView from "./views/GovernanceTraceView.jsx";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"            element={<EstateOverview />} />
          <Route path="/systems"     element={<SystemExplorer />} />
          <Route path="/governance-trace" element={<GovernanceTraceView />} />
          <Route path="/amendments"  element={<AmendmentConsole />} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
