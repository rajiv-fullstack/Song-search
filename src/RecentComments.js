import React, { useCallback, useRef, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loading, SetHTMLHeaders, ServerError } from "./Common";
import { cachedFetch } from "./Cache";
import "./RecentComments.css";

function RecentComments({ recentComments }) {
  let { page } = useParams();

  let mountedRef = useRef(false);
  const [serverError, setServerError] = useState(null);
  const [data, setData] = useState(recentComments || null);

  function getPage(p) {
    return parseInt(p || "1", 10);
  }

  const fetchComments = useCallback(() => {
    let url = "/api/comments/recent";
    const pageInt = getPage(page);
    if (pageInt > 1) {
      url += `?page=${pageInt}`;
    }
    return cachedFetch(url)
      .then((r) => {
        if (!r.ok) {
          return mountedRef.current && setServerError(r);
        }
        r.json().then((data) => {
          return mountedRef.current && setData(data);
        });
      })
      .catch((ex) => {
        return mountedRef.current && setServerError(ex);
      });
  }, [page]);

  useEffect(() => {
    const pageInt = getPage(page);

    const suffix = " - Song Search";
    SetHTMLHeaders({
      title:
        pageInt > 1
          ? `Recent Comments (page ${pageInt})${suffix}`
          : `Recent Comments${suffix}`
    });
    setData(null);
    mountedRef.current = true;
    fetchComments(page);
    return () => {
      mountedRef.current = false;
    };
  }, [page, fetchComments]);

  const loading = !data && !serverError;

  const [showLoading, setShowLoading] = useState(false);
  useEffect(() => {
    if (loading) {
      window.setTimeout(() => {
        mountedRef.current && setShowLoading(true);
      }, 1000);
    } else {
      setShowLoading(false);
    }
  }, [loading]);

  const pageInt = getPage(page);

  let pagination = null;
  if (data && (data.next_page || pageInt > 1)) {
    pagination = <Pagination next={data.next_page} previous={pageInt - 1} />;
  }

  return (
    <div className="recent-comments">
      {!serverError && (
        <h2>
          Recent Comments {pageInt !== 1 && <small>Page {pageInt}</small>}
        </h2>
      )}
      <p>
        <Link to="/">Back to the home page</Link>
      </p>
      {loading && showLoading && <Loading text="Loading..." />}
      {serverError && !data && <ServerError />}

      {pagination}

      {data && <ShowRecentComments comments={data.comments} isRoot={true} />}

      {pagination}
    </div>
  );
}

export default RecentComments;

export function ShowRecentComments({ comments, isRoot }) {
  let previousSong = null;
  let previousChronological = null;
  return (
    <div className="comments">
      {comments.map((comment) => {
        let imageLink = null;
        if (isRoot) {
          if (comment.image && previousSong !== comment.song.id) {
            imageLink = (
              <Link to={comment._url}>
                <img
                  className="pull-right img-thumbnail found"
                  loading="lazy"
                  src={comment.image.thumbnail100 || comment.image.url}
                  alt={comment.song.artist.name}
                />
              </Link>
            );
          }
          previousSong = comment.song.id;
        }

        let geoString = null;
        if (comment.geo) {
          if (comment.geo.city && comment.geo.country) {
            geoString = ` (from ${comment.geo.city}, ${comment.geo.country}) `;
          } else if (comment.geo.country) {
            geoString = ` (from ${comment.geo.country}) `;
          }
        }

        let chronologicalDiff = null;
        if (comment.rating) {
          if (previousChronological) {
            chronologicalDiff =
              comment.rating.chronological - previousChronological - 1;
          }
          previousChronological = comment.rating.chronological;
        }

        return (
          <div key={comment.id} className="comment">
            {imageLink}
            {isRoot && (
              <h4>
                On{" "}
                <Link to={comment._url}>
                  <b>{comment.song.name}</b> <span className="by">by</span>{" "}
                  {comment.song.artist.name}
                </Link>
              </h4>
            )}
            <blockquote
              dangerouslySetInnerHTML={{ __html: comment.text_rendered }}
            />
            {isRoot && (
              <p>
                <Link to={comment._url} className="btn btn-info btn-sm">
                  Reply
                </Link>
              </p>
            )}
            <p>
              By {comment.name ? <b>{comment.name}</b> : <i>Anonymous</i>}
              {geoString}
              on {comment.approved_human}{" "}
              {comment.rating && (
                <span>
                  rating:<code>{comment.rating.score}</code>
                  chronological: <code>{comment.rating.chronological}</code>
                  {!!chronologicalDiff && (
                    <i>
                      {chronologicalDiff > 0
                        ? ` +${chronologicalDiff}`
                        : chronologicalDiff}
                    </i>
                  )}
                </span>
              )}
            </p>
            {comment.replies && comment.replies.length ? (
              <ShowRecentComments comments={comment.replies} isRoot={false} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Pagination({ previous, next }) {
  return (
    <div className="row">
      <div className="col-md-6" style={{ textAlign: "right" }}>
        {previous ? (
          <div className="load-more">
            <Link to={previous === 1 ? "/comments" : `/comments/p${previous}`}>
              Previous page
            </Link>
          </div>
        ) : null}
      </div>
      <div className="col-md-6" style={{ textAlign: "left" }}>
        {next && (
          <div className="load-more">
            <Link to={`/comments/p${next}`}>Next page</Link>
          </div>
        )}
      </div>
    </div>
  );
}
