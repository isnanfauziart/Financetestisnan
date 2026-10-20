export const SITE_LINKS = Object.freeze({
  webApp: "/dashboard",
  upgrade: "/upgrade",
  playStore: null,
  get playStoreAvailable() {
    return Boolean(this.playStore)
  },
  androidApk: "/api/download-apk",
  get androidApkAvailable() {
    return Boolean(this.androidApk)
  },
  privacy: "/privacy",
  terms: "/terms",
})
