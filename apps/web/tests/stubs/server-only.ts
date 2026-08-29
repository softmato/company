/**
 * Stands in for the `server-only` package under vitest.
 *
 * The real package throws unless the bundler resolves it under React's
 * `react-server` condition. Vitest sets no such condition, so importing any
 * module that guards itself with `server-only` fails at import time — which
 * would leave the CMS queries, the metadata builders and the whole SEO layer
 * permanently untestable.
 *
 * The guard is a build-time boundary, not a runtime behaviour: there is
 * nothing here to reproduce. An empty module is the whole stub.
 */
export {};
