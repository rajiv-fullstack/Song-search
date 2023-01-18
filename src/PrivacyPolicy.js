import React, { useEffect } from "react";
import useSWR from "swr";

import { ServerError } from "./Common";

function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy of Song Search";
  });
  const { data, error } = useSWR(
    `${process.env.PUBLIC_URL}/static/privacy-policy-text.html`,
    async (url) => {
      const r = await fetch(url);
      if (!r.ok) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`${r.status} on ${url}`);
        }
        throw new Error(`${r.status} on ${url}`);
      }
      return await r.text();
    },
    { revalidateOnFocus: false }
  );

  if (error) {
    return <ServerError />;
  }

  return (
    <div>
      <h2>Privacy Policy</h2>
      {data ? (
        <div dangerouslySetInnerHTML={{ __html: data }}></div>
      ) : (
        <p>
          <i>Loading privacy policy text...</i>
        </p>
      )}
    </div>
  );
}

export default PrivacyPolicy;
