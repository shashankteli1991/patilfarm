import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client"],
  // Allow accessing the dev server from the local network (e.g. http://192.168.1.39:3000).
  // Without this, Next.js dev blocks the client JS bundles for cross-origin hosts and
  // client-side features (Add to Cart, admin login) silently stop working.
  // Uses wildcard segment patterns (strings only) so DHCP IP changes on the
  // local subnet don't break LAN access.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
  ],
};

export default nextConfig;
