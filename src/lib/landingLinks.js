export const SITE_LINKS = Object.freeze({
  webApp: "/dashboard",
  upgrade: "/upgrade",
  playStore: null,
  get playStoreAvailable() {
    return Boolean(this.playStore)
  },
  privacy: "/privacy",
  terms: "/terms",
})
