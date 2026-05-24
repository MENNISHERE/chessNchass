/**
 * Resolves the backend API Host dynamically for Web dashboards vs Native Mobile environments.
 */
export function getApiUrl(path: string): string {
  const currentOrigin = window.location.origin;

  // Let's check if the frontend is loaded in a Native WebView context
  const isWebviewContext =
    currentOrigin.includes("capacitor") ||
    currentOrigin.includes("file://") ||
    currentOrigin.includes("localhost:8080") ||
    currentOrigin.includes("localhost:5173") ||
    currentOrigin.includes("localhost:1111");

  // If in Native WebView, point directly to our deployed scalable secure production backend
  const backendBase = isWebviewContext
    ? "https://ais-dev-mo5fjxhqrsqucen3q26oe3-376304965448.asia-east1.run.app"
    : ""; // Use local container relative paths for standard web view

  return `${backendBase}${path}`;
}
