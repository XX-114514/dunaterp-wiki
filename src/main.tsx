import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./ui-refinements.css";
import "./pixel.css";

// The site ships with real paths. The single-file preview build in
// tools/preview has no server to rewrite unknown routes, so it opts into hash
// routing instead; nothing else differs between the two builds.
const standalone = import.meta.env.VITE_HASH_ROUTER === "1";
const Router = standalone ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router basename={standalone ? undefined : import.meta.env.BASE_URL}><App /></Router>
  </React.StrictMode>,
);
