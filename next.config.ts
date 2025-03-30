import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
};

export default nextConfig;
// Note: The `output: "standalone"` option is used to build a standalone server for deployment.