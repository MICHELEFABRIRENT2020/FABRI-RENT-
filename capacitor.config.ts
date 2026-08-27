import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Mobile app shell (section 19). This is a Next.js server-rendered app,
 * not a static site, so Capacitor is configured in "hosted" mode: the
 * native WebView loads the live deployed URL directly instead of
 * bundling a static `www/` build - the standard Capacitor pattern for
 * wrapping a server-rendered web app for App Store / Play Store
 * distribution (see MOBILE.md for the full read on what this does and
 * does not get you).
 *
 * CAPACITOR_SERVER_URL must be a real https:// production URL before
 * building for release - localhost/dev URLs only work for local testing
 * with the device on the same network.
 */
const config: CapacitorConfig = {
  appId: "it.fabrigroup.rentmanager",
  appName: "FabriGroup Rent Manager",
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "http://localhost:3000",
    cleartext: process.env.CAPACITOR_SERVER_URL ? false : true,
  },
};

export default config;
