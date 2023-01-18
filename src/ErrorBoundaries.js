import React from "react";

const PUBLIC_URL = process.env.PUBLIC_URL || "";
const skullImage = PUBLIC_URL + "/static/skull.png";

export class AppErrorBoundary extends React.Component {
  state = { error: null, submittedErrorId: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  async componentDidCatch(error, errorInfo) {
    const formData = new FormData();
    formData.append("error", error.toString());
    formData.append("error_info", JSON.stringify(errorInfo));
    formData.append("url", document.location.href);
    formData.append("stack", error.stack);
    try {
      if (localStorage.getItem("searched")) {
        formData.append("searched", localStorage.getItem("searched"));
      }
      if (localStorage.getItem("commentEmail")) {
        formData.append("commentEmail", localStorage.getItem("commentEmail"));
      }
    } catch (ex) {
      console.log("Unable to extract localStorage keys");
    }
    let response;
    try {
      response = await fetch("/api/errorboundary", {
        method: "POST",
        body: formData
      });
      if (response.ok) {
        const submission = await response.json();
        const submittedErrorId = submission.id;
        this.setState({ submittedErrorId });
      } else {
        console.log("Bad response trying to store error boundary.");
        console.error(response);
      }
    } catch (fetchError) {
      console.log("Unable to send error info to server.");
      console.error(fetchError);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ textAlign: "center" }}>
          <h3 style={{ color: "#b12704" }}>Application Error</h3>

          <p>
            <img alt="Skull" src={skullImage} />
          </p>
          <p>
            <b>Soooo sorry!</b>
            <br />
            It appears the application encountered a crash trying to render this
            page.
            <br />
            Please try again later or <a href="/">try another search</a>.
          </p>
          <p>
            <b>
              <a href="/">Return to home page</a>
            </b>
          </p>
          {this.state.submittedErrorId && (
            <p>
              Your error has been submitted to our server. <br />
              Submission ID: <code>{this.state.submittedErrorId}</code>
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
