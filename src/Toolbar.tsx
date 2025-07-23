import React from "react";
import ReactDOM from "react-dom/client";
import { ClipToolbar } from "./components/ClipToolbar";
import "./globals.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <ClipToolbar />
  </React.StrictMode>
);
