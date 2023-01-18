import React, { useEffect, useState } from "react";
import { Switch, Route, Link } from "react-router-dom";

import Home from "./Home";
import About from "./About";
import PrivacyPolicy from "./PrivacyPolicy";
import Song from "./Song";
import { AppErrorBoundary } from "./ErrorBoundaries";
import MuteComment from "./MuteComment";
import RecentComments from "./RecentComments";
import { isServer } from "./Common";

export function NoMatch({ location }) {
  return (
    <div>
      <h2>Page Not Found</h2>
      <h3>
        No match for <code>{location.pathname}</code>
      </h3>
    </div>
  );
}

class App extends React.Component {
  render() {
    const {
      song,
      related,
      songNotFound,
      results,
      totalStats,
      searchExamples,
      recentComments,
      recentCommentsHomepage
    } = this.props;

    let onSongPage = false;
    if (isServer) {
      if (song) {
        onSongPage = true;
      }
    } else if (/\/song\//.test(window.location.pathname)) {
      onSongPage = true;
    }

    return (
      <div>
        <div className="container">
          <div className="page-header">
            <h1>
              <Link to="/">Song Search</Link>
            </h1>
            {onSongPage ? (
              <h5 className="home-link">
                <Link to="/">Try another search</Link>
              </h5>
            ) : (
              <RotatingSubHeader />
            )}
          </div>
          <div className="container children">
            <AppErrorBoundary>
              <Switch>
                <Route
                  exact
                  path="/"
                  render={(props) => {
                    return (
                      <Home
                        {...props}
                        searchExamples={searchExamples}
                        recentComments={recentCommentsHomepage}
                      />
                    );
                  }}
                />
                <Route
                  path="/q/:q"
                  render={(props) => {
                    return <Home {...props} results={results} />;
                  }}
                />
                <Route
                  path="/song/:artist/:name/:id"
                  render={(props) => {
                    return (
                      <Song
                        {...props}
                        song={song}
                        related={related}
                        songNotFound={songNotFound}
                      />
                    );
                  }}
                />
                <Route
                  path="/about"
                  render={(props) => {
                    return <About {...props} totalStats={totalStats} />;
                  }}
                />
                <Route path="/privacy" component={PrivacyPolicy} />
                <Route
                  path="/comments"
                  exact
                  render={(props) => {
                    return (
                      <RecentComments
                        {...props}
                        recentComments={recentComments}
                      />
                    );
                  }}
                />
                <Route
                  path="/comments/p:page"
                  render={(props) => {
                    return (
                      <RecentComments
                        {...props}
                        recentComments={recentComments}
                      />
                    );
                  }}
                />
                <Route
                  path="/mute/:oid/:id"
                  render={(props) => {
                    return <MuteComment {...props} />;
                  }}
                />
                <Route component={NoMatch} />
              </Switch>
            </AppErrorBoundary>
          </div>
        </div>
        <footer className="footer">
          <div className="container">
            <p className="text-muted">
              <Link to="/">Home</Link>
              {" • "}
              <Link to="/comments">Recent comments</Link>
              {" • "}
              <Link to="/about">About this site</Link>
              {" • "}
              <Link to="/privacy">Privacy Policy</Link>
              {process.env.NODE_ENV === "development" ? (
                <span> React version {React.version}</span>
              ) : null}
            </p>
          </div>
        </footer>
      </div>
    );
  }
}

export default App;

const SUB_HEADERS = [
  "I'm looking for a song that I heard.",
  "I'm looking for a song I don't know the name of.",
  "I'm looking for a song that goes like this.",
  "Looking for a song I don't know the name of.",
  "Find me a song by lyrics."
];

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
shuffle(SUB_HEADERS);

function RotatingSubHeader() {
  const [quote, setQuote] = useState(SUB_HEADERS[0]);

  useEffect(() => {
    let dismounted = false;
    function cycle() {
      setTimeout(() => {
        if (!dismounted) {
          const nextIndex =
            (SUB_HEADERS.indexOf(quote) + 1) % SUB_HEADERS.length;
          setQuote(SUB_HEADERS[nextIndex]);
          cycle();
        }
      }, 10000);
    }
    cycle();

    return () => {
      dismounted = true;
    };
  }, [quote]);

  return <h5>“{quote}”</h5>;
}
