import type { NextConfig } from "next";
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  transpilePackages: ["zimankit"],
  devIndicators: false,
};
export default config;
