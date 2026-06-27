export async function registerServiceWorker() {
  if (typeof window === "undefined") return null
  if (!("serviceWorker" in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register("/sw.js")
    return reg
  } catch (err) {
    console.warn("[Notifications] SW registration failed:", err)
    return null
  }
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined") return "denied"
  if (!("Notification" in window)) return "denied"
  if (Notification.permission === "granted") return "granted"
  if (Notification.permission === "denied") return "denied"
  return await Notification.requestPermission()
}

export function canNotify() {
  if (typeof window === "undefined") return false
  return "Notification" in window && Notification.permission === "granted"
}

export function showLocalNotification(title, options = {}) {
  if (!canNotify()) return
  try {
    new Notification(title, {
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      ...options,
    })
  } catch {
    // Notification constructor may fail in some contexts
  }
}
