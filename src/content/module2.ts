import type { Topic } from '../types';

/* Module 2 — Networking & Traffic Routing */

const dns: Topic = {
  id: 'dns',
  title: 'DNS Resolution',
  tagline: 'The Internet’s distributed, cached phone book — and the first routing decision every request makes.',
  sceneId: 'dns',
  camera: { position: [-2, 18, 23], target: [-2, 0.5, 0] },
  controls: {
    traffic: true,
    cache: true,
    failureLabel: 'ns1 authoritative',
    hint: 'Toggle the resolver cache to MISS to watch the full root → TLD → authoritative walk. Then fail ns1 and see the resolver fall back to ns2.',
  },
  fundamentals: {
    what: 'The **Domain Name System** maps human-readable names (`api.example.com`) to records — IP addresses (`A`/`AAAA`), aliases (`CNAME`), mail servers (`MX`), text (`TXT`), name servers (`NS`) and more. It is a **hierarchical, distributed, heavily cached** database: root servers delegate to top-level domains (`.com`), which delegate to the **authoritative** name servers for each domain. **Recursive resolvers** (your ISP, 8.8.8.8, 1.1.1.1) do the lookup work on behalf of clients and cache answers for their **TTL**.',
    why: 'Names decouple clients from infrastructure: you can change IPs, move providers, or route users to different data centres without changing clients. Caching at every layer makes DNS scale to the whole Internet — the vast majority of lookups are answered from cache. Managed DNS providers add **traffic steering** (latency-based, geo, weighted, failover) so DNS becomes the first load-balancing decision in a request’s life.',
    where: 'Every Internet request. In system design it appears as: global traffic management (route users to the nearest healthy region), blue/green and weighted rollouts, failover between regions, service discovery inside clusters (CoreDNS in Kubernetes, Consul), and as a critical dependency to design redundancy around.',
    how: [
      'The browser checks its own DNS cache, then asks the **OS stub resolver**, which checks its cache and the hosts file.',
      'On a miss, the stub sends a recursive query (UDP/53, or encrypted DoH/DoT) to the configured **recursive resolver**.',
      'If the resolver has the answer cached and the TTL has not expired, it replies immediately — the common case.',
      'Otherwise it asks a **root server**, which returns a referral to the `.com` TLD servers (NS records plus glue IPs).',
      'It asks a **.com TLD server**, which returns a referral to the domain’s authoritative servers (`ns1/ns2.example.com`).',
      'It asks an **authoritative server**, which returns the record (e.g. `A 93.184.216.34`, TTL 300) — possibly chosen by latency/geo/weighted policy.',
      'The resolver caches every step (including referrals and negative answers) and returns the answer; the client connects to the IP. If an authoritative server does not answer, the resolver retries another NS.',
    ],
    bottlenecks: [
      { problem: 'Hard-coded IPs make migrations and failover painful', solution: 'Clients use names; operators change records (with TTLs) to move traffic.' },
      { problem: 'A single directory server could never handle global lookup volume', solution: 'Hierarchical delegation plus caching at browser, OS, resolver and TLD levels.' },
      { problem: 'Users far from a single region see high latency', solution: 'Latency-based / geo DNS returns the IP of the nearest healthy region.' },
      { problem: 'Region failure', solution: 'Health-checked failover records shift traffic to a standby region within roughly TTL + health-check interval.' },
    ],
    tradeoffs: [
      { aspect: 'TTL length', gain: 'Long TTLs: fewer queries, faster lookups, resilience if authoritative DNS is briefly down.', cost: 'Slow propagation of changes and failover; clients may keep stale IPs.' },
      { aspect: 'Short TTLs', gain: 'Fast failover and traffic shifting.', cost: 'More queries, higher cost and more dependency on authoritative DNS availability. Some resolvers ignore very low TTLs.' },
      { aspect: 'DNS-based load balancing', gain: 'Simple, global, no extra hop.', cost: 'Coarse-grained: caching means you cannot instantly drain a target, and resolver location may not match user location (mitigated by EDNS Client Subnet).' },
      { aspect: 'Single DNS provider', gain: 'Simplicity, one API.', cost: 'Provider outage = your whole site disappears (Dyn 2016). Multi-provider DNS adds sync complexity.' },
    ],
    keyNumbers: [
      { label: 'Root server identities', value: '13 (a–m)' },
      { label: 'Typical record TTL', value: '60–3600 s' },
      { label: 'Cached lookup', value: '~1–20 ms' },
      { label: 'Full recursive lookup', value: '~50–200 ms' },
    ],
  },
  cloud: {
    public: {
      summary: 'Managed authoritative DNS with anycast name servers and routing policies: Amazon Route 53 (latency, geolocation, geoproximity, weighted, failover, multivalue), Google Cloud DNS, Azure DNS and Traffic Manager, Cloudflare DNS. Private hosted zones resolve internal names inside VPCs.',
      stack: ['Route 53 (+ health checks)', 'Google Cloud DNS', 'Azure DNS / Traffic Manager', 'Cloudflare DNS', 'Route 53 private hosted zones'],
      points: [
        'Route 53 uses an anycast network of name servers and offers a 100% availability SLA for its authoritative DNS.',
        'Alias records point a zone apex (`example.com`) at load balancers/CDNs without a CNAME.',
        'Health checks + failover records implement active-passive multi-region designs at the DNS layer.',
      ],
    },
    private: {
      summary: 'On-prem, organisations run authoritative and recursive DNS themselves — BIND, PowerDNS, Unbound, Infoblox, or Microsoft DNS integrated with Active Directory. Split-horizon DNS returns internal IPs to internal clients and public IPs to the Internet.',
      stack: ['BIND / PowerDNS', 'Unbound (recursive)', 'Infoblox (DDI)', 'Active Directory DNS', 'CoreDNS (Kubernetes)'],
      points: [
        'Run at least two authoritative servers on separate networks and power.',
        'Internal resolvers should be anycast or load-balanced so client configs never need to change.',
        'DNSSEC signing and monitoring are your responsibility.',
      ],
    },
    hybrid: {
      summary: 'Hybrid estates need two-way name resolution: cloud workloads must resolve `corp.internal` on-prem names, and on-prem servers must resolve cloud private zones. Route 53 Resolver **inbound** endpoints accept queries from on-prem; **outbound** endpoints with forwarding rules send queries for on-prem domains over VPN/DX.',
      stack: ['Route 53 Resolver inbound/outbound endpoints', 'Azure DNS Private Resolver', 'Conditional forwarders', 'Split-horizon zones'],
      points: [
        'Share resolver rules across accounts (via RAM) so every VPC resolves on-prem names consistently.',
        'DNS traffic rides the private link — if VPN/DX is down, cross-site resolution fails too.',
        'Avoid overlapping zone names between on-prem and cloud private zones.',
      ],
    },
  },
  examples: [
    {
      company: 'Meta (Facebook)',
      headline: 'The 2021 outage that made facebook.com disappear from DNS',
      scale: '~6 hours · billions of users affected',
      detail: 'On October 4, 2021, a configuration change disconnected Facebook’s data centres from its backbone. Its authoritative DNS servers, designed to withdraw their BGP announcements when they lost backbone connectivity, did exactly that — so the rest of the Internet could no longer reach Facebook’s DNS, and every resolver failed to look up its names. Recovery was slowed because internal tools depended on the same systems.',
      lesson: 'DNS is a hard dependency for everything. Its failure modes interact with routing, and your recovery tooling must not depend on the system that is down.',
    },
    {
      company: 'Dyn',
      headline: 'A DDoS on one DNS provider takes down major sites',
      scale: 'October 2016 · Mirai IoT botnet',
      detail: 'A massive DDoS from the Mirai botnet against managed DNS provider Dyn made sites like Twitter, GitHub, Netflix and Reddit unreachable for many users across hours, even though their own servers were healthy — their only authoritative DNS was Dyn.',
      lesson: 'Your availability is capped by your DNS provider’s. Critical domains often use two authoritative DNS providers.',
    },
    {
      company: 'AWS',
      headline: 'A DNS automation race in us-east-1',
      scale: 'October 2025 · widespread multi-service impact',
      detail: 'AWS’s post-event summary for its large October 2025 us-east-1 disruption traced the trigger to a race condition in the automation that manages DynamoDB’s DNS records, which left the regional endpoint’s record empty. Services depending on DynamoDB — including other AWS services — cascaded from there.',
      lesson: 'DNS management is itself a distributed system; automation that edits records needs safeguards against concurrent, stale updates.',
    },
  ],
  interview: [
    {
      question: 'Walk me through what happens when you type a URL into the browser, up to the point the TCP connection opens.',
      difficulty: 'Junior/Mid',
      answer: [
        'The browser parses the URL and checks its DNS cache. On a miss it asks the OS stub resolver, which checks its cache and the hosts file, then sends a recursive query to the configured resolver (ISP, corporate, or public like 1.1.1.1), possibly over DoH.',
        'The resolver answers from cache if possible. Otherwise it iterates: root → referral to the TLD; TLD → referral to the domain’s authoritative NS; authoritative → the actual record with a TTL. It caches each step and returns the IP.',
        'The browser then opens a TCP connection (3-way handshake) — or QUIC for HTTP/3 — to that IP on port 443, followed by the TLS handshake. Mention that the record may have been chosen by latency/geo policy, and could be a CDN or load balancer IP rather than a server.',
      ],
      followUps: [
        { q: 'What is the difference between a recursive and an authoritative server?', a: 'Authoritative servers hold the zone data and answer for their domains only. Recursive resolvers answer any query by walking the hierarchy and caching results; they hold no zones of their own.' },
        { q: 'Why is DNS mostly UDP?', a: 'Small, single-packet request/response with low overhead. It falls back to TCP for large responses (truncation bit), zone transfers, and is increasingly encrypted over TLS/HTTPS.' },
      ],
      redFlags: ['Saying the browser asks the root server directly.', 'Forgetting caching entirely.'],
    },
    {
      question: 'How would you choose TTLs for your records, and how do you migrate a service to new IPs with minimal disruption?',
      difficulty: 'Junior/Mid',
      answer: [
        'TTL is a trade-off between agility and load/resilience. Stable records (MX, NS) can use hours; records you might need to fail over use 30–300 s. Very low TTLs increase query volume and dependence on DNS availability, and some resolvers enforce minimums.',
        'Migration: (1) well before the change, **lower the TTL** (e.g. 3600 → 60) and wait at least the old TTL so caches pick it up; (2) bring up the new endpoint and run both in parallel; (3) switch the record — optionally weighted (10% → 50% → 100%); (4) keep the old endpoint running for a while because some clients cache beyond TTL; (5) raise the TTL again.',
      ],
      followUps: [{ q: 'Why keep the old servers after the switch?', a: 'Misbehaving resolvers, long-lived connections, JVM DNS caching and hard-coded IPs mean some traffic arrives after the TTL. Monitor the old endpoint until traffic drains.' }],
      redFlags: ['Changing records without first lowering TTL.', 'Assuming every client respects TTL exactly.'],
    },
    {
      question: 'How does DNS-based global load balancing work, and what are its limits?',
      difficulty: 'Senior',
      answer: [
        'The authoritative DNS returns different answers per query: **latency-based** (the region with lowest measured latency from the resolver’s network), **geolocation** (by country/continent), **weighted** (percentages), or **failover** (primary unless health checks fail). Health checks remove unhealthy endpoints from answers.',
        'Limits: (1) **Caching** — changes take effect only after TTLs expire, and some clients cache longer. (2) **Resolver ≠ user location** — a user using a distant public resolver gets routed by the resolver’s location; **EDNS Client Subnet** mitigates this. (3) **Coarse granularity** — DNS cannot balance per request or per connection; one big resolver can direct many users to one region. (4) It is not aware of real-time capacity unless you feed it.',
        'For fast failover and finer control, combine DNS with **anycast** front doors (Global Accelerator, Cloudflare, GCP global LB) that make routing decisions per connection.',
      ],
      followUps: [{ q: 'How fast is DNS failover in practice?', a: 'Health-check detection (e.g. 3 × 10 s) + TTL (e.g. 60 s) + client caching quirks: usually 1–3 minutes for most traffic, with a long tail.' }],
      redFlags: ['Claiming DNS failover is instant.', 'Not knowing about resolver location vs user location.'],
    },
    {
      question: 'Your company’s DNS provider has an outage. How do you design to survive it?',
      difficulty: 'Senior',
      answer: [
        'Use **two independent authoritative DNS providers** (e.g. Route 53 + Cloudflare/NS1), listing name servers from both in the domain’s NS records at the registrar. Resolvers retry other NS records when one provider does not respond, so availability is the union of both.',
        'Keep zones in sync from a single source of truth (DNS-as-code, OctoDNS/Terraform) and avoid provider-specific features that cannot be replicated (or accept that advanced routing degrades to simple records on the secondary). DNSSEC with multiple providers requires multi-signer coordination.',
        'Also use **reasonably long TTLs** on critical records so caches carry you through short outages, and protect the registrar account (registry lock, MFA) — hijacked NS records are worse than an outage.',
      ],
      followUps: [{ q: 'Why not just set TTLs to a day?', a: 'You would survive DNS outages better but lose the ability to fail over or shift traffic quickly. Use long TTLs on stable records and moderate TTLs where agility matters.' }],
      redFlags: ['Single provider for a critical domain with no plan.', 'Forgetting the registrar as a single point of failure.'],
    },
    {
      question: 'Explain negative caching and how a typo in a DNS deployment can cause an outage that outlives the fix.',
      difficulty: 'Senior',
      answer: [
        'When a resolver receives NXDOMAIN (name does not exist) or NODATA, it caches that **negative** answer for a duration based on the zone’s SOA record (the minimum/negative TTL). If you briefly delete or misname a record, resolvers cache the non-existence, and even after you fix it clients keep getting NXDOMAIN until the negative cache expires.',
        'Similarly, publishing a wrong IP with a long TTL keeps sending users to the wrong place long after the fix. Mitigations: validate changes before publishing (lint, dry-run, staged rollout to one record first), keep negative TTLs modest, and treat DNS changes like code deploys with review and rollback plans.',
      ],
      followUps: [{ q: 'Can you flush other people’s resolver caches?', a: 'Not generally. Some public resolvers (Google, Cloudflare) provide cache purge tools, but ISP resolvers and client caches will expire on their own schedule.' }],
      redFlags: ['Assuming fixing the record fixes users immediately.'],
    },
    {
      question: 'Design the DNS architecture for a global SaaS with multi-region active-active deployment, hybrid on-prem integration and Kubernetes service discovery.',
      difficulty: 'Staff',
      answer: [
        '**Public**: authoritative zones on two providers; latency-based records with health checks to regional anycast/global load balancers (or a global anycast front door that DNS points at); weighted records for progressive rollouts; moderate TTLs (60–300 s). Registrar lock, DNSSEC with multi-signer support, DNS-as-code with CI validation.',
        '**Private/cloud**: private hosted zones per environment shared across accounts; Route 53 Resolver inbound/outbound endpoints with forwarding rules to on-prem (`corp.internal`) and from on-prem to cloud zones, deployed in multiple AZs.',
        '**Cluster**: CoreDNS for in-cluster service discovery, NodeLocal DNSCache to reduce latency and conntrack issues, ExternalDNS to publish ingress records automatically. **Observability**: query logging, resolution latency/SERVFAIL metrics, synthetic lookups from many regions, alerts on NXDOMAIN spikes.',
        '**Failure planning**: document behaviour when each layer fails (provider, resolver endpoints, VPN/DX) and test it — DNS is usually the dependency nobody drills.',
      ],
      followUps: [{ q: 'What is the ndots problem in Kubernetes?', a: 'With `ndots:5` default, a lookup like `api.example.com` is first tried with each search domain suffix, multiplying queries. Use fully qualified names (trailing dot) or tune ndots for external-heavy workloads.' }],
      redFlags: ['Only covering public DNS.', 'No validation or testing of DNS changes.'],
    },
  ],
};

const anycast: Topic = {
  id: 'anycast',
  title: 'Anycast Routing',
  tagline: 'Announce one IP address from many places at once and let BGP deliver every user to the nearest one — the foundation of CDNs, public DNS and DDoS absorption.',
  sceneId: 'anycast',
  camera: { position: [0, 9, 18], target: [0, 5.6, 0] },
  controls: {
    traffic: true,
    failureLabel: 'Frankfurt PoP',
    variants: [
      { id: 'anycast', label: 'Anycast' },
      { id: 'unicast', label: 'Unicast (single origin)' },
    ],
    hint: 'Compare Anycast with Unicast and watch average distance and RTT in the telemetry panel. Then withdraw Frankfurt: London and Lagos reroute to the next-best PoP with no DNS change.',
  },
  fundamentals: {
    what: '**Anycast** is a routing technique where the **same IP prefix is announced via BGP from multiple locations**. Routers on the Internet pick the “best” path to that prefix according to BGP (usually the shortest AS path and the operator’s routing policy), so each user’s packets reach a topologically nearby site. Contrast with **unicast** (one IP = one location), multicast (one-to-many) and broadcast.',
    why: 'Anycast reduces latency (users hit a nearby PoP), provides **automatic failover** (if a site withdraws its announcement, traffic shifts to the next-best site in seconds, with no DNS change) and **spreads load and DDoS attacks** across the whole network instead of concentrating them on one site. It requires no client-side logic: the client sees a single IP.',
    where: 'Public DNS resolvers (1.1.1.1, 8.8.8.8) and root servers; authoritative DNS (Route 53, Cloudflare); CDNs and reverse-proxy networks (Cloudflare, Fastly); global load balancers (Google Cloud global external LB, AWS Global Accelerator); DDoS scrubbing services.',
    how: [
      'An operator obtains a prefix (e.g. `1.1.1.0/24` — /24 is the smallest IPv4 prefix generally accepted on the Internet) and configures it on servers in every PoP.',
      'Each PoP’s routers announce the prefix to their transit providers and peers via **BGP**.',
      'Every Internet router chooses one best path to the prefix based on BGP attributes (local preference, AS-path length, etc.). Different parts of the Internet end up pointing to different PoPs.',
      'A user’s packets follow their ISP’s best path — usually to a nearby PoP, but “nearest” is in **routing** terms, not strictly geographic.',
      'Within the PoP, ECMP routers and L4 load balancers spread flows across servers; the server answers from the same anycast IP.',
      'If a PoP fails health checks or is overloaded, it **withdraws** its announcement; BGP reconverges and traffic flows to the next-best PoP, typically in seconds.',
      'Because routes can change mid-connection, stateful protocols (TCP) on anycast need care: routes are usually stable, and providers use techniques to keep flows on the same PoP or tolerate the occasional reset.',
    ],
    bottlenecks: [
      { problem: 'Users far from a single origin suffer high RTT', solution: 'Many PoPs share one IP; each user reaches a nearby one.' },
      { problem: 'DDoS traffic overwhelms a single site', solution: 'Attack traffic is split across all PoPs according to its sources, diluting it.' },
      { problem: 'DNS-based failover is slow due to caching', solution: 'Withdrawing a BGP route shifts traffic in seconds without touching DNS.' },
      { problem: 'Client configuration for many endpoints', solution: 'One stable IP worldwide (e.g. 1.1.1.1).' },
    ],
    tradeoffs: [
      { aspect: 'Latency', gain: 'Typically much lower RTT for global users.', cost: '“Nearest” follows BGP policy, so some users land on a far PoP (e.g. due to an ISP’s peering choices).' },
      { aspect: 'Control', gain: 'Automatic, client-transparent failover.', cost: 'Limited control over which users go where; traffic engineering uses blunt tools (prepending, communities, selective announcements).' },
      { aspect: 'Stateful traffic', gain: 'Works perfectly for UDP request/response (DNS).', cost: 'Route changes can move a TCP flow to a different PoP mid-connection, breaking it.' },
      { aspect: 'Operations', gain: 'One IP, simple clients.', cost: 'Requires your own ASN/IP space, BGP expertise and a global footprint — or buying it as a service.' },
    ],
    keyNumbers: [
      { label: 'Smallest routable IPv4 prefix', value: '/24' },
      { label: 'Light in fibre', value: '~200 km per ms' },
      { label: 'BGP reconvergence', value: 'seconds' },
      { label: 'Cloudflare network', value: '300+ cities' },
    ],
  },
  cloud: {
    public: {
      summary: 'You can rent anycast without running BGP yourself: AWS Global Accelerator gives you two static anycast IPs that front regional endpoints; Google Cloud’s global external load balancer uses a single anycast IP across Google’s edge; Azure Front Door and Cloudflare provide anycast-fronted L7 proxies; Route 53 and Cloud DNS serve from anycast name servers.',
      stack: ['AWS Global Accelerator', 'GCP Global External LB', 'Azure Front Door', 'Cloudflare', 'Route 53 (anycast NS)'],
      points: [
        'Global Accelerator moves users onto the AWS backbone at the nearest edge, then routes to the closest healthy region.',
        'Anycast front doors make multi-region failover a routing decision instead of a DNS TTL wait.',
        'AWS also supports **BYOIP**: advertising your own prefixes from AWS.',
      ],
    },
    private: {
      summary: 'Inside private networks, anycast is common for infrastructure services: internal DNS resolvers, NTP and load-balancer VIPs. Each site announces the service IP into the corporate routing protocol (BGP/OSPF), often from the servers themselves via a routing daemon that withdraws the route on health-check failure.',
      stack: ['BGP on hosts (BIRD / FRR / ExaBGP)', 'OSPF', 'Internal anycast DNS', 'ECMP routing'],
      points: [
        'Pair the route announcement with health checks so a broken server stops attracting traffic.',
        'Internal anycast DNS lets every client use the same resolver IP at every site.',
      ],
    },
    hybrid: {
      summary: 'In hybrid estates anycast front doors (Cloudflare, Global Accelerator, Front Door) can route users to either on-prem or cloud origins, making migrations a routing configuration change. Internally, anycast resolver IPs can exist both on-prem and in VPCs.',
      stack: ['Cloudflare with on-prem origins', 'Global Accelerator custom routing', 'Cloudflare Magic Transit', 'BGP over Direct Connect'],
      points: [
        'Magic Transit-style services announce your on-prem prefixes from the provider’s anycast network, scrub DDoS traffic, and tunnel clean traffic back to you.',
        'Gradual migration: front both origins with one anycast IP and shift weights.',
      ],
    },
  },
  examples: [
    {
      company: 'Cloudflare',
      headline: '1.1.1.1 and an anycast network that absorbs record DDoS attacks',
      scale: '300+ cities · every server announces the same prefixes',
      detail: 'Cloudflare’s public resolver 1.1.1.1 (launched in 2018) and its entire proxy network are anycast: every PoP announces the same IP ranges. This lets it mitigate very large DDoS attacks — such as the 2023 HTTP/2 “Rapid Reset” attacks peaking above 200 million requests per second — by spreading them over the whole network.',
      lesson: 'Anycast turns a global footprint into a giant shock absorber: attack traffic is divided by the number of PoPs it lands on.',
    },
    {
      company: 'DNS root servers',
      headline: '13 identities, well over a thousand instances',
      scale: 'Every Internet lookup ultimately depends on them',
      detail: 'There are only 13 root server identities (a.root-servers.net to m.root-servers.net), a historical limit of UDP packet size, but they are served by well over a thousand anycast instances worldwide operated by 12 organisations. This is why the root has survived large DDoS attacks without the Internet losing DNS.',
      lesson: 'Anycast lets a fixed logical endpoint scale horizontally across the planet.',
    },
    {
      company: 'Google Cloud',
      headline: 'A single global IP for a load balancer',
      scale: 'One anycast VIP across Google’s global edge',
      detail: 'Google Cloud’s global external load balancer exposes one anycast IP; connections terminate at the nearest Google edge (built on Maglev and GFE), then travel over Google’s private backbone to the closest backend region with capacity, spilling over to other regions when one is full.',
      lesson: 'Combine anycast at the edge with a private backbone and capacity-aware routing to get both low latency and global failover.',
    },
  ],
  interview: [
    {
      question: 'What is anycast, and how is it different from unicast and DNS-based geo-routing?',
      difficulty: 'Junior/Mid',
      answer: [
        '**Unicast**: one IP address identifies one location. **Anycast**: the same IP prefix is announced via BGP from many locations; the Internet’s routing delivers each packet to the “closest” announcement in BGP terms.',
        '**DNS geo-routing** returns different IPs to different users at lookup time, so behaviour depends on resolver location and is subject to TTL caching. Anycast makes the decision per packet in the routing layer, with a single IP for everyone and failover in seconds when a site withdraws its route.',
        'They are often combined: DNS can route coarse-grained to regions while anycast handles the edge.',
      ],
      followUps: [{ q: 'Why is anycast natural for DNS?', a: 'DNS queries are typically a single UDP request and response, so even if routing changes between queries nothing breaks — every PoP can answer independently.' }],
      redFlags: ['Saying anycast picks the geographically nearest server — it picks the BGP-preferred path.'],
    },
    {
      question: 'How does anycast help with DDoS mitigation?',
      difficulty: 'Junior/Mid',
      answer: [
        'Attack traffic from a botnet originates all over the world; with anycast each source’s packets are routed to its nearest PoP, so the attack is **split across many sites** instead of hitting one. Each PoP only has to absorb its share, and has local scrubbing (filters, rate limiting, SYN cookies) to drop malicious traffic close to the source.',
        'A unicast origin, by contrast, receives the entire attack on one set of links. Anycast providers also can withdraw or re-steer announcements to move traffic away from overloaded PoPs.',
      ],
      followUps: [{ q: 'Can a concentrated botnet still overwhelm one PoP?', a: 'Yes, if most attack sources sit behind networks that route to the same PoP. Providers respond with capacity headroom, traffic engineering and selective route changes.' }],
      redFlags: ['Thinking anycast alone filters attacks — it distributes them; filtering still happens at each PoP.'],
    },
    {
      question: 'Can you run TCP services over anycast? What are the risks and mitigations?',
      difficulty: 'Senior',
      answer: [
        'Yes — Cloudflare, Google and others serve HTTP/TCP over anycast at huge scale. The risk is that a **BGP route change mid-connection** moves packets to a different PoP that has no state for that connection, causing a reset.',
        'In practice Internet routes are stable for the duration of most connections, so resets are rare. Mitigations: avoid frequent route flapping (dampening, careful traffic engineering), keep connections short or resumable (HTTP retries, QUIC connection migration/IDs), and at the PoP level use consistent-hashing L4 load balancers so a flow maps to the same server even when routers or servers change.',
      ],
      followUps: [{ q: 'How does QUIC help here?', a: 'QUIC identifies connections by connection ID rather than the 5-tuple, enabling migration across network paths; combined with load balancers that route on connection ID, it is more tolerant of path changes.' }],
      redFlags: ['Claiming TCP over anycast is impossible.', 'Ignoring route stability entirely.'],
    },
    {
      question: 'Users in one country are hitting a PoP on another continent despite a local PoP existing. Why, and how would you fix it?',
      difficulty: 'Senior',
      answer: [
        'Anycast follows BGP policy, not geography. Likely causes: the users’ ISP does not peer with you locally and its transit provider prefers a path to a distant PoP; the local PoP announces the prefix only to some upstreams; AS-path lengths make the distant path look better; or the local PoP was withdrawn for capacity reasons.',
        'Diagnose with traceroutes and looking glasses from the affected ISP, and the PoP’s announcement logs. Fixes: establish **direct peering** with the ISP (or at the local Internet exchange), adjust announcements (prepend on distant PoPs toward that provider, BGP communities to influence upstream preference), or announce more-specific prefixes locally (with care — more-specifics can attract too much traffic).',
      ],
      followUps: [{ q: 'Why not just announce a more specific prefix from the local PoP?', a: 'More-specifics win everywhere they are seen, potentially attracting traffic from far away and breaking the anycast balance. They are a surgical tool with global side effects.' }],
      redFlags: ['Assuming anycast routes by GeoIP.'],
    },
    {
      question: 'How would you build an anycast service on bare metal in your own data centres?',
      difficulty: 'Senior',
      answer: [
        'Obtain an ASN and a provider-independent prefix (≥ /24 IPv4, /48 IPv6), register ROAs in RPKI. In each site, servers run a BGP daemon (BIRD, FRR or ExaBGP) that announces the service IP to the top-of-rack/edge routers **only while a local health check passes**; the edge routers announce the aggregate to upstreams.',
        'Use ECMP at the edge to spread flows across servers, or an L4 load balancer layer with consistent hashing. Monitor announcements and reachability from external vantage points (RIPE Atlas, ThousandEyes). Automate withdrawal for maintenance so draining a site is a single action.',
      ],
      followUps: [{ q: 'Why is RPKI important here?', a: 'RPKI route origin validation lets networks reject announcements of your prefix from unauthorised ASNs, reducing the risk of hijacks or leaks attracting your traffic.' }],
      redFlags: ['Announcing routes without tying them to health checks.'],
    },
    {
      question: 'Design the global front door for a multi-region API: compare DNS latency routing, anycast global load balancing, and combining them.',
      difficulty: 'Staff',
      answer: [
        '**DNS latency routing only**: simple, no extra hop, but failover is bounded by TTL and resolver behaviour, and routing is based on resolver location. **Anycast global LB** (Global Accelerator, GCP global LB, Cloudflare): one IP, client connects to a nearby edge, which then routes over a private backbone to the best healthy region; failover is per connection and fast; TLS can terminate at the edge for lower handshake latency. Costs: extra edge layer, per-GB fees, and dependence on the provider’s edge.',
        '**Combined**: DNS points at the anycast front door (stable, rarely changed records) while health- and capacity-aware routing happens at the edge. Region evacuation becomes an edge traffic-dial change. Keep a break-glass path (direct regional DNS records) in case the front-door provider fails.',
        'Decide based on latency targets, failover RTO, cost, and whether you need L7 features (WAF, caching) at the edge.',
      ],
      followUps: [{ q: 'How do you avoid the front door becoming a single point of failure?', a: 'Multi-provider strategy for DNS, a tested fallback to regional endpoints, and contractual/architectural review of the provider’s blast radius.' }],
      redFlags: ['Picking one option without discussing failover time and blast radius.'],
    },
  ],
};

const cdn: Topic = {
  id: 'cdn',
  title: 'CDN Edge Caching',
  tagline: 'Serve content from caches a few milliseconds from users, shield your origin from load, and keep serving even when the origin is down.',
  sceneId: 'cdn',
  camera: { position: [0, 18, 23], target: [0, 0.5, 0] },
  controls: {
    traffic: true,
    cache: true,
    failureLabel: 'Origin',
    hint: 'Flip the cache to MISS and watch requests travel edge → shield → origin. Then fail the origin: with the cache HIT nobody notices; on MISS the shield serves stale content.',
  },
  fundamentals: {
    what: 'A **Content Delivery Network** is a geographically distributed fleet of reverse-proxy caches (**edge PoPs**) that sit between users and your **origin**. Users are routed (via DNS or anycast) to a nearby PoP, which serves cached responses or fetches them from the origin — often through a mid-tier **origin shield** — and caches them according to HTTP caching rules (`Cache-Control`, `s-maxage`, `ETag`, `Vary`).',
    why: 'Physics: a round trip across an ocean costs 70–150 ms, and TCP + TLS setup multiplies it. Serving from a PoP 10–20 ms away dramatically reduces latency. CDNs also **offload the origin** (a 95%+ hit ratio means the origin serves under 5% of requests), absorb traffic spikes and DDoS attacks, reduce egress costs, and can keep sites up during origin failures with `stale-if-error`.',
    where: 'Static assets (JS, CSS, images, fonts), video segments (HLS/DASH), software downloads, API responses that can be cached briefly, full-page caching for anonymous users, and edge compute (Cloudflare Workers, Lambda@Edge) for personalisation, A/B tests, auth checks and redirects near the user.',
    how: [
      'The user resolves `cdn.example.com`; DNS (geo/latency) or anycast directs them to a nearby edge PoP.',
      'The edge terminates TCP/TLS close to the user (fast handshakes) and computes a **cache key** — typically scheme + host + path + selected query params/headers.',
      '**HIT**: the object is in cache and fresh (age < max-age/s-maxage) → served immediately.',
      '**MISS** or **expired**: the edge asks the **origin shield** (regional tier). If the shield also misses, it fetches from the **origin**, ideally over a persistent, optimised connection.',
      '**Request collapsing**: concurrent misses for the same object are merged so the origin sees one request, not thousands (prevents a thundering herd on popular content).',
      'The response is cached at shield and edge per `Cache-Control`. Expired objects may be **revalidated** with `If-None-Match`/`If-Modified-Since` (304 Not Modified saves bandwidth).',
      '**Invalidation**: purge by URL, by surrogate key/tag, or avoid purging altogether with **versioned (fingerprinted) URLs** like `app.3f9a1c.js` plus long TTLs. If the origin errors, `stale-if-error` serves the last good copy.',
    ],
    bottlenecks: [
      { problem: 'High latency for distant users', solution: 'Content served from a PoP near the user; TLS terminated at the edge.' },
      { problem: 'Origin overwhelmed by read traffic and spikes', solution: 'Caching + origin shield + request collapsing reduce origin load by orders of magnitude.' },
      { problem: 'Expensive egress from the origin', solution: 'Bytes served from the CDN do not leave your origin; CDN bandwidth is usually cheaper.' },
      { problem: 'Origin outages = site outages', solution: '`stale-if-error` / `stale-while-revalidate` keep serving cached content while the origin recovers.' },
    ],
    tradeoffs: [
      { aspect: 'Freshness vs hit ratio', gain: 'Long TTLs → high hit ratio, low origin load.', cost: 'Users may see stale content; requires an invalidation strategy.' },
      { aspect: 'Cache key design', gain: 'Narrow keys → more sharing, higher hit ratio.', cost: 'Too narrow risks serving the wrong variant (language, device, auth) to users; too broad (e.g. including all cookies) destroys hit ratio.' },
      { aspect: 'Dynamic content', gain: 'Edge compute and micro-caching (1–5 s) can cache even APIs.', cost: 'Personalised responses must never be cached publicly — a classic data-leak bug.' },
      { aspect: 'Provider dependence', gain: 'Global network without building one.', cost: 'CDN outages (Fastly 2021) take your site with them unless you have multi-CDN.' },
    ],
    keyNumbers: [
      { label: 'Typical static hit ratio', value: '90–99%' },
      { label: 'Edge TTFB', value: '~10–30 ms' },
      { label: 'Trans-oceanic RTT', value: '~70–150 ms' },
      { label: 'Origin offload at 97% hit', value: '33× less load' },
    ],
  },
  cloud: {
    public: {
      summary: 'Hyperscaler CDNs integrate tightly with cloud origins: CloudFront in front of S3 (with Origin Access Control), ALBs or API Gateway; Google Cloud CDN / Media CDN on the global LB; Azure Front Door. Independent CDNs (Cloudflare, Akamai, Fastly) work with any origin.',
      stack: ['Amazon CloudFront + Origin Shield', 'Lambda@Edge / CloudFront Functions', 'Google Cloud CDN / Media CDN', 'Azure Front Door', 'Cloudflare / Akamai / Fastly'],
      points: [
        'Keep S3 buckets private and allow only the CDN to read them.',
        'Enable an origin shield in the region closest to your origin to collapse misses from all edges.',
        'CloudFront → AWS origin data transfer is free, which changes the cost math for AWS-hosted origins.',
      ],
    },
    private: {
      summary: 'Organisations can run their own caching tier — Varnish, NGINX/OpenResty, Apache Traffic Server — in their data centres or colocation sites, or build a private CDN with appliances embedded in ISPs, as Netflix did with Open Connect.',
      stack: ['Varnish', 'NGINX / OpenResty', 'Apache Traffic Server', 'Squid', 'Open Connect-style appliances'],
      points: [
        'Self-hosted caching gives full control over cache keys and logic but you need many locations to beat a commercial CDN on latency.',
        'Most effective when traffic volume is so large that bandwidth costs dominate (video).',
      ],
    },
    hybrid: {
      summary: 'A CDN is often the simplest hybrid bridge: one CDN configuration can route paths to different origins — `/static/*` to S3, `/api/*` to an on-prem data centre, `/new/*` to a cloud service — making migrations invisible to users.',
      stack: ['Multi-origin routing', 'Origin failover groups', 'Multi-CDN (traffic steering via DNS)', 'Signed URLs / cookies'],
      points: [
        'Origin failover groups let the CDN retry a secondary origin (e.g. cloud) if the primary (on-prem) fails.',
        'Multi-CDN with DNS steering protects against a single CDN outage at the cost of configuration parity work.',
      ],
    },
  },
  examples: [
    {
      company: 'Netflix',
      headline: 'Open Connect: a purpose-built CDN inside ISPs',
      scale: 'Serves virtually all Netflix video traffic',
      detail: 'Netflix built **Open Connect**, deploying its own cache appliances (OCAs) inside ISP networks and at Internet exchange points free of charge to ISPs. Content is **proactively pre-positioned** during off-peak hours based on predicted popularity, so peak-time streaming is served from a box a few hops from the viewer, while control-plane services run in AWS.',
      lesson: 'When you know what users will request, push content to the edge ahead of time instead of waiting for misses.',
    },
    {
      company: 'Fastly',
      headline: 'A global CDN outage from one configuration change',
      scale: 'June 8, 2021 · ~1 hour · many major news and commerce sites',
      detail: 'A valid configuration change by a single customer triggered a latent software bug, causing most of Fastly’s network to return errors. Major sites (news outlets, government sites, e-commerce) were down for most of an hour; Fastly identified and disabled the configuration quickly and recovered most of the network within about 49 minutes.',
      lesson: 'The CDN is part of your critical path. Consider multi-CDN or fallback to origin for critical properties, and stage config rollouts.',
    },
    {
      company: 'Akamai',
      headline: 'Serving massive live events',
      scale: 'Very large concurrent live-streaming peaks',
      detail: 'Akamai and other CDNs handle live events (sports finals, product launches) by combining deep edge deployments with tiered caching: every viewer requests the same short video segments, so request collapsing and multi-tier caches mean the origin packager sees only a handful of requests per segment.',
      lesson: 'Tiered caching and request collapsing are what make “a million users request the same file at the same second” survivable.',
    },
  ],
  interview: [
    {
      question: 'How does a CDN reduce latency and origin load? Explain a cache hit vs. miss.',
      difficulty: 'Junior/Mid',
      answer: [
        'Users connect to a nearby edge PoP, so TCP/TLS handshakes and content delivery happen over a short RTT. On a **hit**, the PoP has a fresh copy and responds immediately. On a **miss**, the PoP fetches from the origin (often via a shield tier), returns it to the user and stores it for subsequent requests according to its TTL.',
        'Origin load drops because most requests are hits: at a 97% hit ratio, the origin serves 3 of every 100 requests. Even misses are cheaper thanks to request collapsing and persistent connections from edge to origin.',
      ],
      followUps: [{ q: 'What determines whether something is cacheable?', a: 'HTTP headers from the origin (`Cache-Control: public, max-age, s-maxage`, `no-store`, `private`), CDN configuration overrides, method (GET/HEAD) and status code.' }],
      redFlags: ['Thinking the CDN stores everything forever.', 'Not knowing what a cache key is.'],
    },
    {
      question: 'How do you deploy a new version of your front-end without users seeing a mix of old and new assets?',
      difficulty: 'Junior/Mid',
      answer: [
        'Use **content-hashed filenames** (`app.3f9a1c.js`) for all static assets with long TTLs (`max-age=31536000, immutable`). A new build produces new filenames, so there is nothing to invalidate.',
        'The HTML entry point (`index.html`) references the hashed assets and is served with a short TTL or `no-cache` (revalidate every time). Deploy order: upload new assets first, then the new HTML. Keep old assets available for a while for users mid-session.',
      ],
      followUps: [{ q: 'Why not just purge the CDN on every deploy?', a: 'Purges take time to propagate, cause an origin load spike as caches refill, and leave windows where HTML and assets mismatch. Versioned URLs avoid all three.' }],
      redFlags: ['Relying on purges of `app.js` with long TTLs.'],
    },
    {
      question: 'What is a cache stampede at the CDN level, and how do origin shields and request collapsing help?',
      difficulty: 'Senior',
      answer: [
        'When a popular object expires or is purged, many PoPs — and many users per PoP — miss at the same time and all request it from the origin, causing a load spike that can take the origin down (a **thundering herd**).',
        '**Request collapsing** at each cache tier holds concurrent misses for the same key while one request fetches from upstream, then serves all waiters. An **origin shield** adds a single regional tier that all edges miss into, so instead of N PoPs × M requests, the origin sees roughly one request per object. **stale-while-revalidate** lets caches keep serving the old version while one background request refreshes it.',
      ],
      followUps: [{ q: 'Any downside to a shield?', a: 'An extra hop on misses (slightly higher miss latency), shield-tier cost, and the shield becomes a concentration point that must itself be highly available.' }],
      redFlags: ['Suggesting “just scale the origin” without caching-layer mitigations.'],
    },
    {
      question: 'How would you cache API responses at the edge safely?',
      difficulty: 'Senior',
      answer: [
        'Classify endpoints: **public, identical for everyone** (product catalogue, prices for anonymous users) → cache with short TTLs or micro-caching (1–10 s) plus `stale-while-revalidate`. **Per-user** responses → never cache publicly (`Cache-Control: private`/`no-store`), or cache with a key that includes a user identifier only at a private layer.',
        'Design the **cache key** deliberately: include only the query params and headers that change the response (normalise ordering; strip tracking params), and use `Vary` sparingly (e.g. `Accept-Encoding`). Never cache responses to requests carrying `Authorization` unless explicitly safe.',
        'Use surrogate keys/tags to purge related objects when data changes (e.g. purge `product:123` across all URLs), and monitor hit ratio and origin load per route.',
      ],
      followUps: [{ q: 'What famous bug class does this prevent?', a: 'Serving one user’s personalised page or account data to other users because the response was cached without the user in the key — several high-profile incidents happened this way.' }],
      redFlags: ['Caching authenticated responses with a shared key.', 'Including all cookies in the cache key.'],
    },
    {
      question: 'Your origin goes down. What can the CDN do to keep the site up?',
      difficulty: 'Senior',
      answer: [
        '**`stale-if-error`**: serve the last cached copy (even if expired) when the origin returns 5xx or is unreachable. **Origin failover groups**: retry a secondary origin (another region or a static backup bucket) on errors. **Long TTLs on stable content** so most traffic is hits anyway. **Custom error pages** cached at the edge for what cannot be served.',
        'With these, a typical content site can ride out origin outages in degraded mode — browsing works, writes and personalised features fail gracefully. This is exactly what the scene shows when you fail the origin.',
      ],
      followUps: [{ q: 'How long should stale-if-error allow?', a: 'Long enough to cover realistic outages (hours to a day for content sites), short enough that serving very old content is acceptable for the business.' }],
      redFlags: ['Assuming the CDN can do nothing during origin failure.'],
    },
    {
      question: 'Design content delivery for a video-on-demand service with tens of millions of daily viewers.',
      difficulty: 'Staff',
      answer: [
        'Encode each title into an **adaptive bitrate ladder** and package as HLS/DASH segments (2–6 s), stored in object storage as the origin. Serve via a **multi-tier CDN**: edge PoPs (or ISP-embedded appliances at very large scale) → regional shields → origin, with very long TTLs because segments are immutable.',
        '**Pre-position** popular titles to edges during off-peak hours based on predicted demand (Netflix Open Connect model); long-tail titles fill on demand. **Steering**: a control-plane service picks the best cache for each client based on health, load, proximity and content availability, returning ranked URLs; the player falls back if one fails.',
        '**Economics**: at this scale, bandwidth dominates cost, so embedded caches in ISPs and peering agreements pay off. Use **multi-CDN** for resilience and price leverage. Monitor QoE metrics: start-up time, rebuffer ratio, bitrate, errors per CDN/ISP.',
      ],
      followUps: [{ q: 'How does live differ from VOD?', a: 'Segments are created in real time and requested by everyone simultaneously, so request collapsing and very short manifest TTLs matter; you cannot pre-position, and latency targets (low-latency HLS) constrain buffering.' }],
      redFlags: ['Serving video directly from the origin.', 'Ignoring bandwidth cost and QoE metrics.'],
    },
  ],
};

const loadBalancers: Topic = {
  id: 'load-balancers',
  title: 'L4 vs. L7 Load Balancers',
  tagline: 'Spread traffic across healthy servers: Layer 4 forwards connections blindly and fast; Layer 7 understands HTTP and routes each request intelligently.',
  sceneId: 'load-balancer',
  camera: { position: [-1, 23, 15], target: [-1, 0, 0.5] },
  controls: {
    traffic: true,
    failureLabel: 'Backend health check',
    variants: [
      { id: 'l4', label: 'L4 (NLB)' },
      { id: 'l7', label: 'L7 (ALB)' },
    ],
    hint: 'Switch between L4 and L7. L4 spreads flows over one pool; L7 routes by URL path to separate target groups. Fail a backend and watch health checks remove it.',
  },
  fundamentals: {
    what: 'A **load balancer** distributes incoming traffic across a pool of backend targets and removes unhealthy ones via **health checks**. A **Layer 4 (transport)** load balancer works on TCP/UDP: it picks a backend per connection or flow, typically by hashing the **5-tuple** (source IP/port, destination IP/port, protocol), and forwards packets without inspecting payloads. A **Layer 7 (application)** load balancer terminates the connection (and TLS), parses HTTP/gRPC, and routes **each request** based on host, path, headers, cookies or method.',
    why: 'Horizontal scaling only works if traffic is spread across many servers and failed servers are removed automatically. L4 gives raw speed and protocol neutrality (millions of packets per second, microseconds of latency, any TCP/UDP protocol, preserves client IP). L7 enables smart routing — microservice path routing, canary releases, sticky sessions, retries, header manipulation, WAF and auth integration — at the cost of more CPU and latency.',
    where: 'L4: the first tier behind anycast/ECMP at large edges (Google Maglev, GitHub GLB, Meta Katran), non-HTTP protocols (databases, MQTT, gaming, VoIP), TLS passthrough requirements, extreme throughput or static IPs (AWS NLB). L7: in front of web apps and microservices (AWS ALB, NGINX, Envoy, HAProxy), Kubernetes ingress, service meshes. Large systems often use **both**: L4 in front of a fleet of L7 proxies.',
    how: [
      'The client connects to the LB’s virtual IP (VIP) or DNS name.',
      '**L4**: the LB hashes the flow’s 5-tuple (often with **consistent hashing** so backend changes move few flows) and forwards packets to the chosen target — via NAT, tunnelling (IP-in-IP/GUE) or **direct server return** where responses bypass the LB.',
      '**L7**: the LB completes the TCP and TLS handshakes, reads the HTTP request, evaluates routing rules (`/api/*` → api target group, `Host: admin.example.com` → admin pool), and opens/reuses a connection to the chosen backend.',
      'An algorithm picks the target: round robin, least outstanding requests, weighted, random-of-two (power of two choices), or hash-based for stickiness.',
      '**Health checks** (TCP connect, or HTTP `GET /healthz` expecting 200) run every few seconds; after N failures the target is removed and existing connections are drained.',
      'L7 LBs can add `X-Forwarded-For`, retry idempotent requests on another backend, enforce timeouts, compress responses, and emit per-request metrics and logs.',
      'Responses flow back to the client — through the LB for L7 (and NAT-based L4), or directly from the server with DSR.',
    ],
    bottlenecks: [
      { problem: 'One server cannot handle all traffic', solution: 'Spread connections/requests across a horizontally scaled pool.' },
      { problem: 'Failed servers cause user-facing errors', solution: 'Health checks remove bad targets automatically; connection draining avoids cutting in-flight requests.' },
      { problem: 'Monolithic routing to microservices', solution: 'L7 path/host routing sends each API to its own independently scaled service.' },
      { problem: 'Risky deployments', solution: 'L7 weighted target groups enable canary and blue/green releases.' },
    ],
    tradeoffs: [
      { aspect: 'Performance', gain: 'L4: microsecond overhead, millions of packets/sec, minimal CPU.', cost: 'L7: TLS termination and HTTP parsing cost CPU and add ~ms of latency.' },
      { aspect: 'Routing intelligence', gain: 'L7: route by path, header, cookie; retries; rewrites; WAF.', cost: 'L4: blind to content; can only route by IP/port.' },
      { aspect: 'TLS', gain: 'L4: passthrough keeps end-to-end encryption and certificates on the servers.', cost: 'L7: must hold certificates and decrypt traffic (re-encrypt to backends if required).' },
      { aspect: 'Client IP', gain: 'L4 can preserve the source IP natively.', cost: 'L7 replaces it; you rely on `X-Forwarded-For` or PROXY protocol.' },
      { aspect: 'Connection behaviour', gain: 'L7 balances per request, good for HTTP/2 and gRPC multiplexing.', cost: 'L4 balances per connection, so one long-lived gRPC connection pins all its requests to one backend.' },
    ],
    keyNumbers: [
      { label: 'L4 added latency', value: '~µs' },
      { label: 'L7 added latency', value: '~1–5 ms' },
      { label: 'Health check interval (typ.)', value: '5–30 s' },
      { label: 'Unhealthy threshold (typ.)', value: '2–3 failures' },
    ],
  },
  cloud: {
    public: {
      summary: 'AWS: **Network Load Balancer** (L4, TCP/UDP/TLS, static IP per AZ, preserves source IP, extreme scale), **Application Load Balancer** (L7, HTTP/HTTPS/gRPC, path/host/header rules, WAF integration), **Gateway Load Balancer** (L3 for inline appliances). GCP and Azure offer equivalent passthrough (L4) and proxy (L7) load balancers, regional and global.',
      stack: ['AWS NLB / ALB / GWLB', 'GCP Network LB / Application LB', 'Azure Load Balancer / Application Gateway', 'Kubernetes Service (L4) / Ingress / Gateway API (L7)'],
      points: [
        'Enable **cross-zone load balancing** awareness: ALB has it on; NLB has it off by default (to keep traffic in-AZ and avoid charges).',
        'Use ALB weighted target groups for canaries; NLB in front of ALB when you need static IPs plus L7 routing.',
        'Managed LBs scale automatically, but for sudden huge spikes you may need pre-warming or gradual ramp.',
      ],
    },
    private: {
      summary: 'On-prem options: hardware ADCs (F5 BIG-IP, Citrix ADC), software L7 proxies (HAProxy, NGINX, Envoy), and L4 software load balancers (IPVS/LVS, Katran, GLB Director) fed by ECMP from the routers. Kubernetes on bare metal uses MetalLB for L4 VIPs.',
      stack: ['F5 BIG-IP / Citrix ADC', 'HAProxy / NGINX / Envoy', 'LVS / IPVS', 'Katran / GLB Director', 'MetalLB'],
      points: [
        'Run LBs in active/active or active/standby pairs with VRRP/keepalived or BGP-announced VIPs.',
        'Layered design: routers ECMP → L4 tier with consistent hashing → L7 proxy tier → services.',
      ],
    },
    hybrid: {
      summary: 'Hybrid traffic distribution usually happens at the DNS/anycast front door or at a global L7 proxy that has both on-prem and cloud backends. ALB/NLB can also target **IP addresses** in on-prem networks reachable over VPN/Direct Connect.',
      stack: ['ALB/NLB IP targets over DX', 'Global L7 front door (Cloudflare, Front Door)', 'Envoy / Consul across sites', 'Weighted DNS between sites'],
      points: [
        'IP targets over DX allow gradual migration: the same target group contains on-prem and cloud backends.',
        'Health checks across a WAN must account for higher latency and link failures.',
      ],
    },
  },
  examples: [
    {
      company: 'Google',
      headline: 'Maglev: a software L4 load balancer on commodity servers',
      scale: 'Fronts Google services since 2008 · NSDI 2016 paper',
      detail: 'Google replaced hardware load balancers with **Maglev**, a distributed software L4 balancer. Routers spread packets to Maglev machines via ECMP; each Maglev uses a **consistent hashing** scheme (Maglev hashing) so all machines pick the same backend for a flow without sharing state, and backend changes disturb few connections.',
      lesson: 'Consistent hashing lets a stateless L4 tier scale horizontally and survive its own failures without breaking connections.',
    },
    {
      company: 'GitHub',
      headline: 'GLB Director: L4 balancing with second-chance failover',
      scale: 'Open-sourced in 2018 · DPDK-based',
      detail: 'GitHub’s GLB Director uses rendezvous hashing to pick a primary and secondary server per flow; during a draining server’s removal, packets for existing connections are forwarded to the old server via a “second chance” mechanism, so deploying and maintaining the proxy tier does not break user connections.',
      lesson: 'Connection-friendly L4 load balancing makes routine maintenance invisible to users.',
    },
    {
      company: 'Meta',
      headline: 'Katran: L4 balancing in the kernel with XDP/eBPF',
      scale: 'Open-sourced in 2018 · Meta’s edge and data centres',
      detail: 'Katran runs as an eBPF program at the XDP hook in the Linux network driver, forwarding packets before the kernel network stack touches them, using consistent hashing and IP-in-IP encapsulation to backends that respond directly (DSR). It replaced IPVS-based balancers with much higher packet throughput per server.',
      lesson: 'Pushing L4 forwarding as close to the NIC as possible gives hardware-like performance on commodity machines.',
    },
  ],
  interview: [
    {
      question: 'What is the difference between L4 and L7 load balancing? When do you use each?',
      difficulty: 'Junior/Mid',
      answer: [
        '**L4** operates on TCP/UDP: it picks a backend per connection based on IPs and ports and forwards packets without reading them. It is very fast, protocol-agnostic, can preserve client IPs and pass TLS through. **L7** terminates the connection, reads HTTP, and routes each request by host, path, headers or cookies; it enables canaries, retries, rewriting, WAF and auth — at higher CPU and latency cost.',
        'Use L4 for non-HTTP protocols, TLS passthrough, static IPs, and extreme throughput. Use L7 for web/microservice routing. Large systems combine them: L4 tier fronting a fleet of L7 proxies.',
      ],
      followUps: [{ q: 'Why is gRPC a problem for L4 balancers?', a: 'gRPC multiplexes many requests on one long-lived HTTP/2 connection; L4 balances connections, so all requests on that connection hit one backend, causing imbalance. Use an L7 (HTTP/2-aware) balancer or client-side balancing.' }],
      redFlags: ['Confusing OSI layers.', 'Saying L7 is always better.'],
    },
    {
      question: 'Explain common load-balancing algorithms and when each is appropriate.',
      difficulty: 'Junior/Mid',
      answer: [
        '**Round robin**: simple, good for uniform requests and homogeneous servers. **Weighted round robin**: for heterogeneous capacity or canaries. **Least connections / least outstanding requests**: better when request durations vary. **Power of two random choices**: pick two random backends, send to the less loaded — near-optimal with low coordination, used by Envoy and others. **Hashing** (source IP, header, cookie, consistent hashing): session affinity and cache locality.',
        'In distributed LB fleets, purely local “least connections” can mislead because each LB sees only its own traffic; P2C with outstanding request counts is a robust default.',
      ],
      followUps: [{ q: 'Why consistent hashing instead of modulo hashing?', a: 'With `hash % N`, adding or removing a backend remaps almost every key. Consistent hashing remaps only ~1/N of keys, preserving connections and caches.' }],
      redFlags: ['Only knowing round robin.'],
    },
    {
      question: 'How do health checks work, and what are the pitfalls of shallow vs. deep health checks?',
      difficulty: 'Senior',
      answer: [
        'The LB probes each target periodically (TCP connect, or HTTP to `/healthz`). After a number of consecutive failures the target is marked unhealthy and removed; after consecutive successes it returns. Removal triggers **connection draining** for in-flight requests.',
        '**Shallow checks** (process is up) miss real failures — the server returns 200 to `/healthz` while its DB connection pool is broken. **Deep checks** (verify dependencies) catch more but risk **cascading failure**: if a shared dependency (database) has a blip, every target fails its deep check simultaneously and the LB removes the entire fleet.',
        'Pattern: health checks verify the instance’s own ability to serve (local resources, critical config) without failing on shared dependencies; many LBs also “fail open” — if all targets are unhealthy they route to all of them anyway. Track dependency health separately with alerts and circuit breakers.',
      ],
      followUps: [{ q: 'What is fail-open in this context?', a: 'When every target fails health checks, the LB assumes the health check itself is wrong and sends traffic to all targets rather than none. AWS ALB/NLB and Envoy (panic threshold) behave this way.' }],
      redFlags: ['Health checks that call the database on every probe from every instance.', 'Not knowing connection draining.'],
    },
    {
      question: 'Sticky sessions: how do they work, and why do many architects avoid them?',
      difficulty: 'Senior',
      answer: [
        'L7 LBs implement stickiness with a cookie identifying the backend (LB-generated or application cookie); L4 LBs use source-IP affinity. Subsequent requests from the client go to the same server, so in-memory session state works.',
        'Downsides: **uneven load** (heavy users pin to one server), **failure loses sessions**, scaling events and deploys disrupt users, and source-IP affinity breaks behind NAT (many users share one IP). The preferred design is **stateless servers** with sessions in a shared store (Redis, DynamoDB) or self-contained tokens (JWT), so any server can handle any request.',
        'Stickiness is still useful for cache locality or WebSocket-heavy workloads — ideally via consistent hashing on a stable key rather than strict pinning.',
      ],
      followUps: [{ q: 'How do you balance long-lived WebSocket connections?', a: 'Balance at connection time (least connections), cap connections per server, and gracefully migrate clients during deploys (server asks clients to reconnect gradually). Expect imbalance after scale-out because existing connections stay put.' }],
      redFlags: ['Relying on sticky sessions as the only way to keep state.'],
    },
    {
      question: 'How do you design a load-balancing tier that itself does not become a single point of failure?',
      difficulty: 'Senior',
      answer: [
        'Managed cloud LBs are already distributed across AZs. Self-managed: run multiple LB nodes and expose the VIP via **ECMP from routers** (each LB announces the VIP via BGP) or **VRRP/keepalived** active/standby pairs. Make the L4 tier stateless with consistent hashing so any LB node can forward any packet to the right backend.',
        'At the global level, multiple regions each with their own LB tier, fronted by DNS or anycast. Monitor LB health independently (synthetic probes from outside), keep LB config in version control, and roll config changes gradually across LB nodes.',
      ],
      followUps: [{ q: 'What happens to existing connections when an L4 node dies?', a: 'ECMP rehashes flows to other nodes; with consistent hashing and shared backend selection, those nodes choose the same backend, so connections can survive (if no per-connection state is required, e.g. with DSR + encapsulation).' }],
      redFlags: ['A single HAProxy box in front of a “highly available” cluster.'],
    },
    {
      question: 'Design the traffic tier for a service handling 2M requests/sec of HTTPS across three regions.',
      difficulty: 'Staff',
      answer: [
        '**Global**: anycast front door or latency-based DNS to regional VIPs, with health- and capacity-aware failover between regions. **Regional L4 tier**: ECMP from routers to a fleet of stateless L4 balancers (Maglev/Katran-style, or cloud NLB), consistent hashing, DSR where possible. **L7 proxy fleet** (Envoy/NGINX): TLS termination with session resumption, HTTP/2 and HTTP/3, routing to services, retries with budgets, timeouts, outlier detection.',
        '**Capacity**: at ~2M rps, with ~20–30k rps per proxy core-set, plan hundreds of proxy instances with N+1 per AZ and per region (one region must absorb another’s traffic on failure — 50% headroom with 3 regions). TLS handshakes dominate CPU: use ECDSA certificates, session tickets and connection reuse.',
        '**Operability**: per-route SLOs and metrics, gradual config rollout with automatic rollback, load-shedding and rate limiting at the proxy, and regular region evacuation drills.',
      ],
      followUps: [{ q: 'Where do you terminate TLS?', a: 'At the L7 tier closest to the user (or the edge), then re-encrypt to backends with mTLS if required. Keep private keys in an HSM/KMS-backed keyless or managed certificate system.' }],
      redFlags: ['No headroom for region failure.', 'Ignoring TLS CPU cost at high rps.'],
    },
  ],
};

const apiGateway: Topic = {
  id: 'api-gateway',
  title: 'Reverse Proxy & API Gateway',
  tagline: 'One hardened front door for all clients: TLS, authentication, rate limiting, routing, caching and observability — before any request reaches a service.',
  sceneId: 'api-gateway',
  camera: { position: [-2, 18, 23], target: [-1.5, 0.5, 0] },
  controls: {
    traffic: true,
    cache: true,
    failureLabel: 'orders-svc',
    hint: 'Raise traffic above 70% and the partner gets 429s from the token bucket. Fail orders-svc and the gateway returns fast 503s. Toggle the cache to serve GET /users/me from the gateway.',
  },
  fundamentals: {
    what: 'A **reverse proxy** sits in front of servers and handles client connections on their behalf — terminating TLS, forwarding requests, load balancing, caching and compressing (NGINX, HAProxy, Envoy). An **API gateway** is a reverse proxy specialised for APIs: it adds **authentication/authorisation** (API keys, OAuth2/JWT), **rate limiting and quotas**, **request routing to microservices**, request/response **transformation**, **versioning**, response caching, and **centralised observability**. A **BFF (Backend for Frontend)** is a gateway tailored to one client type (web, mobile).',
    why: 'Without a gateway, every microservice re-implements TLS, auth, rate limiting and logging — inconsistently — and clients must know about many service endpoints. A gateway provides one stable, versioned API surface, enforces cross-cutting policies in one place, protects services from abusive traffic, hides internal topology (services stay in private subnets), and lets you refactor services without breaking clients.',
    where: 'Public APIs (Stripe, Twilio-style developer APIs), mobile/web backends for microservice architectures, partner integrations with quotas and billing, Kubernetes ingress and Gateway API, and the north-south edge of service meshes (with the mesh handling east-west traffic).',
    how: [
      'The client sends `POST /v1/orders` with a bearer token to `api.example.com` (often through a CDN/WAF first).',
      'The gateway **terminates TLS** and applies WAF/bot rules and request size limits.',
      '**Authentication**: it validates the JWT signature locally using cached JWKS keys (or introspects an opaque token), checks expiry, audience and scopes, and identifies the caller (user, API key, tenant).',
      '**Rate limiting**: it checks a **token bucket** for that caller (local or in a shared store like Redis). Over quota → `429 Too Many Requests` with `Retry-After`.',
      '**Routing**: it matches the route and version to an upstream service, applies transformations (headers, payload mapping), and injects identity headers (`X-User-Id`) for downstream services.',
      'It forwards the request with timeouts, retries for idempotent methods, and a **circuit breaker** per upstream — failing fast with 503 when an upstream is unhealthy.',
      'Response flows back; the gateway may cache it (for safe GETs), compress it, add CORS headers, and logs/metrics/traces it with a correlation ID.',
    ],
    bottlenecks: [
      { problem: 'Cross-cutting concerns duplicated in every service', solution: 'Auth, rate limiting, TLS and logging implemented once at the gateway.' },
      { problem: 'Clients coupled to internal service topology', solution: 'One stable, versioned public API; internal services can be split, merged or moved freely.' },
      { problem: 'Abusive or runaway clients overload services', solution: 'Per-key quotas, rate limits, request size limits, and load shedding at the edge.' },
      { problem: 'A failing service causes cascading timeouts', solution: 'Gateway timeouts and circuit breakers fail fast and isolate the failure.' },
    ],
    tradeoffs: [
      { aspect: 'Centralisation', gain: 'Consistent policy and observability.', cost: 'A critical shared component — misconfigurations or outages affect every API. Must be highly available and carefully changed.' },
      { aspect: 'Latency', gain: 'Can reduce latency via caching and connection reuse.', cost: 'Adds a hop and processing (~1–10 ms).' },
      { aspect: 'Team autonomy', gain: 'Teams do not reinvent auth or rate limiting.', cost: 'Gateway config can become a bottleneck if one team owns all routes; prefer self-service, declarative config.' },
      { aspect: 'Logic placement', gain: 'Simple transformations at the edge help clients.', cost: 'Business logic in the gateway becomes an untestable “smart pipe” — keep it thin.' },
    ],
    keyNumbers: [
      { label: 'Gateway overhead', value: '~1–10 ms' },
      { label: 'AWS API Gateway default limit', value: '10k rps / acct-region' },
      { label: 'Rate-limit status code', value: 'HTTP 429' },
      { label: 'Fast-fail status code', value: 'HTTP 503' },
    ],
  },
  cloud: {
    public: {
      summary: 'Managed gateways: **Amazon API Gateway** (REST/HTTP/WebSocket APIs, usage plans, Lambda authorisers, throttling), **Google Apigee** and API Gateway, **Azure API Management**. Kubernetes: Gateway API implementations (Envoy Gateway, Istio, NGINX, Kong) as ingress.',
      stack: ['Amazon API Gateway', 'Apigee', 'Azure API Management', 'Kong / Tyk', 'Envoy Gateway / Istio ingress'],
      points: [
        'Amazon API Gateway applies account-level throttling (default 10,000 rps with a 5,000 burst per region) plus per-stage and per-usage-plan limits.',
        'Use HTTP APIs (cheaper, faster) unless you need REST API features like request validation or usage plans.',
        'Put a CDN/WAF in front for DDoS protection and edge caching.',
      ],
    },
    private: {
      summary: 'Self-hosted gateways on-prem or in Kubernetes: Kong, Tyk, KrakenD, Envoy-based gateways, NGINX/OpenResty with Lua, or custom gateways built on Netty (Netflix Zuul 2). You own scaling, HA, plugin security and upgrades.',
      stack: ['Kong / Tyk', 'NGINX / OpenResty', 'Envoy', 'Netflix Zuul 2', 'Keycloak (IdP)'],
      points: [
        'Run gateway nodes stateless and horizontally scaled behind an L4 balancer; keep rate-limit state in Redis or use local limits with approximate global coordination.',
        'Treat gateway config as code with CI validation — a bad route can take down every API.',
      ],
    },
    hybrid: {
      summary: 'A gateway is a powerful hybrid seam: one public API surface can route `/v1/accounts` to an on-prem core system and `/v1/recommendations` to a cloud service, letting you migrate route by route (the **strangler fig** pattern) without clients noticing.',
      stack: ['Strangler-fig routing', 'Apigee hybrid / Kong hybrid mode', 'mTLS to on-prem upstreams', 'API Gateway private integrations (VPC Link)'],
      points: [
        'Hybrid control/data-plane models (Apigee hybrid, Kong) keep policy management central while gateways run near the data.',
        'Watch the latency of cloud gateway → on-prem upstream calls over VPN/DX, and set timeouts accordingly.',
      ],
    },
  },
  examples: [
    {
      company: 'Netflix',
      headline: 'Zuul: the edge gateway for all device traffic',
      scale: 'Hundreds of device types · very high request volumes',
      detail: 'Netflix built **Zuul** as the front door for all requests from devices to its backend, handling routing, authentication, insights, stress testing (squeeze tests), and region failover traffic shifting. Zuul 2 moved to an asynchronous, non-blocking architecture on Netty to handle many more persistent connections efficiently.',
      lesson: 'A programmable edge gateway gives you a single place to shift traffic, test resilience and enforce policy across hundreds of client types.',
    },
    {
      company: 'Stripe',
      headline: 'Rate limiters and load shedders protecting the API',
      scale: 'Public API used by millions of businesses',
      detail: 'Stripe has described using several layers of protection: a **request rate limiter** (token bucket per user, backed by Redis), a **concurrent request limiter**, and **load shedders** that drop low-priority traffic (e.g. non-critical methods) when the fleet or workers are under stress, so critical payment requests keep succeeding.',
      lesson: 'Rate limiting is not just fairness — prioritised load shedding keeps the most important traffic alive during overload.',
    },
    {
      company: 'Cloudflare',
      headline: 'Pingora: replacing NGINX with a Rust reverse proxy',
      scale: 'More than 1 trillion requests per day (2022)',
      detail: 'Cloudflare built **Pingora**, a Rust-based proxy framework, to replace NGINX for its outbound proxying. Its multithreaded architecture shares connection pools across threads, greatly improving connection reuse to origins and reducing CPU and memory use compared to its NGINX-based setup.',
      lesson: 'At massive scale, reverse-proxy architecture details — connection reuse, threading model, memory safety — translate directly into latency and cost.',
    },
  ],
  interview: [
    {
      question: 'What is the difference between a reverse proxy, a load balancer and an API gateway?',
      difficulty: 'Junior/Mid',
      answer: [
        'A **reverse proxy** accepts client connections on behalf of servers and forwards requests (TLS termination, caching, compression, hiding backends). A **load balancer** distributes traffic across multiple backends with health checks — many reverse proxies do this, and L4 LBs do it without proxying HTTP at all. An **API gateway** is a reverse proxy with API-management features: auth, rate limits/quotas, per-route policies, transformations, versioning, developer keys, analytics.',
        'In practice the boundaries blur: NGINX or Envoy can be all three. The distinction is about responsibility: gateways enforce API-level policy for clients; load balancers spread load; reverse proxies front servers.',
      ],
      followUps: [{ q: 'What is a forward proxy then?', a: 'It acts on behalf of clients (e.g. a corporate egress proxy), hiding them from servers. A reverse proxy acts on behalf of servers, hiding them from clients.' }],
      redFlags: ['Treating them as completely unrelated technologies.'],
    },
    {
      question: 'How does a gateway authenticate requests without calling the identity provider on every request?',
      difficulty: 'Junior/Mid',
      answer: [
        'Use **self-contained signed tokens (JWTs)**: the IdP signs tokens with a private key; the gateway caches the IdP’s public keys (JWKS endpoint) and verifies signature, expiry (`exp`), issuer, audience and scopes locally — no network call per request.',
        'Trade-off: JWTs cannot be revoked instantly. Mitigate with short expiry (5–15 minutes) plus refresh tokens, a revocation list for emergencies, or opaque tokens with cached introspection for sensitive APIs. After validation the gateway forwards identity claims to services in trusted headers (and strips any client-supplied versions of those headers).',
      ],
      followUps: [{ q: 'What happens during key rotation?', a: 'The IdP publishes the new key in JWKS before signing with it; the gateway refreshes JWKS periodically or when it sees an unknown `kid`, so both keys validate during the overlap.' }],
      redFlags: ['Calling the IdP synchronously on every request at scale.', 'Trusting identity headers sent by the client.'],
    },
    {
      question: 'Design rate limiting for a public API. Where does the state live, and which algorithm do you use?',
      difficulty: 'Senior',
      answer: [
        'Algorithm: **token bucket** (capacity = burst, refill rate = sustained limit) is the usual choice — it allows short bursts while enforcing an average rate. Sliding-window counters are an alternative with smoother boundaries. Limits are keyed by API key/tenant, user, IP and route, often with tiers by plan.',
        'State: with many gateway nodes, a **shared store** (Redis with atomic Lua scripts or `INCR` + `EXPIRE`) gives accurate global limits at the cost of a network hop. Alternatives: **local limits per node** (limit / N) — fast but inaccurate when traffic is uneven; or a **hybrid** where nodes keep local buckets and periodically sync. Decide fail-open vs fail-closed if Redis is unavailable (usually fail-open with local fallback limits).',
        'Responses: `429` with `Retry-After` and `RateLimit-*` headers so clients can back off. Combine with **concurrency limits** and **load shedding** by priority to protect the system during overload, not just enforce fairness.',
      ],
      followUps: [{ q: 'How do you avoid Redis becoming the bottleneck?', a: 'Shard keys across a Redis cluster, keep operations O(1) and atomic, batch or approximate for very hot keys (local pre-aggregation), and place Redis close to gateways (same AZ).' }],
      redFlags: ['Fixed-window counters with no awareness of boundary bursts.', 'No answer for what happens when the limiter store is down.'],
    },
    {
      question: 'The gateway is a single front door. How do you prevent it from becoming a single point of failure and a bottleneck?',
      difficulty: 'Senior',
      answer: [
        'Make gateway nodes **stateless** (state in Redis/IdP), run many nodes across AZs behind an L4 balancer or anycast, and auto-scale on CPU/connections. Deploy per region so a regional failure does not take down global API access.',
        '**Blast radius control**: config changes validated in CI and rolled out progressively (canary gateway nodes), the ability to roll back instantly, and possibly multiple gateway deployments (per domain/tenant tier) instead of one giant shared gateway. Keep the gateway thin — no business logic, no synchronous dependencies beyond what is essential, with timeouts and fallbacks on those.',
        'Capacity plan for TLS handshake CPU, connection counts (WebSockets/HTTP2), and response caching memory; load-test it as part of the system.',
      ],
      followUps: [{ q: 'Should every internal service-to-service call go through the gateway?', a: 'Usually not — that adds latency and makes the gateway a choke point. Use a service mesh or direct service-to-service calls with mTLS for east-west traffic; the gateway handles north-south.' }],
      redFlags: ['Putting business logic in the gateway.', 'Routing all internal traffic through the edge gateway.'],
    },
    {
      question: 'One downstream service becomes slow. How should the gateway behave to avoid a cascading failure?',
      difficulty: 'Senior',
      answer: [
        'Slow is worse than down: requests pile up, holding connections and threads until the gateway itself exhausts resources and every API fails. Defences: **per-route timeouts** shorter than client timeouts; **concurrency limits/bulkheads** per upstream so one slow service cannot consume all gateway capacity; **circuit breakers** that open after error/latency thresholds and fail fast (503 or fallback response) for a cool-down period, then half-open to probe recovery.',
        '**Retries** only for idempotent requests, with backoff, jitter and a **retry budget** (e.g. max 10% extra load) to avoid retry storms. Optional fallbacks: cached or default responses for non-critical data. This is what the scene shows when orders-svc fails: fast 503s instead of hanging requests.',
      ],
      followUps: [{ q: 'How do you choose the timeout value?', a: 'Base it on the upstream’s latency distribution (e.g. a bit above p99.9) and the end-to-end latency budget; always shorter than the caller’s timeout so the gateway responds before the client gives up.' }],
      redFlags: ['Unlimited retries.', 'Default timeouts of 60 s or more.'],
    },
    {
      question: 'You are migrating a monolith to microservices while 2,000 external partners use its API. How do you use a gateway to do it safely?',
      difficulty: 'Staff',
      answer: [
        'Introduce the gateway first as a transparent reverse proxy in front of the monolith with the **same public contract**, and get observability on every route (traffic, latency, errors, which partners use what). Then apply the **strangler fig** pattern: extract one capability at a time into a new service and switch its route at the gateway — first by **shadowing** traffic (mirror requests, compare responses), then canary by percentage or by partner, then full cutover, with instant rollback by route.',
        'Keep the external contract stable: the gateway handles versioning (`/v1` vs `/v2`), request/response transformation where internal models diverge, and consistent auth and rate limits for partners. Communicate deprecations with timelines and usage data from gateway analytics.',
        'Guard data consistency during the transition (dual writes are risky — prefer events/CDC from the source of truth), and define organisational ownership of gateway config so it does not become a central-team bottleneck (self-service, declarative route ownership per team).',
      ],
      followUps: [{ q: 'How do you handle a route that both old and new systems must serve during migration?', a: 'Route by attribute (partner ID, region, header) at the gateway, compare results via shadow traffic, and keep a clear source of truth for the data to avoid split-brain.' }],
      redFlags: ['Big-bang cutover.', 'Breaking the public contract during migration.'],
    },
  ],
};

export const module2Topics: Topic[] = [dns, anycast, cdn, loadBalancers, apiGateway];
