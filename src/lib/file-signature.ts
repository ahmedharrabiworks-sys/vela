// Security audit Part 4 (file upload security): every upload path in this
// codebase validated file type by trusting the CLIENT-ASSERTED MIME string
// (either a FormData File's .type, or the label a caller put in a
// "data:image/png;base64,..." URI prefix) with no check of the real file
// content. That label is fully attacker-controlled and proves nothing about
// what bytes actually follow. This checks real magic-byte signatures
// instead, so a mislabeled/malicious payload is rejected before it's ever
// sent to OpenAI's API, embedded into a published website's HTML, or (PDF)
// parsed by pdf-parse.
//
// Deliberately does NOT attempt full format validation (e.g. actually
// decoding the image) -- that would be its own attack surface and cost.
// Checking the first few real bytes against each format's fixed magic
// number is the standard, low-cost first line of defense recommended for
// exactly this kind of upload.

export type ImageKind = "jpeg" | "png" | "webp" | "gif" | "bmp";

const SIGNATURES: Record<ImageKind, (buf: Buffer) => boolean> = {
  jpeg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png:  (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  gif:  (b) => b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  bmp:  (b) => b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d,
  webp: (b) => b.length >= 12
    && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 // "RIFF"
    && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50, // "WEBP"
};

/** True if `buf`'s real leading bytes match a genuine image file of one of `allowed` kinds. */
export function isRealImage(buf: Buffer, allowed: ImageKind[]): boolean {
  return allowed.some((kind) => SIGNATURES[kind]?.(buf));
}

/** True if `buf`'s real leading bytes are a genuine PDF ("%PDF-"). */
export function isRealPdf(buf: Buffer): boolean {
  return buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-";
}
