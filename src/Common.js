import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TimeAgo from "react-timeago";
import { Waypoint } from "react-waypoint";
import useSWR from "swr";

import { cachedFetch } from "./Cache";

const PUBLIC_URL = process.env.PUBLIC_URL || "";
// const itunesAppImage = PUBLIC_URL + "/static/itunes-app-icon.png";
const skullImage = PUBLIC_URL + "/static/skull.png";

export const isServer = typeof document === "undefined";

const defaultHTMLHeaders = {
  title: "Song Search - Find Songs by Lyrics",
  image: isServer
    ? null
    : document.querySelector('meta[itemprop="image"]').content
};

export const SetHTMLHeaders = function ({ title, image = null }) {
  if (isServer) {
    console.warn("SetHTMLHeaders should not be called in server mode");
    return;
  }
  /* Only set when it's different */
  if (title !== document.title) {
    document.title = title;
  }
  let ogtitle = document.querySelector('meta[property="og:title"]');
  if (ogtitle.content !== title) {
    ogtitle.content = title;
  }

  let itemtitle = document.querySelector('meta[itemprop="name"]');
  if (itemtitle !== title) {
    itemtitle.content = title;
  }
  let img = document.querySelector('meta[itemprop="image"]');
  if (img.content !== image) {
    img.content = image;
  }
};

export const ResetHTMLHeaders = function () {
  SetHTMLHeaders(defaultHTMLHeaders);
};

export const Loading = ({ text }) => {
  return (
    <div className="loading" title={text}>
      <div className="cssload-wrapper">
        <div className="cssload-square" />
        <div className="cssload-square" />
        <div className="cssload-square" />
        <div className="cssload-square" />
        <div className="cssload-square" />
      </div>
      <p>{text}</p>
    </div>
  );
};

export function FormattedNumber({ value }) {
  return value.toLocaleString();
}

export function AmazonRelatedProducts({ song }) {
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (page > 1) {
      setLoadingMore(true);
    }
  }, [page]);

  useEffect(() => {
    let mounted = true;
    let url = `/api/song/${song.id}/amazon?v=5`;
    if (page > 1) {
      url += `&page=${page}`;
    }
    fetch(url).then((r) => {
      if (!mounted) return;
      if (r.ok) {
        r.json().then((result) => {
          setResult(result);
          setLoadingMore(false);
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, [song, page]);

  function loadMore() {
    setPage(page + 1);
  }

  if (!result || !result.items.length) {
    return null;
  }
  const { items, total } = result;
  return (
    <div className="amazon-related-products">
      <h4>Relevant on Amazon.com</h4>
      {items.map((item) => (
        <AmazonRelatedItem key={item.asin || item.ASIN} item={item} />
      ))}
      <small>As an Amazon Associate I earn from qualifying purchases.</small>
      {total > items.length && (
        <p style={{ textAlign: "right" }}>
          <button
            className="btn btn-default btn-sm"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load more products..."}
          </button>
        </p>
      )}
    </div>
  );
}

function AmazonRelatedItem({ item }) {
  if (!item.detail_page_url) {
    // Later in 2020, this can be replaced with just `return null`
    return old__AmazonRelatedItem({ item });
  }

  let productTypeInfo = item.product_group;
  if (productTypeInfo && item.binding && productTypeInfo !== item.binding) {
    productTypeInfo += `, ${item.binding}`;
  }
  return (
    <div className="media amazon-item">
      <div className="media-left media-top">
        <a
          href={item.detail_page_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            className="media-object"
            loading="lazy"
            src={item.image_small || item.image_medium}
            alt="Product"
          />
        </a>
      </div>
      <div className="media-body">
        <h4 className="media-heading">
          <a
            href={item.detail_page_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.title}
          </a>
        </h4>
        {item.contributor && (
          <p>
            By <b>{item.contributor}</b>
          </p>
        )}
        <p>
          {item.price && <b className="price">{item.price}</b>}
          {productTypeInfo}
          <br />
          {item.release_date && <span>Release date: {item.release_date}</span>}
        </p>
      </div>
    </div>
  );
}

function old__AmazonRelatedItem({ item }) {
  let productTypeInfo = item.ItemAttributes.ProductGroup;
  if (
    productTypeInfo &&
    item.ItemAttributes.Binding &&
    productTypeInfo !== item.ItemAttributes.Binding
  ) {
    productTypeInfo += `, ${item.ItemAttributes.Binding}`;
  }
  return (
    <div className="media amazon-item">
      <div className="media-left media-top">
        <a href={item.URL} target="_blank" rel="noopener noreferrer">
          <img className="media-object" src={item.SmallImage} alt="Product" />
        </a>
      </div>
      <div className="media-body">
        <h4 className="media-heading">
          <a href={item.URL} target="_blank" rel="noopener noreferrer">
            {item.Title}
          </a>
        </h4>
        {item.Creator && (
          <p>
            By <b>{item.Creator}</b>
          </p>
        )}
        <p>
          {item.ItemAttributes.ListPrice && (
            <b className="price">
              {item.ItemAttributes.ListPrice.FormattedPrice}
            </b>
          )}
          {productTypeInfo}
        </p>
      </div>
    </div>
  );
}

// export function Affiliates({ song }) {
//   console.log("IS THIS STILL USED?!??!?!?!?!");
//   // const [amazon, setAmazon] = React.useState(null);
//   const [itunes, setItunes] = React.useState(null);

//   useEffect(() => {
//     let dismounted = false;
//     const url = `/api/song/${song.id}/affiliate/itunes`;
//     cachedFetch(url).then((response) => {
//       if (response.ok) {
//         if (dismounted) {
//           return;
//         }
//         response.json().then((results) => {
//           if (
//             results.itunes &&
//             results.itunes.matches &&
//             results.itunes.matches.length
//           ) {
//             setItunes(results.itunes);
//           }
//         });
//       } else {
//         console.warn(response);
//       }
//     });
//     return () => {
//       dismounted = true;
//     };
//   }, [song]);

//   if (isServer) {
//     return null;
//   }
//   return (
//     <>
//       {/* XXX This causes a double-render even though 'song' hasn't changed!! */}
//       <AmazonRelatedProducts song={song} />
//       <ITunesBadge itunes={itunes} />
//     </>
//   );
// }

// const ITunesBadge = React.memo(({ itunes }) => {
//   if (!itunes) {
//     return null;
//   }
//   if (!itunes.matches.length) {
//     return null;
//   }

//   const first = itunes.matches[0];
//   const trackURL = `${first.trackViewUrl}&at=${itunes.token}`;
//   const trackLink = (
//     <p>
//       <a href={trackURL}>
//         <b>{first.trackName}</b>
//         {" by "}
//         <b>{first.artistName}</b>
//         {first.trackPrice &&
//           first.trackPrice > 0.0 &&
//           ` ($${first.trackPrice})`}
//       </a>
//     </p>
//   );

//   const trackIcon = (
//     <p style={{ float: "left", marginBottom: 15 }}>
//       <a href={trackURL} className="app-icon" title={first.trackName}>
//         <img src={itunesAppImage} alt="iTunes" />
//       </a>
//     </p>
//   );

//   let albumLink = null;
//   if (first.collectionName) {
//     const collectionURL = `${first.collectionViewUrl}&at=${itunes.token}`;
//     albumLink = (
//       <p>
//         <a href={collectionURL}>
//           On album <b>{first.collectionName}</b>
//           {first.collectionPrice &&
//             first.collectionPrice > 0 &&
//             ` ($${first.collectionPrice})`}
//         </a>
//       </p>
//     );
//   }

//   let preview = null;
//   if (first.previewUrl) {
//     preview = (
//       <div style={{ clear: "left", textAlign: "center" }}>
//         <b>iTunes</b> Preview
//         <br />
//         <audio controls preload="none" src={first.previewUrl} />
//       </div>
//     );
//   }

//   return (
//     <div style={{ marginTop: 30, marginBottom: 20 }}>
//       <h4>On Apple iTunes</h4>
//       {trackIcon}
//       {trackLink}
//       {albumLink}
//       {preview}
//     </div>
//   );
// });

export function SpotifySnippet({ song, compact = true }) {
  const { data } = useSWR(
    `/api/song/${song.id}/spotify`,
    async (url) => {
      const r = await fetch(url);
      if (!r.ok) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`${r.status} on ${url}`);
        }
        throw new Error(`${r.status} on ${url}`);
      }
      return await r.json();
    },
    { revalidateOnFocus: false }
  );
  if (!data) {
    return null;
  }
  return (
    <div className="spotify">
      <h4>On Spotify™</h4>
      <div style={{ textAlign: "center" }}>
        {/* https://developer.spotify.com/documentation/widgets/generate/embed/ */}
        <iframe
          src={data.embed_url}
          width="300"
          height={compact ? 80 : 380}
          frameBorder="0"
          allowtransparency="true"
          allow="encrypted-media"
        ></iframe>
      </div>
    </div>
  );
}

export class YouTubeSnippet extends React.PureComponent {
  state = {
    snippet: null,
    searched: false,
    clicked: false
  };

  componentDidMount() {
    const id = this.props.song.id;
    let url = `/api/song/${id}/youtube`;
    return cachedFetch(url).then((r) => {
      if (this.dismounted) {
        return;
      }
      if (r.status !== 200) {
        console.warn(r.status, "loading", url);
      } else {
        r.json().then((response) => {
          if (response.snippet) {
            this.setState({ snippet: response.snippet, searched: true });
          } else {
            this.setState({ searched: true });
          }
        });
      }
    });
  }
  componentWillUnmount() {
    this.dismounted = true;
  }

  onClickThumbnail = (event) => {
    event.preventDefault();
    this.setState({ clicked: true });
  };

  render() {
    const { clicked, snippet } = this.state;
    if (isServer || snippet === null) {
      return null;
    }
    let media;
    const videoId = snippet.videoId;
    const href = `https://www.youtube.com/watch?v=${videoId}`;
    if (clicked) {
      // const src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&amp;showinfo=0`
      const src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
      let width = 335;
      let height = 178; // =335/(16/9)
      const containerDiv = document.querySelector("div.result");
      if (containerDiv && containerDiv.offsetWidth > 335) {
        width = 560;
        height = 315;
      }
      media = (
        <iframe
          width={width}
          height={height}
          title={snippet.title || "YouTube Snippet"}
          src={src}
          frameBorder={0}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      );
    } else {
      let thumbnail = snippet.thumbnails.medium;
      const containerDiv = document.querySelector("div.result");
      if (containerDiv && containerDiv.offsetWidth > 335) {
        thumbnail = snippet.thumbnails.high;
      }
      media = (
        <a href={href} onClick={this.onClickThumbnail}>
          <img
            src={thumbnail.url}
            width={thumbnail.width}
            height={thumbnail.height}
            title="Click to load video"
            alt="Video thumbnail"
            loading="lazy"
          />
        </a>
      );
    }
    return (
      <div className="youtube">
        <h4>
          YouTube™{" "}
          {!clicked ? (
            <small onClick={this.onClickThumbnail}>Click to load</small>
          ) : null}
        </h4>
        <div style={{ textAlign: "center" }}>
          {media}
          <p>
            <small>
              <a href={href} target="_blank" rel="noopener noreferrer">
                Watch on YouTube™
              </a>
            </small>
          </p>
        </div>
      </div>
    );
  }
}

export function IntersectionLazy({ render }) {
  const [entered, setEntered] = useState(false);
  function onEnter() {
    setEntered(true);
  }
  if (entered) {
    return render();
    // return <YouTubeSnippet song={song} />;
  }
  return <Waypoint onEnter={onEnter} />;
}

// export function YouTubeSnippetIntersectionLazy({ song }) {
//   const [entered, setEntered] = useState(false);
//   function onEnter() {
//     setEntered(true);
//   }
//   if (entered) {
//     return <YouTubeSnippet song={song} />;
//   }
//   return <Waypoint onEnter={onEnter} />;
// }

// export function YouTubeSnippetIntersectionLazy({ song }) {
//   const [entered, setEntered] = useState(false);
//   function onEnter() {
//     setEntered(true);
//   }
//   if (entered) {
//     return <YouTubeSnippet song={song} />;
//   }
//   return <Waypoint onEnter={onEnter} />;
// }

export function loadCarbonScript() {
  const carbonParent = document.getElementById("carbonadsouter");
  if (carbonParent) {
    if (!carbonParent.querySelector("script")) {
      const script = document.createElement("script");
      script.id = "_carbonads_js";
      script.src =
        "https://cdn.carbonads.com/carbon.js?serve=CK7DCK7W&placement=songsearch";
      script.async = true;
      carbonParent.appendChild(script);
    }
  }
}

export function loadAdsenseScript() {
  const carbonParent = document.getElementById("carbonadsouter");
  if (carbonParent) {
    if (!carbonParent.querySelector("script")) {
      const script = document.createElement("script");
      script.id = "_carbonads_js";
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      script.async = true;
      script.setAttribute('data-ad-client', 'ca-pub-8561605615946624');
      carbonParent.appendChild(script);
    }
  }
}

export function loadAmplifiedScript({ song, artist }) {
  const parent = document.getElementById("amplifiedouter");
  if (parent) {
    if (!parent.querySelector("script")) {
      window.amplified = window.amplified || { init: [] };
      window.amplified.init.push(() => {
        amplified.setParams({
          artist,
          song
        });
        amplified.pushAdUnit(100003500);
        amplified.run();
      });
      const script = document.createElement("script");
      script.id = "_amplified_js";
      script.src = "https://srv.clickfuse.com/ads/ads.js";
      script.async = true;
      parent.appendChild(script);
    }
  }
}

export const RenderParagraphs = React.memo(({ text }) => {
  return <blockquote dangerouslySetInnerHTML={{ __html: text }} />;
});

export function CustomTimeAgo(props) {
  return (
    <TimeAgo
      // Since the smallest granularity is 1 min, no point making the
      // setInterval any smaller than this.
      minPeriod={60}
      formatter={(value, unit, suffix, epochSeconds, nextFormatter) => {
        if (unit === "second") {
          return "seconds ago";
        }
        return nextFormatter(value, unit, suffix, epochSeconds);
      }}
      {...props}
    />
  );
}

export function ServerError() {
  return (
    <div className="not-found">
      <h3>Server Error</h3>
      <p>
        <img alt="Skull" src={skullImage} />
      </p>
      <p>
        Most likely a <b>temporary problem</b> which will go away if you{" "}
        <b>reload this page soon</b>.
      </p>
      <p>
        <Link to="/">Back to the home page</Link>
      </p>
    </div>
  );
}
