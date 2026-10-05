# Centralized Engineering 80/20 History

## [2026-10-05] — Inspection Pipeline Timing Audit & Localhost Fix

**Changed:**
Added high-resolution `performance.now()` instrumentation to `scans.ts` and `pipeline.service.ts`. Fixed IPv4 (`127.0.0.1`) CORS routing in `app.ts` and `api.ts`.

**Why:**
The MySS inspection analysis took 1–2 minutes due to unmeasured, stacked synchronous API calls. Browser fetches were also failing locally due to Windows Chrome resolving `localhost` to IPv6 (`::1`) while Fastify listened on IPv4 (`0.0.0.0`).

**How:**
A global `Map` tracks timestamps across upload and analysis stages to print a complete timeline. Bypassed IPv6 DNS issues by explicitly addressing `127.0.0.1:8000`.

**Problem solved:**
Identified pipeline stage latencies and resolved browser-side `Failed to fetch` errors on local execution.

**Key concept:**
*IPv4/IPv6 Dual-Stack Binding.* On Windows, Node applications bound to `0.0.0.0` may not accept Chrome's default `::1` IPv6 preflight requests, necessitating explicit loopback addressing or dual-stack sockets.

**Remember:**
Always measure before optimizing, and use explicit IPv4 loopbacks (`127.0.0.1`) when debugging local web API connectivity.
