import { createRemoteJWKSet, jwtVerify } from "jose";

const TENANT_ID = process.env.AAD_TENANT_ID; // e.g. your tenant GUID
const EXPECTED_AUD = process.env.AAD_CLIENT_ID; // the aud you saw in the token

// Use tenant-specific issuer + jwks for stronger validation
const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;
const JWKS = createRemoteJWKSet(
  new URL(`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`)
);

export const handler = async (event) => {
  try {
    const auth = event.headers?.authorization || event.headers?.Authorization;
    if (!auth?.startsWith("Bearer ")) {
      return json(401, { error: "Missing Bearer token" });
    }
    const token = auth.slice("Bearer ".length);

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: EXPECTED_AUD,
    });

    // Return a small subset for now
    return json(200, {
      ok: true,
      aud: payload.aud,
      iss: payload.iss,
      oid: payload.oid,
      tid: payload.tid,
      upn: payload.preferred_username,
      name: payload.name,
      scp: payload.scp, // scopes (if present)
    });
  } catch (e) {
    return json(401, { ok: false, error: String(e?.message || e) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}
