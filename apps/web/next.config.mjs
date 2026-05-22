import path from "node:path";
import { fileURLToPath } from "node:url";

// apps/web imports the shared engine from ../../packages/core. Point Turbopack
// and output-file tracing at the monorepo root so that sibling package is in scope.
const monorepoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
);

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    turbopack: {
        root: monorepoRoot,
    },
    outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
