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

// dev -> .next, build & start -> .next-build. Keeping the production build in a
// separate output dir means `next build` can never clobber a live `next dev`
// server's `.next` (which 500s every route until restarted). The phase string
// is compared as a literal ("phase-development-server" === PHASE_DEVELOPMENT_SERVER)
// to avoid importing next/constants, which fails to resolve under this setup.
export default (phase) => ({
    ...nextConfig,
    distDir: phase === "phase-development-server" ? ".next" : ".next-build",
});
