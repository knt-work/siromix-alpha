import { URL } from "node:url";

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};

export default config;
