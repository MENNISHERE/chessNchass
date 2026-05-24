/**
 * Resolves the backend API Host dynamically for Web dashboards, Native Mobile environments, and external hosting (Vercel).
 */
export function getApiUrl(path: string): string {
  const currentOrigin = window.location.origin;

  // Check if we are running directly on our local dev server or our direct Cloud Run workspace origins
  const isDirectBackend =
    currentOrigin.includes("376304965448.asia-east1.run.app") ||
    currentOrigin.includes("localhost:3000") ||
    currentOrigin.includes("127.0.0.1:3000") ||
    currentOrigin.includes("0.0.0.0:3000");

  // If we are NOT running directly on the same host (e.g. deployed to Vercel, Netlify, or in a Mobile WebView context),
  // then we route all requests to our live, scalable, and secure deployment to bypass 404s.
  const backendBase = !isDirectBackend
    ? "https://ais-pre-mo5fjxhqrsqucen3q26oe3-376304965448.asia-east1.run.app"
    : "";

  return `${backendBase}${path}`;
}
