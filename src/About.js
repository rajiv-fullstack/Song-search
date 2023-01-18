import React, { Component } from "react";
import { cachedFetch } from "./Cache";
import { FormattedNumber, ServerError, SetHTMLHeaders } from "./Common";

class About extends Component {
  state = {
    serverError: null,
    totals: (this.props.totalStats && this.props.totalStats.totals) || null
  };

  componentDidMount() {
    SetHTMLHeaders({
      title: "About - Song Search"
    });
    if (!this.state.totals) {
      return cachedFetch("/api/stats/totals-simple").then(r => {
        if (r.ok) {
          return r.json().then(results => {
            if (results) {
              this.setState({ serverError: null, totals: results.totals });
            }
          });
        } else {
          this.setState({ serverError: r });
        }
      });
    }
  }

  render() {
    const { serverError, totals } = this.state;
    return (
      <div>
        <p>
          Made by Peter Bengtsson<br/>
          For all inquires email <a href="mailto:info@songsear.ch"> info@songsear.ch</a>
        </p>
        {serverError && <ServerError />}
        {totals ? <ShowNumbers numbers={totals} /> : null}
      </div>
    );
  }
}

export default About;

function ShowNumbers({ numbers }) {
  return (
    <div className="numbers">
      <p>
        There are currently{" "}
        <b>
          <FormattedNumber value={numbers.songs} /> songs
        </b>{" "}
        to search amongst{" "}
        <b>
          <FormattedNumber value={numbers.artists} /> artists
        </b>{" "}
        in{" "}
        <b>
          <FormattedNumber value={numbers.albums} /> albums
        </b>
        .
      </p>
      <p>
        In total{" "}
        <b>
          <FormattedNumber value={numbers.searches} /> searches
        </b>{" "}
        have been made.
      </p>
    </div>
  );
}
