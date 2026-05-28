import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { MobileNavProvider } from "./components/Layout/MobileNavContext";
import { lockdownConsoleInProduction } from "./utils/logger";

// App.js already wraps the tree with <Router> and <AuthProvider>

// SECURITY: Completely disable console output in production
// This prevents exposure of sensitive data (UUIDs, emails, tokens, user data) in DevTools
lockdownConsoleInProduction();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <MobileNavProvider>
      <App />
    </MobileNavProvider>
  </React.StrictMode>,
);
