import React from "react";
import { Link } from "react-router-dom";
import { CustomTimeAgo, SetHTMLHeaders, Loading, ServerError } from "./Common";

class MuteComment extends React.Component {
  state = {
    loading: false,
    comment: null,
    muted: false,
    notFound: false,
    serverError: null
  };

  async componentDidMount() {
    SetHTMLHeaders({
      title: "Mute Comment - Song Search"
    });
    window.setTimeout(() => {
      const { comment, loading, notFound, serverError } = this.state;
      if (
        !this.dismounted &&
        !comment &&
        !loading &&
        !notFound &&
        !serverError
      ) {
        this.setState({ loading: true });
      }
    }, 1000);
    const formData = new FormData();
    const { match } = this.props;
    formData.append("oid", match.params.oid);
    formData.append("id", match.params.id);
    let response;
    try {
      response = await fetch("/api/comments/mute", {
        method: "POST",
        body: formData
      });
    } catch (ex) {
      this.setState({ serverError: ex, loading: false });
    }

    if (response.ok) {
      const result = await response.json();
      this.setState(
        {
          comment: result.comment,
          muted: true,
          notFound: false,
          loading: false,
          serverError: null
        },
        () => {
          SetHTMLHeaders({
            title: "Comment Muted - Song Search"
          });
        }
      );
    } else if (response.status === 400) {
      this.setState(
        {
          comment: null,
          notFound: true,
          loading: false,
          serverError: null
        },
        () => {
          SetHTMLHeaders({
            title: "Comment Not Found - Song Search"
          });
        }
      );
    } else {
      this.setState({ serverError: response, loading: false });
    }
  }
  componentWillUnmount() {
    this.dismounted = true;
  }

  render() {
    const { loading, comment, muted, notFound, serverError } = this.state;
    if (loading) {
      return <Loading text="One sec..." />;
    }
    if (serverError) return <ServerError />;
    return (
      <div>
        {muted && (
          <div>
            <h2>Comment Muted</h2>
            <p>
              You will not receive any more email notifications to replies on
              this comment.
            </p>
            <p>
              <Link to="/">Go back to the Home page</Link>
            </p>
          </div>
        )}

        {notFound && <ShowNotFound />}

        {comment && <ShowCommentData comment={comment} />}
      </div>
    );
  }
}

export default MuteComment;

function ShowNotFound() {
  return (
    <div>
      <h2>Comment Not Found</h2>
      <p>
        Sorry, but the instructions to mute this particular comment could not be
        found.
      </p>
      <p>
        <Link to="/">Go back to the Home page</Link>
      </p>
    </div>
  );
}

function ShowCommentData({ comment }) {
  return (
    <div style={{ marginTop: 70 }}>
      {comment.song && (
        <h4 style={{ marginBottom: 20 }}>
          Song:{" "}
          <a href={`${comment.song._url}#c${comment.id}`}>
            <b>{comment.song.name}</b> <span className="by">by</span>{" "}
            <b>{comment.song.artist.name}</b>
          </a>
        </h4>
      )}
      <h4>Comment:</h4>
      <blockquote dangerouslySetInnerHTML={{ __html: comment.text_rendered }} />
      <p>
        Posted <CustomTimeAgo date={comment.created} />
      </p>
    </div>
  );
}
