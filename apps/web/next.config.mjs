import { fileURLToPath } from "node:url";
const nextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  turbopack: { root: fileURLToPath(new URL("../../", import.meta.url)) },
};

export default nextConfig;
