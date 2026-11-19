# Architect3D — Interactive System Design & Cloud Infrastructure Textbook

**Architect3D** is an interactive technical textbook for system design and cloud infrastructure. Every topic pairs a calm, structured reading view with an on-demand, full-screen **3D architecture lab** where you can watch traffic flow, inject failures and see how the system responds.

It covers **8 modules · 34 topics · 34 interactive 3D models · 170+ interview questions**, from public/private/hybrid cloud networking through to end-to-end designs of a URL shortener, Netflix-style streaming, Uber-style ride matching and WhatsApp-style chat.

> **Live demo:** **[systemdesign3d-app.pages.dev](https://systemdesign3d-app.pages.dev)** — try a lab directly: [VPN vs. Direct Connect with a link failure](https://systemdesign3d-app.pages.dev/topics/m1/vpn-direct-connect/lab?link=vpn&failure=1&rate=80)
>
> **Source:** [github.com/hamaadghafar/architect3d-system-design](https://github.com/hamaadghafar/architect3d-system-design)

---

## Features

- **Reading-first layout** — spacious lesson pages (78-character measure, 17px body text) split into five sections: *What & Why*, *Where & How*, *Cloud Models*, *Real-World Examples* and *Interview Q&A*, with a sticky section jump bar.
- **Full-screen 3D lab per topic** — launched from any lesson; orbit freely (including from below), use the rotation pad / arrow keys, view presets (Top, Front, Side, Below) and auto-rotate.
- **Live simulations** — architecture-mode toggles (e.g. Direct Connect vs. Site-to-Site VPN, L4 vs. L7, CP vs. AP), a traffic-rate slider and failure injection (AZ outage, link cut, node crash, poison message, network partition…), with live telemetry and narration.
- **Uncluttered 3D** — one short label per component; technical details (CIDRs, ASNs, status) appear in an inspector when you hover or click a node. The camera auto-frames each topology.
- **Public vs. private vs. hybrid cloud** comparison for every topic, real production case studies (Netflix, Cloudflare, Stripe, Uber, Discord, Slack…) and interview questions tagged *Junior/Mid*, *Senior* and *Staff* with model answers, follow-up edge cases and interviewer red flags.
- **Fully offline / asset-free** — every 3D model is generated procedurally from Three.js geometry; no external models, fonts or APIs.

### Curriculum

| # | Module | Topics |
|---|---|---|
| 1 | Cloud Infrastructure Foundations | Public, private & hybrid cloud · Site-to-Site VPN vs. Direct Connect · VPC Peering & Transit Gateway |
| 2 | Networking & Traffic Routing | DNS · Anycast · CDN edge caching · L4 vs. L7 load balancers · Reverse proxy & API gateway |
| 3 | Compute & Scaling | Vertical vs. horizontal · Auto Scaling Groups · Containers & Kubernetes · Serverless |
| 4 | Databases & Storage | SQL vs. NoSQL · Read replicas · Consistent hashing ring · CAP theorem · Object vs. block storage |
| 5 | Caching & Performance | Cache-aside · Write-through/behind/around · Redis Cluster · Eviction & cache stampede |
| 6 | Messaging & Event Streaming | Message queues · Kafka partitions & consumer groups · Pub/Sub · Dead-letter queues |
| 7 | Reliability & Resilience | Circuit breakers · Token-bucket rate limiting · Active-active vs. active-passive multi-region |
| 8 | Real-World Architectures | URL shortener · Video streaming · Geospatial ride matching · Real-time chat |

---

## Tech stack

| Area | Technology |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS 4 |
| 3D | Three.js 0.187, React Three Fiber 9, drei 10 |
| State | Zustand 5 |
| Build / tooling | Vite 8, TypeScript (strict), oxlint |
| Hosting | Cloudflare Pages (static SPA) |

---

## Getting started

**Prerequisites:** Node.js **20.19+ or 22.12+** (required by Vite 8) and npm.

```bash
git clone https://github.com/hamaadghafar/architect3d-system-design.git
cd architect3d-system-design
npm install
npm run dev        # http://localhost:5173
```

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) and produce the production bundle in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

### Routes

| Path | View |
|---|---|
| `/` | Curriculum home (8-module grid) |
| `/topics/:moduleId/:topicId` | Lesson reading view (`#interview`, `#cloud-models`… jump to a section) |
| `/topics/:moduleId/:topicId/lab` | Full-screen 3D lab |

Simulation state can be preset with query parameters, e.g. `/topics/m1/vpn-direct-connect/lab?link=vpn&failure=1&rate=80`.

---

## Architecture highlights

```
src/
  App.tsx                    Route switch; keeps the simulation store in sync with the URL
  router.tsx                 Minimal History-API router (no dependency) with scroll restoration
  layout/                    Top navbar, breadcrumb, curriculum drawer
  pages/                     HomePage, TopicPage (reading), LabPage (full-screen 3D)
  components/lesson/         Section, callout, cloud-model grid, examples, interview accordion
  components/three/          ServerNode, NetworkLink, PacketFlow, DataPacket, CloudZoneBox, CameraRig, SceneStage
  scenes/module1..module8/   One procedural 3D scene per topic + telemetry/narration entries
  scenes/sceneLogic.ts       Pure simulation logic (failover, hashing, quotas) shared by scenes & telemetry
  store/useSystemStore.ts    Zustand store: UI ↔ 3D simulation state
  content/                   Curriculum data (fundamentals, cloud models, examples, interview bank)
```

- **Render-loop discipline.** Continuous animation (packets, pulsing nodes, camera flights) mutates refs inside `useFrame`; simulation values are read transiently with `useSystemStore.getState()`, so dragging the traffic slider never re-renders the 3D tree and `setState` is never called per frame.
- **Shared geometry & materials.** Packets share a single sphere geometry; materials are created once per node and recoloured in place.
- **Layout system for 3D.** A spacing context widens every scene uniformly in the lab, and nodes/zones register their bounds so the camera rig can auto-frame any topology at ~75% of the viewport.
- **Content as data.** All lesson text, cloud comparisons, examples and interview questions are typed data (`Topic` interface), so pages and the 3D registry are generated from one source of truth.
- **Static, CDN-friendly output.** The build is a pure static SPA; WebGL is only initialised when a user opens a 3D lab.

---

## Deployment (Cloudflare Pages)

The live site is the Cloudflare Pages project `systemdesign3d-app`, connected to this GitHub repo: **every push to `main` builds and deploys automatically**, and other branches get preview URLs. Build settings:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION=22` |

Client-side routes work on refresh because Cloudflare Pages serves `index.html` for unknown paths when the project has no top-level `404.html` (single-page-application mode).

To deploy manually from the CLI instead (e.g. to a separate project), use Wrangler:

```bash
npx wrangler login                 # once per machine
npm run build
npx wrangler pages deploy dist --project-name <project-name> --branch main
```

---

## License

Released for learning and portfolio purposes. Add a license file (e.g. MIT) if you intend others to reuse the code.
