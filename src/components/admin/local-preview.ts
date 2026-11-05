export const isLocalPreview =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname.endsWith(".localhost") ||
    window.location.hostname === "127.0.0.1")
