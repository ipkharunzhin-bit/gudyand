import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "jsonwebtoken"],
};

export default nextConfig;