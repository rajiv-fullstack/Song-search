const _cache = {};

export const cachedFetch = (url, options) => {
  const cached = _cache[url];
  if (cached !== undefined) {
    try {
      const response = new window.Response(new Blob([cached]));
      return Promise.resolve(response);
    } catch (err) {
      // Old browsers. E.g. Firefox 38.
      console.log("Unable to create new window.Response", err);
    }
  }

  return fetch(url, options).then(response => {
    // let's only store in cache if the content-type is
    // JSON or something non-binary
    if (response.status === 200) {
      const ct = response.headers.get("Content-Type");
      if (ct && (ct.match(/application\/json/i) || ct.match(/text\//i))) {
        // There is a .json() instead of .text() but
        // we're going to store it in _cache as
        // string anyway.
        // If we don't clone the response, it will be
        // consumed by the time it's returned. This
        // way we're being un-intrusive.
        response
          .clone()
          .text()
          .then(content => {
            _cache[url] = content;
          });
      }
    }
    return response;
  });
};
