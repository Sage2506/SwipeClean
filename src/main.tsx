import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeProjectStorage } from "./store/projectStorage";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find the app root element.");
}

const root = ReactDOM.createRoot(rootElement);

initializeProjectStorage()
  .then(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  })
  .catch((error: unknown) => {
    console.error("Failed to initialize project storage.", error);
    const message = error instanceof Error ? error.message : String(error);
    root.render(
      <main role="alert">
        <h1>Unable to load SwipeClean data</h1>
        <p>{message}</p>
      </main>,
    );
  });
