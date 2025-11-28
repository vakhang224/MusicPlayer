// src/helpers/url.ts
export const normalizeUrl = (raw?: string) => {
  if (!raw) return "";
  try {
    const s = String(raw).trim();

    // If absolute http/https URL, try decode then re-encode to normalize percent-encoding
    if (/^https?:\/\//i.test(s)) {
      try {
        const decoded = decodeURI(s);
        return encodeURI(decoded);
      } catch {
        return encodeURI(s);
      }
    }

    // For relative paths or other strings, encode safely
    try {
      return encodeURI(s);
    } catch {
      return s;
    }
  } catch (e) {
    return String(raw);
  }
};

export default normalizeUrl;
