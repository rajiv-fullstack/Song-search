import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Waypoint } from "react-waypoint";
import { Helmet } from "react-helmet";
import {
  Loading,
  SetHTMLHeaders,
  isServer,
  YouTubeSnippet,
  SpotifySnippet,
  IntersectionLazy,
  // loadCarbonScript,
  loadAdsenseScript,
  loadAmplifiedScript,
  RenderParagraphs,
  ServerError,
  AmazonRelatedProducts,
} from "./Common";
import { cachedFetch } from "./Cache";
import { SongComments } from "./Comments";

import "./Song.css";

const PUBLIC_URL = process.env.PUBLIC_URL || "";
const placeholderImage = PUBLIC_URL + "/static/placeholder.png";
const skullImage = PUBLIC_URL + "/static/skull.png";

const NO_ADS = process.env.REACT_APP_NO_ADS === "true";

const AdTag = (props) => {
  useEffect(() => {
    if (window.cf_async === undefined) {
      window.cf_async = false;
    }
    document.getElementById("inject_ad");
    let unique_part = Math.floor(Math.random() * 999999999);
    let opts = {
      artist: props.Artistname,
      song: props.Songname,
      adunit_id: 100004858,
      div_id: "cf_async_" + unique_part,
    };
    let cf_div = document.createElement("div");
    cf_div.setAttribute("id", opts.div_id);
    document
      .getElementById("inject_ad")
      .parentNode.setAttribute("id", "ad_" + unique_part);
    document.getElementById("ad_" + unique_part).appendChild(cf_div);
    let c = function () {
      cf.showAsyncAd(opts);
    };
    if (typeof window.cf !== "undefined") c();
    else {
      cf_async = !0;
      let r = document.createElement("script"),
        s = document.getElementsByTagName("script")[0];
      r.async = !0;
      r.src = "//srv.tunefindforfans.com/fruits/apricots.js";
      r.readyState
        ? (r.onreadystatechange = function () {
            if ("loaded" == r.readyState || "complete" == r.readyState)
              (r.onreadystatechange = null), c();
          })
        : (r.onload = c);
      s.parentNode.insertBefore(r, s);
    }
  }, []);

  return (
    <>
      <div id="inject_ad"></div>
    </>
  );
};

class Song extends React.Component {
  state = {
    song: this.props.song || null,
    loading: false,
    notFound: this.props.songNotFound || false,
    serverError: null,
  };

  componentDidMount() {
    const { match } = this.props;
    const id = parseInt(match.params.id, 10);
    if (!this.state.song || this.state.song.id !== id) {
      if (!this.props.songNotFound) {
        this.loadSong(id);
      }
    }
  }

  componentWillUnmount() {
    this.dismounted = true;
  }

  componentDidUpdate(prevProps) {
    if (this.props.match.params.id !== prevProps.match.params.id) {
      this.setState(
        {
          song: null,
          loading: false,
          notFound: false,
          serverError: null,
        },
        () => {
          try {
            localStorage.removeItem("searched");
          } catch (ex) {
            console.warn("'localStorage.removeItem(\"searched\")' didn't work");
          }

          this.loadSong(this.props.match.params.id);
        }
      );
    }
  }

  loadSong(id) {
    SetHTMLHeaders({
      title: "Loading... - Song Search",
    });
    if (!isServer) {
      this.showLoadingSoon = window.setTimeout(() => {
        if (!this.dismounted) {
          if (
            !this.state.serverError &&
            !this.state.notFound &&
            !this.state.song &&
            !this.state.loading
          ) {
            this.setState({ loading: true });
          }
        }
      }, 500);
    }

    let url = `/api/song/${id}`;
    let searched = null;
    try {
      searched = localStorage.getItem("searched");
    } catch (ex) {
      console.warn("'localStorage.getItem(\"searched\")' didn't work");
    }
    if (searched) {
      if (searched.includes(",")) {
        // It *used* to be that what was stored in localStorage.searched was just the
        // search ID. Then in April 2019 this changed to become `ID,timestamp`.
        // E.g. '92613,1556152340091'. So, we need to deal with handling both
        // the new and the old.
        const timestamp = parseInt(searched.split(",")[1], 10);
        const age = (new Date().getTime() - timestamp) / 1000;
        if (age > 3600) {
          searched = null;
        } else {
          searched = searched.split(",")[0];
        }
      }
      if (searched) {
        url += `?searched=${encodeURIComponent(searched)}`;
      }
    }

    return cachedFetch(url).then((r) => {
      if (!isServer && this.showLoadingSoon) {
        window.clearTimeout(this.showLoadingSoon);
      }
      if (r.status === 400) {
        return r.json().then((result) => {
          this.setState({ loading: false });
          if (result.error && result.error === "redirected") {
            if (isServer) {
              this.setState({ notFound: true });
            } else {
              document.location.href = result.new_url;
            }
          } else {
            // Some other error
            this.setState({ serverError: true });
          }
        });
      } else if (r.status === 404) {
        this.setState({ loading: false, notFound: true });
        SetHTMLHeaders({ title: "Not Found" });
      } else if (r.status === 500) {
        this.setState({ loading: false, serverError: true });
        SetHTMLHeaders({ title: "Song loading error :(" });
      } else {
        return r.json().then((result) => {
          if (result && !result.error) {
            this.renderResult(result);
          } else if (result && result.error) {
            console.log("ERROR:", result.error);
          }
          // if (searched) {
          //   localStorage.removeItem("searched");
          // }
          return result;
        });
      }
    });
  }

  renderResult(result) {
    // Make sure this matches server/render.js
    let title = `${result.song.name} lyrics by ${result.song.artist.name}`;
    if (!isServer) {
      SetHTMLHeaders({
        title: title,
        image: result.song.image,
      });
    }
    this.setState({
      loading: false,
      song: result.song,
    });
  }

  render() {
    const { loading, song, serverError, notFound } = this.state;

    return (
      <div>
        {loading && <Loading text="Loading..." />}
        {song && <Result song={song} />}

        {serverError && !song && <ServerError />}
        {notFound && <NotFound />}
      </div>
    );
  }
}

function Result({ song }) {
  // useEffect(() => {
  //   // loadCarbonScript();
  // }, []);

  let searchedId;

  if (!isServer) {
    let searched = null;
    try {
      searched = localStorage.getItem("searched");
    } catch (ex) {
      console.warn("'localStorage.getItem(\"searched\")' didn't work");
    }

    if (searched) {
      if (searched.includes(",")) {
        // The new way
        searchedId = parseInt(searched.split(",")[0], 10);
      } else {
        // The old way!
        searchedId = parseInt(searched, 10);
      }
    }
  }

  let comments = null;
  let commentsCount = null;
  if (song.comments) {
    comments = song.comments.comments;
    commentsCount = song.comments.comments_count;
  }

  return (
     <div className="result song oka">
        <RenderSongHead song={song} />
        {/* {!NO_ADS ? <div id="carbonadsouter" /> : <span id="_nocardonads" />} */}
        <RenderParagraphs song={song.id} text={song.text_html} />

        {!NO_ADS && <AmplifiedSnippet song={song} />}

        <SongComments
          comments={comments}
          commentsCount={commentsCount}
          song={song}
          searchedId={searchedId}
        />
        <ShareSong song={song} />
        <AmazonRelatedProducts song={song} />
        {!isServer ? (
          <IntersectionLazy render={() => <SpotifySnippet song={song} />} />
        ) : null}
        {!isServer ? (
          <IntersectionLazy render={() => <YouTubeSnippet song={song} />} />
        ) : null}
        {!isServer ? <ShowRelated song={song} /> : null}
      </div>
  );
}

function AmplifiedSnippet({ song }) {
  useEffect(() => {
    loadAmplifiedScript({ song: song.name, artist: song.artist.name });
  }, [song]);

  return (
    <div id="amplifiedouter">
      <div className="null-hide" id="amplified_100003500" />
    </div>
  );
}

function ShareSong({ song }) {
  const [showShare, setShowShare] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState(null);
  useEffect(() => {
    if (navigator.share) {
      setShowShare(true);
    }
  }, []);
  if (!showShare) return null;

  return (
    <div style={{ margin: "30px 0", textAlign: "center" }}>
      <button
        className="btn btn-primary"
        onClick={() => {
          const shareData = {
            title: song.name,
            text: `I found '${song.name}' on Song Search!`,
            url: window.location.href,
          };
          try {
            navigator
              .share(shareData)
              .then(() => {
                setShared(true);
                setShareError(null);
              })
              .catch((e) => {
                setShareError(e);
              })
              .finally(() => {
                fetch(`/api/song/${song.id}/shared/`, {
                  method: "POST",
                });
              });
          } catch (err) {
            setShareError(err);
          }
        }}
      >
        {shared ? "Thanks!" : "Share this song"}
      </button>
      {shareError && <p>Sharing failed or was canceled. Oh well.</p>}
    </div>
  );
}

// XXX Check if this React.memo works
const RenderSongHead = React.memo(({ song }) => {
  let image = null;
  if (song.image) {
    image = (
      <img
        src={song.image.url}
        alt={song.image.name}
        className="song-picture"
      />
    );
  } else {
    image = (
      <img
        src={placeholderImage}
        alt={song.artist.name}
        width={150}
        height={150}
      />
    );
  }
  let albums = null;
  if (song.albums.length) {
    let albumNames = song.albums
      .map((a) => {
        if (a.year) {
          return `${a.name} (${a.year})`;
        } else {
          return a.name;
        }
      })
      .join(", ");
    albums = (
      <h3>
        <span className="by">on</span> {albumNames}
      </h3>
    );
  }
  return (
    <>
      <div className="text-center last">
        {image}
        <h2 className="">{song.name}</h2>
        <h3>
          <span className="by">by</span> {song.artist.name}
        </h3>
        {albums}
        <AdTag Songname={song.name} Artistname={song.artist.name} />
      </div>
    </>
  );
});

const ShowRelated = React.memo(({ song }) => {
  const [related, setRelated] = useState(null);
  const [loading, setLoading] = useState(false);

  const mounted = React.useRef(false);

  useEffect(() => {
    if (loading && related) {
      setLoading(false);
    }
  }, [related, loading]);

  function loadRelated() {
    const url = `/api/song/${song.id}/related`;
    return cachedFetch(url).then((r) => {
      if (r.ok) {
        r.json().then((result) => {
          if (result && result.categories) {
            setRelated(result.categories);
          }
        });
      }
    });
  }

  const _started = useRef();

  function loadRelatedDebounced() {
    if (!_started.current) {
      _started.current = new Date().getTime();
      loadRelated();
    }
  }

  function onEnter() {
    if (!related && !loading) {
      loadRelatedDebounced();
    }
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (related) {
    if (!related.length) {
      return null;
    }
    return (
      <div className="related">
        {related.map((category) => {
          return (
            <ShowRelatedGroup
              key={category.label}
              label={category.label}
              songs={category.results}
            />
          );
        })}
      </div>
    );
  } else if (loading) {
    return null;
  }
  return <Waypoint onEnter={onEnter} />;
});

function ShowRelatedGroup({ label, songs }) {
  return (
    <div>
      <h4>{label}</h4>
      <ul>
        {songs.map((song) => {
          return (
            <li key={song.id}>
              <Link to={song._url}>
                <b>{song.name}</b> <span className="by">by</span>{" "}
                {song.artist.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NotFound() {
  return (
    <div className="not-found">
      <h3>Song Not Found</h3>
      <p>
        <img alt="Skull" src={skullImage} />
      </p>
      <p>
        <Link to="/">Try another search</Link>
      </p>
    </div>
  );
}

export default Song;
