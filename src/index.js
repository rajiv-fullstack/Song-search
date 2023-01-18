import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import "./static/bootstrap.css";
import "./index.css";
import "./App.css";
import "./Home.css";
import "./Common.css";
import "./CarbonAds.css";

const container = document.getElementById("root");
const app = (
  <BrowserRouter>
    <React.StrictMode>
      <App
        song={window.__song__}
        related={window.__related__}
        results={window.__results__}
        songNotFound={window.__songNotFound__}
        totalStats={window.__totalStats__}
        searchExamples={window.__searchExamples__}
        recentComments={window.__recentComments__}
        recentCommentsHomepage={window.__recentCommentsHomepage__}
      />
    </React.StrictMode>
  </BrowserRouter>
);

if (container.firstElementChild) {
  if (window.origin !== "https://translate.googleusercontent.com") {
    ReactDOM.hydrate(app, container);
  }
} else {
  ReactDOM.render(app, container);
}
serviceWorkerRegistration.register();
