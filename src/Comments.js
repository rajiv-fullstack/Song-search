import React, { useEffect, useState } from "react";
import { cachedFetch } from "./Cache";
import { CustomTimeAgo, isServer } from "./Common";
import "./Comments.css";
import { Helmet } from "react-helmet";  


const SUBMITTED_COMMENTS_STORAGE_KEY = "submittedComments";

export class SongComments extends React.PureComponent {
  state = {
    loadingComments: false,
    savingComment: false,
    serverError: null,
    submissionError: null,
    comments: this.props.comments || null,
    commentsCount: this.props.commentsCount || null,
    submittedComments: [],
    commentSubmitted: null,
    commentEdited: null,
    commentDeleted: null,
    searchedId: this.props.searchedId,
    replyComment: null,
    editComment: null,
    csrfToken: null,
    highlightComment: null,
    highlitComment: null,
    hasCommented: false
  };

  componentDidMount() {
    // If you're here, you're a browser and no a server rendering.
    let submittedCommentStorage = "[]";
    try {
      submittedCommentStorage =
        sessionStorage.getItem(SUBMITTED_COMMENTS_STORAGE_KEY) || "[]";
    } catch (ex) {
      console.warn(
        "'sessionStorage.getItem(SUBMITTED_COMMENTS_STORAGE_KEY)' didn't work"
      );
    }
    const submittedComments = JSON.parse(submittedCommentStorage);
    if (submittedComments.length) {
      // Definitely load comments. Even if you arrived here with the comments
      // already server-side rendered.
      // Because, this call to loadingComments might be potentially different.

      // If you have commented on this song before, update that in state.
      let hasCommented = false;
      const { song } = this.props;
      if (song) {
        hasCommented = submittedComments.some(
          (comment) => comment.song && comment.song === song.id
        );
      }

      this.setState(
        {
          submittedComments,
          hasCommented,
          loadingComments: !this.state.comments
        },
        this.loadComments
      );
    } else {
      // If the comments were already loaded, we only need the csrfToken.
      if (!this.state.comments) {
        this.setState({ loadingComments: true }, this.loadComments);
      } else {
        // We just need a new csrfToken
        this.loadCSRFToken();
      }
    }

    if (window.location.hash) {
      const re = /c(\d+)$/;
      if (window.location.hash.match(re)) {
        const id = parseInt(window.location.hash.match(re)[1], 10);
        this.setState({ highlitComment: id }, () => {
          window.setTimeout(() => {
            if (!this.dismounted) {
              const element = document.querySelector(
                `#c${this.state.highlitComment}`
              );
              if (element && element.scrollIntoView) {
                element.scrollIntoView({
                  behavior: "smooth"
                });
              }
            }
          }, 1000);

          window.setTimeout(() => {
            if (!this.dismounted && this.state.highlitComment === id) {
              this.setState({ highlitComment: null });
            }
          }, 10 * 1000);
        });
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.song !== this.props.song) {
      this.setState(
        { loadingComments: true, comments: null, commentsCount: null },
        this.loadComments
      );
    }
  }

  componentWillUnmount() {
    this.dismounted = true;
  }

  loadCSRFToken = () => {
    let url = "/api/comments?csrftoken=1";
    fetch(url)
      .then((r) => {
        if (this.dismounted) return;
        if (r.ok) {
          return r.json().then((result) => {
            this.setState({
              csrfToken: result.csrf_token
            });
          });
        } else {
          this.setState({ serverError: r });
        }
      })
      .catch((error) => {
        if (this.dismounted) return;
        this.setState({ serverError: error });
      });
  };

  loadComments = () => {
    const { song, search } = this.props;
    const { submittedComments, commentEdited } = this.state;
    let submittedCommentIds = [];
    let url = "/api/comments";
    if (song) {
      url += `?song=${song.id}`;
    } else if (search) {
      url += `?search=${search.id}`;
    } else {
      // throw new Error("Don't know how to do this outside of song");
    }

    if (submittedComments.length) {
      submittedCommentIds = submittedComments
        .filter((submission) => {
          if (song) {
            return submission.song === song.id;
          } else if (search) {
            return submission.search === search.id;
          } else {
            return !submission.song && !submission.search;
          }
        })
        .map((submission) => submission.id);
    }

    submittedCommentIds.forEach((id) => {
      url += url.includes("?") ? "&" : "?";
      url += `submitted=${id}`;
    });

    if (commentEdited) {
      // Just to extra-bust the cache
      url += url.includes("?") ? "&" : "?";
      url += `edited=${commentEdited.id}`;
    }

    let fetchFunc;
    if (commentEdited && submittedCommentIds.length) {
      // Don't use the caching one
      fetchFunc = fetch;
    } else {
      fetchFunc = cachedFetch;
    }

    fetchFunc(url)
      .then((r) => {
        if (this.dismounted) return;
        this.setState({ loadingComments: false });
        if (r.ok) {
          return r.json().then((result) => {
            this.setState(
              {
                csrfToken: result.csrf_token,
                comments: result.comments,
                commentsCount: result.comments_count,
                loadingComments: false
              },
              this.consolidateSubmittedComments
            );
          });
        } else {
          this.setState({ serverError: r, loadingComments: false });
        }
      })
      .catch((error) => {
        if (this.dismounted) return;
        this.setState({ serverError: error, loadingComments: false });
      });
  };

  consolidateSubmittedComments = () => {
    const { comments } = this.state;
    let { submittedComments } = this.state;
    if (submittedComments.length && comments[""] && comments[""].length) {
      // If any of your submitted comments is now approved, we need to remove
      // it from sessionStorage.
      const removeSubmittedComments = [];
      function recurse(comments) {
        comments.forEach((comment) => {
          if (!comment.not_approved) {
            // Add to removeSubmittedComments only if this is one of the ones
            // you submitted.
            submittedComments.forEach((submittedComment) => {
              if (submittedComment.id === comment.id) {
                removeSubmittedComments.push(submittedComment.id);
              }
            });
          }
          if (comments[comment.id]) {
            recurse(comments[comment.id]);
          }
        });
      }
      recurse(comments[""]);

      if (removeSubmittedComments.length) {
        const newSubmittedComments = submittedComments.filter(
          (submittedComment) => {
            return !removeSubmittedComments.includes(submittedComment.id);
          }
        );
        this.setState({ submittedComments: newSubmittedComments }, () => {
          if (this.state.submittedComments.length) {
            // Update
            try {
              sessionStorage.setItem(
                SUBMITTED_COMMENTS_STORAGE_KEY,
                JSON.stringify(this.state.submittedComments)
              );
            } catch (ex) {
              console.warn(
                "'sessionStorage.setItem(SUBMITTED_COMMENTS_STORAGE_KEY)' did't work"
              );
            }
          } else {
            // Reset
            try {
              sessionStorage.removeItem(SUBMITTED_COMMENTS_STORAGE_KEY);
            } catch (ex) {}
          }
        });
      }
    }
  };

  highlightComment = (id) => {
    let { highlitComment } = this.state;
    if (highlitComment && highlitComment === id) {
      highlitComment = null;
    } else {
      highlitComment = id;
    }
    this.setState({ highlitComment }, () => {
      window.setTimeout(() => {
        if (!this.dismounted && this.state.highlitComment === id) {
          this.setState({ highlitComment: null });
        }
      }, 10 * 1000);
    });
  };

  submitCommentHandler = (data) => {
    this.setState({ savingComment: true }, () => {
      this._submitCommentHandler(data).then(() => {
        this.setState({ savingComment: false });
      });
    });
  };
  _submitCommentHandler = async (data) => {
    let response;
    const { song, search } = this.props;
    const { submittedComments, csrfToken } = this.state;
    if (!csrfToken) {
      throw new Error("No csrfToken prepared");
    }
    const formData = new FormData();
    formData.append("csrfmiddlewaretoken", csrfToken);
    formData.append("text", data.comment);
    formData.append("name", data.name);
    formData.append("email", data.email);

    if (submittedComments.length) {
      submittedComments
        .filter((submission) => {
          if (song) {
            return submission.song === song.id;
          } else if (search) {
            return submission.search === search.id;
          } else {
            return !submission.song && !submission.search;
          }
        })
        .forEach((submission) => {
          formData.append("submitted", submission.id);
        });
    }

    if (data.editComment) {
      formData.append("id", data.editComment.id);
      if (!data.editComment.oid) {
        throw new Error("Can't edit if you don't have the oid");
      }
      formData.append("oid", data.editComment.oid);
    }
    if (data.replyComment) {
      formData.append("parent", data.replyComment.id);
    }
    if (data.askedWasSearchedFor) {
      formData.append("was_searched_for", data.wasSearchedFor || false);
    }
    if (this.state.searchedId) {
      formData.append("search", this.state.searchedId || null);
    }
    if (data.parent) {
      formData.append("parent", data.parent || null);
    }
    formData.append("experiment", data.experiment || {});

    if (song) {
      formData.append("song", song.id);
    } else if (search) {
      formData.append("search", search.id);
    } else {
      // throw new Error("Don't know how to do this outside of song");
    }

    try {
      response = await fetch("/api/comments", {
        method: "POST",
        body: formData
      });
      if (response.ok) {
        // If posted a comment because this *was* the song you
        // searched for, let's kill that not to stop asking that question.
        if (this.state.searchedId) {
          try {
            localStorage.removeItem("searched");
          } catch (ex) {
            console.warn("'localStorage.removeItem(\"searched\")' didn't work");
          }
        }

        const result = await response.json();

        if (data.editComment) {
          return this.setState({
            searchedId: null,
            commentEdited: result.submitted,
            submissionError: null,
            commentSubmitted: null,
            editComment: null,
            replyComment: null,
            comments: result.comments,
            commentsCount: result.comments_count
          });
        } else {
          return this.setState(
            {
              searchedId: null,
              submissionError: null,
              commentEdited: null,
              commentSubmitted: result.submitted,
              commentDeleted: null,
              replyComment: null,
              comments: result.comments,
              commentsCount: result.comments_count
            },
            () => {
              // Only do this if there is only exactly 1 of these in the DOM.
              // The reason why is that when repeatedly injecting the <SongComments>
              // components in multiple places, you might have different ones
              // for different expanded songs.
              if (document.querySelectorAll(".alert-comment").length === 1) {
                document
                  .querySelector(".alert-comment.alert-success")
                  .scrollIntoView({ behavior: "smooth" });
              }

              const { commentSubmitted } = this.state;
              const { song, search } = this.props;

              this.highlightComment(commentSubmitted.id);

              const submittedComments = this.state.submittedComments.slice(0);
              // If you accidentally double-clicked to submit twice.
              // Or, just wrote the exact same comment twice, the server
              // won't create another record but it will respond as if it worked
              // so we need to check first that we don't already have
              // this 'commentSubmitted.id` already.
              if (
                !submittedComments
                  .map((o) => o.id)
                  .filter((id) => id === commentSubmitted.id).length
              ) {
                const toPush = {
                  id: commentSubmitted.id,
                  oid: commentSubmitted.oid
                };
                if (song) {
                  toPush.song = song.id;
                } else if (search) {
                  toPush.search = search.id;
                }
                submittedComments.push(toPush);
              }
              this.setState(
                { submittedComments, submissionError: null },
                () => {
                  this.loadComments();
                  try {
                    sessionStorage.setItem(
                      SUBMITTED_COMMENTS_STORAGE_KEY,
                      JSON.stringify(this.state.submittedComments)
                    );
                  } catch (ex) {}
                }
              );
            }
          );
        }
      } else {
        return this.setState({ submissionError: response });
      }
    } catch (error) {
      console.warn("Submission failed:", error);
      return this.setState({ submissionError: error });
    }
  };

  deleteCommentHandler = (comment) => {
    this.setState({ savingComment: true }, () => {
      this._deleteCommentHandler(comment).then(() => {
        this.setState({ savingComment: false });
      });
    });
  };

  _deleteCommentHandler = async (comment) => {
    let response;
    const formData = new FormData();
    if (!comment.oid) {
      throw new Error("Can't edit if you don't have the oid");
    }
    formData.append("id", comment.id);
    formData.append("oid", comment.oid);
    const url = "/api/comments/delete";
    try {
      response = await fetch(url, {
        method: "POST",
        body: formData
      });
    } catch (ex) {
      return this.setState({ submissionError: ex });
    }
    if (!response.ok) {
      return this.setState({ submissionError: response });
    }
    return this.setState(
      {
        commentDeleted: comment,
        commentEdited: null,
        editComment: null,
        submissionError: null
      },
      () => {
        // Before we load comments, remove this one from localStorage
        const submittedComments = this.state.submittedComments;
        const filteredSubmittedComments = submittedComments.filter(
          (submission) => submission.id !== comment.id
        );
        this.setState({ submittedComments: filteredSubmittedComments }, () => {
          this.loadComments();
          try {
            sessionStorage.setItem(
              SUBMITTED_COMMENTS_STORAGE_KEY,
              JSON.stringify(this.state.submittedComments)
            );
          } catch (ex) {}
        });
      }
    );
  };

  setEditComment = (comment) => {
    this.setState({ editComment: comment });
  };

  setReplyComment = (comment) => {
    if (this.state.replyComment && this.state.replyComment.id === comment.id) {
      this.setState({
        replyComment: null,
        highlitComment: null,
        commentEdited: null
      });
    } else {
      this.setState({
        replyComment: comment,
        highlitComment: comment.id,
        commentEdited: null
      });
    }
  };

  clearCommentSubmitted = () => {
    this.setState({ commentSubmitted: null });
  };

  clearCommentEdited = () => {
    this.setState({ commentEdited: null });
  };

  clearCommentDeleted = () => {
    this.setState({ commentDeleted: null });
  };

  render() {
    const { song } = this.props;
    const {
      comments,
      commentsCount,
      submissionError,
      commentSubmitted,
      commentEdited,
      commentDeleted,
      submittedComments,
      searchedId,
      editComment,
      replyComment,
      savingComment,
      highlitComment,
      hasCommented,
      csrfToken
    } = this.state;

    function App() {
      useEffect(() => {
        const script = document.createElement("script")
    
        script.src =
          "https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"
    
        script.async = true
    
        script.integrity =
          "sha384-ka7Sk0Gln4gmtz2MlQnikT1wXgYsOg+OMhuP+IlRH9sENBO0LRn5q+8nbTov4+1p"
    
        script.crossOrigin = "anonymous"
    
        document.body.appendChild(script)
    
        return () => {
          // clean up the script when the component in unmounted
          document.body.removeChild(script)
        }
      }, [])
    
      return <div className="App"></div>
    }

    const Vdtag = () =>{
      useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://live.primis.tech/live/liveView.php?s=113482";
        script.async = true;
        document.body.appendChild(script);
        return () => {
          // clean up the script when the component in unmounted
          document.body.removeChild(script)
        }
      }, [])
    
      return (
        <>
        
         <div className="vdtag_divs">
          </div>
          
        </>
      );
    };

    return (
      
      <div className="comments masters song-comments">
             <div className="application">
                <Vdtag /> 
             </div> 
             
        <h3>
          Song Comments {commentsCount ? <span>({commentsCount})</span> : null}
          <br />
          <small>
            On <b>{song.name}</b> <span className="by">by</span>{" "}
            {song.artist.name}
          </small>
        </h3>

        <ShowCommentDeleted
          commentDeleted={commentDeleted}
          clearCommentDeleted={this.clearCommentDeleted}
        />

        <ShowComments
          {...this.props}
          submissionError={submissionError}
          comments={comments}
          editComment={editComment}
          replyComment={replyComment}
          searchedId={searchedId}
          setEditComment={this.setEditComment}
          setReplyComment={this.setReplyComment}
          submitCommentHandler={this.submitCommentHandler}
          deleteCommentHandler={this.deleteCommentHandler}
          commentSubmitted={commentSubmitted}
          commentEdited={commentEdited}
          submittedComments={submittedComments}
          savingComment={savingComment}
          highlitComment={highlitComment}
          highlightComment={this.highlightComment}
          clearCommentSubmitted={this.clearCommentSubmitted}
          clearCommentEdited={this.clearCommentEdited}
          csrfToken={csrfToken}
          hasCommented={hasCommented}
        />
      </div>
    );
  }
}

function ShowCommentSubmitted({ commentSubmitted, clearCommentSubmitted }) {
  if (!commentSubmitted) return null;
  return (
    <div
      className="alert-comment alert-comment alert alert-success alert-dismissible"
      role="alert"
    >
      <button
        type="button"
        className="close"
        data-dismiss="alert"
        aria-label="Close"
        onClick={(event) => {
          clearCommentSubmitted();
        }}
      >
        <span aria-hidden="true">&times;</span>
      </button>
      <p>
        <b>Comment submitted. Thank you!</b>
      </p>
      <p>It needs to be moderated before publishing.</p>
    </div>
  );
}

function ShowCommentEdited({ commentEdited, clearCommentEdited }) {
  if (!commentEdited) return null;
  return (
    <div
      className="alert-comment alert alert-success alert-dismissible"
      role="alert"
    >
      <button
        type="button"
        className="close"
        data-dismiss="alert"
        aria-label="Close"
        onClick={(event) => {
          clearCommentEdited();
        }}
      >
        <span aria-hidden="true">&times;</span>
      </button>
      <p>
        <b>Comment edited.</b>
      </p>
      <p>You can keep editing it until it gets approved.</p>
    </div>
  );
}

function ShowCommentDeleted({ commentDeleted, clearCommentDeleted }) {
  if (!commentDeleted) return null;
  return (
    <div
      className="alert-comment alert alert-success alert-dismissible"
      role="alert"
    >
      <button
        type="button"
        className="close"
        data-dismiss="alert"
        aria-label="Close"
        onClick={(event) => {
          clearCommentDeleted();
        }}
      >
        <span aria-hidden="true">&times;</span>
      </button>
      <p>
        <b>Comment removed.</b>
      </p>
      <p>Feel free to write a new comment.</p>
    </div>
  );
}

function ShowSubmissionError({ submissionError }) {
  const [validationErrors, setValidationErrors] = useState({});

  let isErrorResponse = false;
  if (!isServer) {
    try {
      isErrorResponse = submissionError instanceof window.Response;
    } catch (err) {
      // Old browsers. E.g. Firefox 38.
      console.log("instanceof window.Response did not work:", err);
    }
  }

  useEffect(() => {
    if (!isServer && isErrorResponse && submissionError.status === 400) {
      submissionError.json().then((data) => {
        setValidationErrors(data.errors);
      });
    }
  }, [submissionError, isErrorResponse]);

  if (!submissionError) return null;

  let errorMessage;
  if (!isServer && isErrorResponse) {
    if (submissionError.status === 400) {
      errorMessage = (
        <div>
          <p>
            <b>Something's not right with the submission</b>
          </p>
          {Object.keys(validationErrors).map((key) => {
            return (
              <p key={key}>
                <b>{key}:</b>{" "}
                {validationErrors[key].map((err) => (
                  <span key={err.message + err.code}>
                    <i>{err.message}</i>{" "}
                    {err.code ? (
                      <span>
                        (<code>{err.code}</code>)
                      </span>
                    ) : null}
                  </span>
                ))}
              </p>
            );
          })}
        </div>
      );
    } else if (submissionError.status >= 500) {
      errorMessage = (
        <p>Server error. Perhaps simply try again a little later.</p>
      );
    } else {
      errorMessage = (
        <p>The server basically failed to process the submission.</p>
      );
    }
  } else {
    errorMessage = (
      <p>
        <code>{submissionError.toString()}</code>
      </p>
    );
  }

  return (
    <div className="search-error">
      <h4>Sorry, an error occured</h4>
      {errorMessage}
    </div>
  );
}

class ShowComments extends React.PureComponent {
  render() {
    const { comments, replyComment, editComment } = this.props;
    return (
      <>
        {comments && comments[""] && (
          <ShowCommentsRecursive
            {...this.props}
            allComments={comments}
            comments={comments[""]}
          />
        )}
        {!replyComment && !editComment && (
          <CommentForm replyingComment={false} {...this.props} />
        )}
      </>
    );
  }
}

class ShowCommentsRecursive extends React.PureComponent {
  state = {
    confirmDelete: false
  };

  render() {
    const { confirmDelete } = this.state;
    const {
      replyComment,
      editComment,
      setEditComment,
      setReplyComment,
      comments,
      allComments,
      submittedComments,
      deleteCommentHandler,
      highlightComment,
      highlitComment,
      commentSubmitted,
      clearCommentSubmitted,
      commentEdited,
      clearCommentEdited,
      csrfToken
    } = this.props;
    if (!comments.length) return null;

    return (
      <div className="comments">
        {comments.map((comment) => {
          // You're allowed to edit it if it was yours and it's not approved yet.
          let canEdit = false;
          if (comment.not_approved) {
            // Take 'editComment' into account
            if (submittedComments.filter((c) => c.id === comment.id).length) {
              canEdit = true;
            }
          }
          let canReply = !canEdit && csrfToken;

          const replies = allComments[comment.id];

          const editingComment = !!(
            canEdit &&
            editComment &&
            editComment.id === comment.id
          );

          const replyingComment = !!(
            canReply &&
            replyComment &&
            replyComment.id === comment.id
          );

          return (
            <div className="comment" key={comment.id} id={`c${comment.id}`}>
              {commentSubmitted && commentSubmitted.id === comment.id && (
                <ShowCommentSubmitted
                  commentSubmitted={commentSubmitted}
                  clearCommentSubmitted={clearCommentSubmitted}
                />
              )}

              {commentEdited && commentEdited.id === comment.id && (
                <ShowCommentEdited
                  commentEdited={commentEdited}
                  clearCommentEdited={clearCommentEdited}
                />
              )}

              {canEdit && !(editComment && editComment.id === comment.id) && (
                <p className="buttons">
                  <button
                    type="button"
                    className="btn btn-info btn-sm"
                    onClick={(event) => {
                      event.preventDefault();
                      setEditComment(comment);
                    }}
                  >
                    Edit your comment
                  </button>
                </p>
              )}

              {confirmDelete && editComment && editComment.id === comment.id && (
                <p style={{ margin: 20, textAlign: "center" }}>
                  <b>Are you sure?</b>
                  <br />
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={(event) => {
                      event.preventDefault();
                      deleteCommentHandler(comment);
                    }}
                  >
                    Yes
                  </button>{" "}
                  <button
                    type="button"
                    className="btn btn-info"
                    onClick={(event) => {
                      event.preventDefault();
                      this.setState({ confirmDelete: false });
                    }}
                  >
                    No
                  </button>
                </p>
              )}

              {canEdit && editComment && editComment.id === comment.id && (
                <p className="buttons">
                  {!confirmDelete && (
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={(event) => {
                        event.preventDefault();
                        this.setState({ confirmDelete: true });
                      }}
                    >
                      Remove your comment
                    </button>
                  )}{" "}
                  <button
                    type="button"
                    className="btn btn-info btn-sm"
                    onClick={(event) => {
                      event.preventDefault();
                      if (confirmDelete) {
                        this.setState({ confirmDelete: false }, () => {
                          setEditComment(null);
                        });
                      } else {
                        setEditComment(null);
                      }
                    }}
                  >
                    Close edit
                  </button>
                </p>
              )}

              {editComment && editComment.id === comment.id ? (
                <CommentForm
                  focusOnMount={true}
                  editingComment={editingComment}
                  replyingComment={false}
                  {...this.props}
                />
              ) : (
                <DisplayComment
                  highlightComment={highlightComment}
                  canReply={canReply}
                  replyingComment={replyingComment}
                  setReplyComment={setReplyComment}
                  comment={comment}
                  highlit={highlitComment && highlitComment === comment.id}
                />
              )}

              {replyComment && comment.id === replyComment.id && (
                <CommentForm
                  {...this.props}
                  replyingComment={replyingComment}
                  focusOnMount={true}
                />
              )}
              {replies && (
                <ShowCommentsRecursive {...this.props} comments={replies} />
              )}
            </div>
          );
        })}
      </div>
    );
  }
}

class CommentForm extends React.PureComponent {
  state = {
    comment: this.props.editComment ? this.props.editComment.text : "",
    name: "",
    email: "",
    showNameEmailInputs: true,
    wasSearchedFor: false,
    canSubmit: false,
    warnAboutName: false
  };

  textareaRef = React.createRef();

  componentDidMount() {
    const update = {};

    let { canSubmit, name, email, showNameEmailInputs } = this.state;

    try {
      name = localStorage.getItem("commentName") || "";
      email = localStorage.getItem("commentEmail") || "";
    } catch (ex) {
      console.warn("'localStorage.getItem(\"commentName\")' didn't work");
    }

    if (name || email) {
      update.name = name;
      update.email = email;
    }

    if (!canSubmit && (name || email)) {
      update.canSubmit = true;
    }
    if (name && email && showNameEmailInputs && !this.props.editComment) {
      update.showNameEmailInputs = false;
    }

    if (Object.keys(update).length) {
      this.setState(update);
    }

    if (this.props.focusOnMount) {
      // Usually true when doing an edit
      this.textareaRef.current.focus();
    }
  }
  componentWillUnmount() {
    this.dismounted = true;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.commentSubmitted !== this.props.commentSubmitted) {
      this.setState({ comment: "" });
    }
  }

  clearComment = () => {
    this.setState({
      comment: "",
      preview: false
    });
  };

  submitHandler = (event) => {
    event.preventDefault();
    const { comment, name, email, warnAboutName, wasSearchedFor } = this.state;
    const { submitCommentHandler, editComment, replyComment } = this.props;

    if (!comment.trim()) {
      return;
    }
    try {
      if (name && name.trim()) {
        localStorage.setItem("commentName", name.trim());
      }
      if (email && email.trim()) {
        localStorage.setItem("commentEmail", email.trim());
      }
    } catch (ex) {
      console.warn("'localStorage.stItem(\"commentName\")' didn't work");
    }

    if ((!name || !email) && !warnAboutName) {
      this.setState({ warnAboutName: true });
    } else {
      if (warnAboutName) {
        this.setState({ warnAboutName: false });
      }
      submitCommentHandler({
        comment,
        email,
        name,
        wasSearchedFor,
        editComment,
        replyComment,
        askedWasSearchedFor: this.askWasSearchedFor()
      });
    }
  };

  getTextareaRows = (text, minimum = 4, maximum = 16) => {
    const linebreaks = (text.match(/\n/g) || []).length;
    return Math.min(maximum, Math.max(minimum, linebreaks + 2));
  };

  askWasSearchedFor = () => {
    const { searchedId, replyingComment, hasCommented, editingComment } =
      this.props;
    return !!(
      searchedId &&
      !replyingComment &&
      !editingComment &&
      !hasCommented
    );
  };

  render() {
    const { comment, name, email, warnAboutName, showNameEmailInputs } =
      this.state;
    const {
      editComment,
      savingComment,
      submissionError,
      editingComment,
      csrfToken
    } = this.props;

    if (!csrfToken) {
      if (isServer) {
        return <i>Must have JavaScript enabled to comment.</i>;
      } else {
        return null;
      }
    }

    return (
      <form onSubmit={this.submitHandler}>
        <ShowSubmissionError submissionError={submissionError} />

        {editingComment && (
          <i>
            You can edit <b>your</b> recently added, but not yet approved
            comments.
          </i>
        )}

        {savingComment && <ShowSavingStatus />}

        {this.askWasSearchedFor() && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h4>Was this the song you were looking for?</h4>

            <label className="radio-inline">
              <input
                type="radio"
                name="wasSearchedFor"
                value="yes"
                disabled={savingComment}
                onChange={(e) => {
                  this.setState({ wasSearchedFor: true }, () => {
                    if (this.textareaRef.current) {
                      this.textareaRef.current.focus();
                    }
                  });
                }}
              />{" "}
              Yes!
            </label>
            <label className="radio-inline">
              <input
                type="radio"
                name="wasSearchedFor"
                id="inlineRadio2"
                value="no"
                disabled={savingComment}
                onChange={(e) => {
                  this.setState({ wasSearchedFor: false }, () => {
                    if (this.textareaRef.current) {
                      this.textareaRef.current.focus();
                    }
                  });
                }}
              />{" "}
              No :(
            </label>
          </div>
        )}
        <div className="form-group">
          <textarea
            className="form-control"
            rows={this.getTextareaRows(this.state.comment)}
            ref={this.textareaRef}
            value={comment}
            disabled={savingComment}
            onChange={(e) => this.setState({ comment: e.target.value })}
            onBlur={(event) => {
              if (this.state.comment.trim()) {
                setTimeout(() => {
                  if (!this.dismounted) {
                    if (!this.state.canSubmit) {
                      this.setState({ canSubmit: true });
                    }
                  }
                }, 100);
              }
            }}
          />
        </div>
        {showNameEmailInputs && (
          <div className="form-inlinexxx">
            <div className="form-group">
              <label htmlFor="_name" className="sr-only">
                Your name
              </label>
              <input
                type="text"
                className="form-control"
                id="_name"
                placeholder="Your name..."
                disabled={savingComment}
                value={name}
                onChange={(e) => this.setState({ name: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 3 }}>
              <label htmlFor="_email" className="sr-only">
                Email address
              </label>
              <input
                type="email"
                className="form-control"
                id="_email"
                placeholder="Your email address..."
                disabled={savingComment}
                value={email}
                onChange={(e) => this.setState({ email: e.target.value })}
              />
            </div>
            <p>
              <small>
                Your email will <b>never be published</b> and{" "}
                <b>never be shared</b>. Useful to receive reply comments.
              </small>
            </p>
          </div>
        )}
        {warnAboutName && (
          <div
            className="alert-comment alert alert-warning alert-dismissible"
            role="alert"
          >
            <button
              type="button"
              className="close"
              data-dismiss="alert"
              aria-label="Close"
              onClick={(event) => {
                this.setState({ warnAboutName: false });
              }}
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <p>
              {name ? (
                <b>Please enter your email</b>
              ) : (
                <b>Please enter your name</b>
              )}
            </p>
            <p>
              A real name and email helps the comment be approved.
              <br />
              An email address makes it possible to receive notification on
              replies to your comment.
            </p>
          </div>
        )}
        <div className="row">
          <div className="col-md-8">
            {name && email && !showNameEmailInputs && (
              <>
                <p>
                  Commenting as <b>{name}</b>. Replies sent to <b>{email}</b>.
                </p>
                <p>
                  <button
                    type="button"
                    className="btn btn-info btn-sm"
                    onClick={(event) => {
                      event.preventDefault();
                      this.setState({ showNameEmailInputs: true });
                    }}
                  >
                    Change name
                  </button>
                </p>
              </>
            )}
          </div>

          <div className="col-md-4" style={{ textAlign: "right" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!comment.trim() || savingComment}
            >
              {editComment ? "Save Changes" : "Post Comment"}
            </button>
          </div>
        </div>

        {!this.state.wasSearchedFor && (
          <p style={{ margin: "20px 0" }}>
            <small>
              Can't find the song you're looking for?{" "}
              <a href="https://www.peterbe.com/plog/blogitem-040601-1">
                Try posting on <b>Find song by lyrics</b>
              </a>
              .
            </small>
          </p>
        )}
      </form>
    );
  }
}

function ShowSavingStatus() {
  return (
    <p>
      <i>Please wait....</i>
    </p>
  );
}

class DisplayComment extends React.PureComponent {
  render() {
    const {
      highlit,
      highlightComment,
      canReply,
      replyingComment,
      setReplyComment,
      comment
    } = this.props;
    const { id, name, created } = comment;
    const notApproved = comment.not_approved;
    const text = comment.text_rendered;

    function getRandomCelebration() {
      const emojis = ["🎉", "🎊", "🥳", "✨", "👍🏼", "🥰", "😍", "🍾"];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      return (
        <span role="img" aria-label="muted">
          {emoji}
        </span>
      );
    }

    return (
      <div className={highlit ? "display highlit" : "display"}>
        {canReply && (
          <p className="buttons">
            <button
              type="button"
              className={
                replyingComment
                  ? "btn btn-warning btn-sm"
                  : "btn btn-info btn-sm"
              }
              onClick={(event) => {
                event.preventDefault();
                setReplyComment(comment);
              }}
            >
              {replyingComment ? "Close" : "Reply"}
            </button>
          </p>
        )}
        <h5>
          By <b>{name ? name : <i>Anonymous</i>}</b>
        </h5>
        <p className="meta">
          <a
            href={`#c${id}`}
            title={created}
            onClick={(event) => {
              highlightComment(id);
            }}
          >
            Posted <CustomTimeAgo date={created} title={created} />
          </a>
          {notApproved && <small>Not yet approved!</small>}
        </p>
        {comment.hasOwnProperty("was_searched_for") && (
          <p>
            <i>Was it the song you were looking for?</i>{" "}
            <b>{comment.was_searched_for ? "Yes" : "No"}</b>{" "}
            {comment.was_searched_for && getRandomCelebration()}
          </p>
        )}

        {typeof text === "string" ? (
          <blockquote dangerouslySetInnerHTML={{ __html: text }} />
        ) : (
          <blockquote>{text}</blockquote>
        )}
      </div>
    );
  }
}
