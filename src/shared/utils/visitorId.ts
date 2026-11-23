const visitorStorageKey = 'fl_visitor_id';

export function getVisitorId(): string | null {
  try {
    const existingId = window.localStorage.getItem(visitorStorageKey);
    if (existingId) return existingId;

    const visitorId = window.crypto.randomUUID();
    window.localStorage.setItem(visitorStorageKey, visitorId);
    return visitorId;
  } catch {
    return null;
  }
}
