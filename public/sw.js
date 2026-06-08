// Service worker מינימלי – מאפשר התקנה כ-PWA (סעיף 13).
// מעבר רשת רגיל (passthrough) כדי לא לשמור במטמון תוכן מאומת/מחירים ישנים.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // קיום מאזין fetch מספיק לקריטריון ההתקנה; הדפדפן מטפל בבקשה כרגיל.
});
