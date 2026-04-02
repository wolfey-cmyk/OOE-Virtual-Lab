import React from "react";
import ReactDOM from "react-dom/client";
import LaserGame from "./components/LaserGame";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LaserGame />
  </React.StrictMode>,
);
