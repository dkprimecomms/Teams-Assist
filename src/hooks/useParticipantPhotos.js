// src/hooks/useParticipantPhotos.js
import { useEffect, useRef, useState } from "react";
import { getTeamsToken } from "../api/authApi";

export function useParticipantPhotos(participants, apiBaseUrl) {
  const [photoUrlByEmail, setPhotoUrlByEmail] = useState({});
  const objectUrlsRef = useRef([]);

  const emails = (participants || [])
  .map((p) => (p?.email || "").toLowerCase())
  .filter(Boolean);

const emailsKey = emails.join("|");

useEffect(() => {
  // cleanup old blob urls
  objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
  objectUrlsRef.current = [];
  setPhotoUrlByEmail({});

  if (!emailsKey) return;

  let cancelled = false;

  (async () => {
    const token = await getTeamsToken();
    const base = (apiBaseUrl || "").replace(/\/+$/, "");
    const results = {};

    await Promise.all(
      emails.map(async (email) => {
        try {
          const res = await fetch(
            `${base}/graph/photo?userIdOrEmail=${encodeURIComponent(email)}`,
            { method: "GET", headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) return;
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          objectUrlsRef.current.push(url);
          results[email] = url;
        } catch {}
      })
    );

    if (!cancelled) setPhotoUrlByEmail(results);
  })();

  return () => {
    cancelled = true;
  };
}, [emailsKey, apiBaseUrl]);


  return photoUrlByEmail;
}
