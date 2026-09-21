import crypto from "crypto";

/**
 * Parses and verifies Meta's "signed_request" format -- used by the
 * Deauthorize Callback and Data Deletion Request callbacks (a general Meta
 * platform mechanism, not Instagram-specific). Confirmed against Meta's
 * current docs (developers.facebook.com/docs/development/create-an-app/
 * app-dashboard/data-deletion-callback) plus cross-checked against
 * independent community references for the deauthorize side, since Meta's
 * own docs site did not have a dedicated current page for it separate from
 * data deletion -- both use the identical signed_request mechanism.
 *
 * Format: "<base64url signature>.<base64url JSON payload>"
 * Signature = HMAC-SHA256(the base64url payload STRING, app secret) -- the
 * signature covers the still-encoded payload text, not the decoded JSON
 * (this detail matters: signing the wrong thing makes every request fail
 * verification even though decoding "works").
 */
export interface SignedRequestPayload {
  algorithm?: string;
  issued_at?: number;
  expires?: number;
  user_id?: string | number;
  [key: string]: unknown;
}

export function parseSignedRequest(signedRequest: string, appSecret: string): SignedRequestPayload | null {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;
  const [encodedSig, encodedPayload] = parts;
  if (!encodedSig || !encodedPayload) return null;

  let sig: Buffer;
  let payloadJson: string;
  try {
    sig = Buffer.from(encodedSig, "base64url");
    payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expectedSig = crypto.createHmac("sha256", appSecret).update(encodedPayload).digest();
  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) {
    return null;
  }

  try {
    const payload = JSON.parse(payloadJson) as SignedRequestPayload;
    if (payload.algorithm && payload.algorithm !== "HMAC-SHA256") return null;
    return payload;
  } catch {
    return null;
  }
}
