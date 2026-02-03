import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.localhost"],
  serverExternalPackages: ["pdfjs-dist"],
};

export default withNextIntl(nextConfig);
