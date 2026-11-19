import type { Topic } from '../types';

/* Module 3 — Compute & Scaling */

const scaling: Topic = {
  id: 'vertical-horizontal',
  title: 'Vertical vs. Horizontal Scaling',
  tagline: 'Scale up with a bigger machine or scale out with more machines — the first architectural fork in every growing system.',
  sceneId: 'scaling',
  camera: { position: [-1, 18, 23], target: [-2, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'A server',
    variants: [
      { id: 'vertical', label: 'Vertical (scale up)' },
      { id: 'horizontal', label: 'Horizontal (scale out)' },
    ],
    hint: 'In Vertical mode drag traffic up and watch the single machine grow until it hits the ceiling; fail it for a total outage. Switch to Horizontal: nodes are added as load rises and a failure only removes one of them.',
  },
  fundamentals: {
    what: '**Vertical scaling (scale up)** increases the capacity of a single machine — more CPU cores, RAM, faster disks or network. **Horizontal scaling (scale out)** adds more machines and spreads load across them with a load balancer (for stateless services) or partitioning/sharding (for stateful ones).',
    why: 'Every system eventually outgrows its first server. Vertical scaling is the fastest fix — no code changes — but it has a hard ceiling (the biggest instance), costs grow faster than capacity at the high end, and one machine is still a single point of failure. Horizontal scaling offers near-unlimited capacity, fault tolerance and the ability to scale down, but requires stateless design, load balancing and distributed-systems thinking.',
    where: 'Vertical: relational databases (until sharding is unavoidable), legacy monoliths, in-memory workloads that need one big address space, early-stage products. Horizontal: stateless web/API tiers, microservices, caches (sharded), NoSQL stores, stream processing, batch compute. Most real systems combine both: scale up the database, scale out everything else.',
    how: [
      '**Measure first**: find the bottleneck resource (CPU, memory, disk IOPS, network, connections, locks) with metrics and profiling.',
      '**Scale up** by resizing the instance (stop/start or failover to a bigger replica). Capacity steps are coarse (2×, 4×) and require a brief interruption.',
      'To **scale out**, make the service **stateless**: move sessions to Redis/DynamoDB or signed tokens, uploads to object storage, and local caches to a shared cache.',
      'Put a **load balancer** in front of N identical nodes, with health checks so failed nodes are removed automatically.',
      'Automate capacity with **auto-scaling** on CPU, request count or queue depth (next topic).',
      'For **stateful** tiers, scale out by **replication** (read scaling) and **sharding/partitioning** (write scaling) — covered in Module 4.',
      'Revisit the design periodically: the cheapest point on the cost/complexity curve moves as load grows.',
    ],
    bottlenecks: [
      { problem: 'One machine’s CPU/RAM is saturated', solution: 'Vertical: move to a larger instance. Horizontal: add nodes and spread the load.' },
      { problem: 'A single server is a single point of failure', solution: 'Horizontal: N+1 nodes behind a load balancer survive individual failures.' },
      { problem: 'Peak capacity sits idle off-peak', solution: 'Horizontal + auto-scaling scales in at night; vertical sizes for the peak 24/7.' },
      { problem: 'Largest available instance is still too small', solution: 'Only horizontal partitioning removes the ceiling.' },
    ],
    tradeoffs: [
      { aspect: 'Complexity', gain: 'Vertical: zero code changes, no distributed state.', cost: 'Horizontal: statelessness, load balancing, distributed consistency, more moving parts.' },
      { aspect: 'Ceiling', gain: 'Horizontal: effectively unlimited.', cost: 'Vertical: capped by the largest machine available.' },
      { aspect: 'Availability', gain: 'Horizontal: losing a node loses 1/N capacity.', cost: 'Vertical: losing the node loses everything.' },
      { aspect: 'Cost curve', gain: 'Horizontal: linear with commodity nodes, scale to demand.', cost: 'Vertical: high-end hardware costs more per unit of capacity; sized for peak.' },
      { aspect: 'Latency', gain: 'Vertical: everything in one memory space, no network hops.', cost: 'Horizontal: network calls and coordination add latency.' },
    ],
    keyNumbers: [
      { label: 'Largest cloud VMs (RAM)', value: 'up to ~24 TiB' },
      { label: 'Typical web node', value: '2–8 vCPU' },
      { label: 'Redundancy target', value: 'N+1 or N+2' },
      { label: 'Resize downtime', value: 'seconds–minutes' },
    ],
  },
  cloud: {
    public: {
      summary: 'Vertical scaling is an instance-type change (EC2 m5.large → m5.24xlarge, Cloud SQL tier, Azure VM size); horizontal scaling is Auto Scaling Groups / Managed Instance Groups / VM Scale Sets behind a managed load balancer, or container orchestration.',
      stack: ['EC2 instance families', 'Auto Scaling Groups', 'GCP Managed Instance Groups', 'Azure VM Scale Sets', 'RDS instance classes'],
      points: [
        'Managed databases scale up with a short failover; read replicas and Aurora add horizontal read scale.',
        'Prefer many smaller instances across AZs for stateless tiers — better fault isolation and finer scaling steps.',
        'Graviton/ARM instances often give better price-performance when scaling up or out.',
      ],
    },
    private: {
      summary: 'On-prem, scaling up means buying bigger servers or adding RAM/CPUs to existing ones (with downtime); scaling out means adding nodes to a virtualisation or Kubernetes cluster — both bounded by hardware already purchased.',
      stack: ['VMware vSphere (hot-add CPU/RAM)', 'OpenStack Nova flavours', 'Bare-metal Kubernetes', 'HAProxy / F5'],
      points: [
        'VMware hot-add allows some vertical growth without reboot, but host capacity is the ceiling.',
        'Horizontal growth requires spare hosts in the pool — plan procurement lead time.',
      ],
    },
    hybrid: {
      summary: 'A common hybrid pattern keeps a vertically scaled system of record on-prem while the stateless tiers scale horizontally in the cloud (cloud bursting). Latency between the tiers becomes the main design constraint.',
      stack: ['Cloud bursting', 'Direct Connect', 'Kubernetes across sites', 'Global load balancing'],
      points: [
        'Burst only the tiers that are stateless and not chatty with on-prem data.',
        'Use caching near the burst tier to avoid hammering the on-prem database over the WAN.',
      ],
    },
  },
  examples: [
    {
      company: 'Stack Overflow',
      headline: 'Famous for scaling up, not out',
      scale: 'One of the most visited sites on the web, on a small server fleet',
      detail: 'Stack Overflow has publicly described serving its traffic from a remarkably small number of powerful on-prem servers — a handful of web servers and a primary SQL Server with a replica — relying on heavy caching and efficient code rather than large horizontal fleets.',
      lesson: 'Vertical scaling plus good engineering goes much further than most teams assume; distribute only when you must.',
    },
    {
      company: 'Instagram',
      headline: 'Horizontal scale with stateless Django and sharded PostgreSQL',
      scale: 'Grew to tens of millions of users with a tiny team',
      detail: 'Instagram scaled out its stateless Django application servers behind load balancers and sharded PostgreSQL into thousands of logical shards mapped to fewer physical servers, so shards could be moved as the user base grew.',
      lesson: 'Stateless app tiers scale out trivially; the data tier needs a deliberate partitioning scheme designed for future moves.',
    },
  ],
  interview: [
    {
      question: 'Explain vertical vs. horizontal scaling. When would you choose each?',
      difficulty: 'Junior/Mid',
      answer: [
        'Vertical scaling adds resources to one machine; horizontal scaling adds machines. Vertical is simple and needs no code changes but has a ceiling, gets disproportionately expensive at the top end and keeps a single point of failure. Horizontal has no practical ceiling and tolerates failures but requires stateless services, load balancing and handling distributed state.',
        'I would scale up early (cheap engineering-wise) and for databases until sharding is truly necessary, and scale out stateless tiers from the start, deployed across AZs for availability.',
      ],
      followUps: [{ q: 'Why is a relational database usually scaled vertically first?', a: 'Sharding a relational database breaks cross-shard joins and transactions and adds operational complexity; a bigger instance plus read replicas often buys years of growth.' }],
      redFlags: ['“Always scale horizontally” without acknowledging complexity.', 'Ignoring that stateful services are much harder to scale out.'],
    },
    {
      question: 'What does it mean for a service to be stateless, and how do you make a stateful web app stateless?',
      difficulty: 'Junior/Mid',
      answer: [
        'A stateless service keeps no client-specific data between requests in local memory or disk, so any instance can serve any request and instances can be added, removed or replaced freely.',
        'To get there: move sessions to a shared store (Redis/DynamoDB) or self-contained signed tokens (JWT); store uploads in object storage; replace in-process caches that must be consistent with a shared cache; make background jobs pull from a queue; and externalise configuration.',
      ],
      followUps: [{ q: 'Can you still use local caches?', a: 'Yes, for data that tolerates staleness (config, reference data) with short TTLs. The rule is that correctness must not depend on hitting the same instance.' }],
      redFlags: ['Relying on sticky sessions as the scaling strategy.'],
    },
    {
      question: 'Your API servers are at 90% CPU. Walk me through your decision process.',
      difficulty: 'Senior',
      answer: [
        'First, confirm and profile: is CPU really the bottleneck, and why did it rise — traffic growth, a regression, a hot endpoint, GC pressure, retries from a downstream issue? A bad deploy is fixed by rollback, not capacity.',
        'If it is genuine growth: short term, add instances (if stateless) or scale up for immediate relief. Medium term, optimise hot paths (caching, serialisation, N+1 queries) and set up auto-scaling with headroom targets (e.g. 50–60% CPU). Also check that the next bottleneck (database connections, downstream rate limits) will not simply move the problem.',
      ],
      followUps: [{ q: 'What if adding servers makes things worse?', a: 'That signals a shared bottleneck — e.g. each new server opens more DB connections, saturating the database. Add connection pooling (PgBouncer/RDS Proxy), caching or scale the DB tier instead.' }],
      redFlags: ['Adding servers without understanding the cause.', 'Not considering downstream capacity.'],
    },
    {
      question: 'How do you estimate how many servers a new service needs?',
      difficulty: 'Senior',
      answer: [
        'Start from demand: peak requests per second (daily active users × requests per user ÷ seconds, times a peak factor of 2–5×). Load-test one instance to find sustainable throughput at the target latency (e.g. p99 < 200 ms at ~60% CPU). Instances = peak RPS ÷ per-instance RPS, then add redundancy: survive one AZ loss (with 3 AZs, multiply by 1.5) plus growth headroom.',
        'Example: 10M DAU × 20 req/day ≈ 2,300 avg RPS, ×3 peak ≈ 7,000 RPS; at 500 RPS per instance → 14 instances; ×1.5 for AZ loss → 21; round to 24 across 3 AZs.',
      ],
      followUps: [{ q: 'Why test at 60% CPU rather than 100%?', a: 'Latency rises sharply as utilisation approaches 100% (queueing theory); you also need headroom for spikes and for failover.' }],
      redFlags: ['No peak factor or redundancy in the estimate.'],
    },
    {
      question: 'At what point would you move a monolith from vertical scaling to a horizontally scaled, partitioned architecture, and how would you de-risk the move?',
      difficulty: 'Staff',
      answer: [
        'Triggers: you are within one or two instance sizes of the ceiling with projected growth exceeding it; failover times on the single big node are unacceptable; cost per unit at the top end is prohibitive; or different parts of the system need very different scaling profiles.',
        'De-risk incrementally: first make the app tier stateless and horizontal (low risk). Add read replicas and caching to shed database read load. Identify the natural partition key (tenant, user, region) and introduce it in code before physically splitting data. Extract the highest-load or most independent domain first, using dual writes/CDC with verification, and keep rollback paths. Measure every step.',
      ],
      followUps: [{ q: 'What is the biggest risk when partitioning?', a: 'Choosing a partition key that later creates hot spots or forces cross-partition transactions — which is why you analyse access patterns before splitting.' }],
      redFlags: ['Big-bang rewrite proposals.', 'No discussion of the partition key.'],
    },
  ],
};

const asg: Topic = {
  id: 'auto-scaling-groups',
  title: 'Auto-Scaling Groups',
  tagline: 'Let the infrastructure follow the demand curve — launch capacity when load rises, remove it when load falls, and replace anything unhealthy.',
  sceneId: 'asg',
  camera: { position: [0, 18, 23], target: [0, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'Instance health check',
    hint: 'Drag the traffic slider: desired capacity follows CPU between min 2 and max 6. Fail an instance and watch the ASG replace it.',
  },
  fundamentals: {
    what: 'An **Auto Scaling Group** (AWS ASG; GCP Managed Instance Group; Azure VM Scale Set) manages a fleet of identical instances created from a **launch template**. It keeps the fleet at a **desired capacity** between a **min** and **max**, spreads instances across AZs, **replaces unhealthy instances**, and changes desired capacity according to **scaling policies** (target tracking, step, scheduled, predictive).',
    why: 'Traffic is rarely flat: daily cycles, weekly patterns, launches and spikes. Provisioning for peak wastes money; provisioning for average fails under load. ASGs automate capacity to track demand and give self-healing: a failed instance is replaced without a human.',
    where: 'Stateless web/API fleets, worker pools consuming queues (scale on queue depth), batch processing, Kubernetes node groups (via Cluster Autoscaler/Karpenter), game servers and CI runners.',
    how: [
      'Define a **launch template**: AMI, instance type(s), security groups, IAM role, user data/bootstrap.',
      'Create the ASG with **min / desired / max** and a list of subnets across multiple AZs; attach it to a load-balancer target group.',
      'Instances publish metrics (CPU, request count per target, custom metrics such as queue depth) to **CloudWatch**.',
      'A **target-tracking policy** (e.g. keep average CPU at 50%) creates alarms and adjusts desired capacity up or down proportionally.',
      'On scale-out the ASG launches instances, waits for the **health check grace / warm-up** period, then the LB starts routing to them.',
      'On scale-in it picks instances to terminate (oldest launch template, AZ balance), **deregisters and drains** them first; lifecycle hooks can run cleanup.',
      'Unhealthy instances (EC2 or ELB health checks) are terminated and replaced automatically.',
    ],
    bottlenecks: [
      { problem: 'Over-provisioning for peak wastes money', solution: 'Scale in during quiet periods; pay only for capacity in use.' },
      { problem: 'Manual scaling is too slow for spikes', solution: 'Policies react to metrics within minutes; scheduled/predictive scaling pre-empts known peaks.' },
      { problem: 'Failed instances degrade capacity until noticed', solution: 'Health-check-driven replacement restores desired capacity automatically.' },
      { problem: 'Uneven AZ distribution', solution: 'The ASG rebalances instances across AZs.' },
    ],
    tradeoffs: [
      { aspect: 'Reaction time', gain: 'Automatic response to load.', cost: 'Minutes of lag (metric period + launch + boot + warm-up) — too slow for sudden spikes without headroom.' },
      { aspect: 'Cost', gain: 'Capacity tracks demand; combine with Spot for big savings.', cost: 'Aggressive scale-in risks being under-provisioned when traffic returns.' },
      { aspect: 'Simplicity', gain: 'Self-healing fleet with little code.', cost: 'Requires immutable, fast-booting images and stateless instances.' },
      { aspect: 'Stability', gain: 'Target tracking is smooth and proportional.', cost: 'Poorly chosen metrics or cooldowns cause flapping (scale out/in oscillation).' },
    ],
    keyNumbers: [
      { label: 'Typical CPU target', value: '40–60%' },
      { label: 'Detailed metrics period', value: '1 min' },
      { label: 'Instance launch → in service', value: '~1–5 min' },
      { label: 'Spot interruption notice', value: '2 min' },
    ],
  },
  cloud: {
    public: {
      summary: 'AWS Auto Scaling Groups with target tracking, step, scheduled and predictive scaling; mixed instances policies (On-Demand + Spot across instance types); warm pools for faster scale-out. GCP Managed Instance Groups and Azure VM Scale Sets provide equivalent autoscalers.',
      stack: ['EC2 Auto Scaling', 'Launch Templates', 'CloudWatch alarms', 'Warm pools', 'GCP MIG autoscaler', 'Azure VMSS'],
      points: [
        'Scale on the metric closest to user experience — ALB RequestCountPerTarget or queue depth is often better than CPU.',
        'Use mixed instance types and Spot capacity rebalancing to cut costs safely.',
        'Predictive scaling learns daily/weekly patterns and launches capacity before the peak.',
      ],
    },
    private: {
      summary: 'On-prem auto scaling exists within a fixed pool: OpenStack Heat/Senlin autoscaling groups, VMware Aria Automation, or Kubernetes Cluster Autoscaler on bare metal with spare nodes. You can scale up to the hardware you own, not beyond.',
      stack: ['OpenStack Heat / Senlin', 'VMware Aria Automation', 'Kubernetes Cluster API', 'Nomad autoscaler'],
      points: [
        'Elasticity is bounded: keep a buffer of powered-on or quickly bootable capacity.',
        'Scaling in on-prem saves power and frees capacity for other teams rather than money directly.',
      ],
    },
    hybrid: {
      summary: 'Hybrid auto scaling usually means on-prem baseline + cloud ASG for overflow, triggered by on-prem saturation metrics (cloud bursting). Global load balancing directs overflow traffic to the cloud fleet.',
      stack: ['Cloud bursting', 'Global load balancing', 'Shared metrics (Prometheus / CloudWatch)', 'Consistent images (Packer)'],
      points: [
        'Build images for both environments from one pipeline (Packer) to avoid drift.',
        'Account for WAN latency to on-prem data in the burst tier.',
      ],
    },
  },
  examples: [
    {
      company: 'Netflix',
      headline: 'Predictive auto scaling with Scryer',
      scale: 'Demand that swings dramatically through each day',
      detail: 'Netflix described Scryer (2013), a predictive auto-scaling engine that forecasts traffic from historical patterns and pre-provisions capacity ahead of the evening peak, complementing reactive AWS auto scaling, which can lag sudden ramps.',
      lesson: 'Reactive scaling alone is too slow for steep, predictable ramps — forecast and pre-scale.',
    },
    {
      company: 'Retail peak events',
      headline: 'Scheduled scaling before Black Friday',
      scale: 'Traffic multiples of normal for a few days',
      detail: 'E-commerce companies routinely use scheduled actions to raise minimum capacity ahead of known events (sales, launches, ticket drops) and load-test to that level, rather than trusting reactive policies to catch a vertical spike.',
      lesson: 'For known events, set capacity floors in advance; auto scaling handles the variance around them.',
    },
  ],
  interview: [
    {
      question: 'What is an Auto Scaling Group and what problems does it solve?',
      difficulty: 'Junior/Mid',
      answer: [
        'A managed fleet of identical instances kept between min and max at a desired capacity. It solves elastic capacity (scale with demand), self-healing (replace unhealthy instances), and AZ balancing — all without manual work.',
        'It works with a launch template that defines what to launch and a load balancer that sends traffic only to healthy, in-service instances.',
      ],
      followUps: [{ q: 'What happens if you set min = max?', a: 'Capacity is fixed, but you still get self-healing and AZ balancing — a common pattern for steady services.' }],
      redFlags: ['Thinking an ASG load-balances traffic by itself.'],
    },
    {
      question: 'Target tracking vs. step scaling vs. scheduled scaling — when do you use each?',
      difficulty: 'Junior/Mid',
      answer: [
        '**Target tracking**: keep a metric at a value (CPU 50%, requests per target 1,000). Simple and proportional — the default choice. **Step scaling**: explicit actions for alarm thresholds (+2 at 70%, +5 at 90%) — useful for non-linear metrics or aggressive reactions. **Scheduled**: change min/max/desired at known times (business hours, events). **Predictive**: forecasts from history.',
        'Common combination: scheduled or predictive floors for known patterns, plus target tracking for real-time variance.',
      ],
      followUps: [{ q: 'Why might CPU be a bad scaling metric?', a: 'For I/O-bound services, CPU stays low while latency rises. Requests per target, queue depth or latency are closer to the real constraint.' }],
      redFlags: ['Only knowing CPU-based scaling.'],
    },
    {
      question: 'Your service sees a 10× traffic spike within 60 seconds. Auto scaling did not help. Why, and what would you change?',
      difficulty: 'Senior',
      answer: [
        'Reactive scaling has a long loop: metric aggregation (1–5 min) → alarm evaluation → launch → boot → app warm-up → health checks → LB registration. Several minutes total, while the spike lasts seconds. Meanwhile overloaded instances may fail health checks and be replaced, making it worse.',
        'Changes: keep headroom (lower target utilisation), pre-scale for known events, use warm pools or pre-baked AMIs for faster boot, scale on leading indicators (request rate) rather than lagging ones (CPU), add load shedding/rate limiting and queues to absorb bursts, and protect with a CDN/cache for read-heavy spikes.',
      ],
      followUps: [{ q: 'How can health checks make overload worse?', a: 'Overloaded instances respond slowly, fail checks, get terminated, and the remaining instances receive even more load — a death spiral. Use generous thresholds and load shedding.' }],
      redFlags: ['Expecting auto scaling to absorb instantaneous spikes.'],
    },
    {
      question: 'How do you scale worker fleets that consume from a queue?',
      difficulty: 'Senior',
      answer: [
        'Scale on **backlog per instance**: (queue depth ÷ running instances) compared with what one instance can process within the acceptable latency (e.g. each worker handles 10 msg/s and we tolerate 60 s of backlog → target 600 messages per instance). Target tracking on that custom metric keeps latency bounded.',
        'Also consider age of oldest message as an SLO alarm, scale-in protection for instances mid-job (or lifecycle hooks to finish work), and Spot instances because queue workers tolerate interruptions when jobs are idempotent.',
      ],
      followUps: [{ q: 'Why not scale on queue depth alone?', a: 'Depth alone ignores capacity already running; backlog per instance gives a proportional signal.' }],
      redFlags: ['Terminating workers mid-job without draining.'],
    },
    {
      question: 'Design the capacity strategy for a service with a strict SLO, steep daily peaks and a tight budget.',
      difficulty: 'Staff',
      answer: [
        'Layer the approach: (1) **baseline** covered by Savings Plans for the always-on minimum; (2) **predictive/scheduled scaling** to pre-provision the daily ramp; (3) **target tracking** on requests-per-target with headroom for variance; (4) **Spot** in a mixed-instances policy for part of the elastic capacity, diversified across instance types and AZs; (5) **static stability** — enough capacity to lose an AZ without needing to launch.',
        'Protect the SLO with load shedding and graceful degradation for extreme spikes, and validate the whole thing with regular load tests and game days. Track cost per request and SLO compliance together so neither is optimised blindly.',
      ],
      followUps: [{ q: 'How do you avoid Spot interruptions hurting the SLO?', a: 'Keep the SLO-critical floor On-Demand, use capacity rebalancing, diversify pools, and drain on the 2-minute notice.' }],
      redFlags: ['Optimising only cost or only reliability.'],
    },
  ],
};

const kubernetes: Topic = {
  id: 'kubernetes',
  title: 'Containers & Kubernetes',
  tagline: 'Package once, run anywhere, and let a control loop keep the desired number of healthy containers running across a fleet of machines.',
  sceneId: 'kubernetes',
  camera: { position: [0, 20, 23], target: [-1, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'worker-node-1',
    hint: 'Raise traffic and the HPA adds pods, spread across nodes. Fail worker-node-1: its pods are rescheduled; push traffic high enough and some pods stay Pending for lack of capacity.',
  },
  fundamentals: {
    what: 'A **container** packages an application with its dependencies into an image that runs as an isolated process (Linux namespaces + cgroups) sharing the host kernel. **Kubernetes** is an orchestrator: you declare desired state (Deployments, Services, ConfigMaps) through the **API server**; **controllers** continuously reconcile actual state toward it; the **scheduler** places **pods** on **nodes**; the **kubelet** on each node runs them; **etcd** stores the state.',
    why: 'Containers solve “works on my machine” and give fast, dense, reproducible deployments. Kubernetes solves running thousands of them: bin-packing onto machines, self-healing, rolling updates, service discovery and load balancing, autoscaling, and a consistent API across clouds and on-prem.',
    where: 'Microservice platforms, internal developer platforms, ML training/serving, batch jobs, hybrid/multi-cloud portability. It is often overkill for a handful of services where managed PaaS, ECS or serverless are simpler.',
    how: [
      'You `kubectl apply` a **Deployment** (image, replicas: 3, resources, probes). The API server validates and stores it in **etcd**.',
      'The Deployment controller creates a **ReplicaSet**, which creates **Pod** objects (still unscheduled).',
      'The **scheduler** filters nodes (resources, taints, affinity) and scores them (spread, bin-packing), then binds each pod to a node.',
      'The **kubelet** on that node pulls the image and starts containers via the container runtime; **readiness probes** gate traffic, **liveness probes** restart hung containers.',
      'A **Service** gives pods a stable virtual IP / DNS name; kube-proxy or eBPF (Cilium) load-balances to ready endpoints. An **Ingress/Gateway** exposes HTTP routes externally.',
      'The **HPA** adjusts replica counts from metrics; the **Cluster Autoscaler/Karpenter** adds nodes when pods are Pending.',
      'If a node dies, the node controller marks it NotReady and pods are recreated on other nodes — the same reconcile loop that handles everything else.',
    ],
    bottlenecks: [
      { problem: 'Environment drift between dev, test and prod', solution: 'Immutable container images run identically everywhere.' },
      { problem: 'Low server utilisation with one app per VM', solution: 'Bin-packing many containers per node with resource requests/limits.' },
      { problem: 'Manual restarts and placement after failures', solution: 'Controllers reconcile desired state automatically.' },
      { problem: 'Inconsistent deploy/rollback tooling across teams', solution: 'One declarative API for rollouts, rollbacks, config and scaling.' },
    ],
    tradeoffs: [
      { aspect: 'Operational complexity', gain: 'Powerful, uniform platform.', cost: 'Steep learning curve; networking, storage, security and upgrades require a platform team.' },
      { aspect: 'Isolation', gain: 'Lightweight, fast-starting containers.', cost: 'Shared kernel — weaker isolation than VMs (mitigated by gVisor, Kata, Firecracker).' },
      { aspect: 'Portability', gain: 'Same API on any cloud or on-prem.', cost: 'Cloud-specific integrations (load balancers, storage, IAM) still differ.' },
      { aspect: 'Efficiency', gain: 'High density and fast scaling.', cost: 'Over-requested resources waste capacity; under-requested cause noisy neighbours/OOM kills.' },
    ],
    keyNumbers: [
      { label: 'Container start', value: '~1 s' },
      { label: 'Max nodes (upstream tested)', value: '5,000' },
      { label: 'Default pod eviction delay', value: '~5 min' },
      { label: 'etcd consensus', value: 'Raft (odd quorum)' },
    ],
  },
  cloud: {
    public: {
      summary: 'Managed Kubernetes (EKS, GKE, AKS) runs the control plane for you; you manage node groups (or use Fargate/GKE Autopilot). Alternatives: ECS, Cloud Run and Azure Container Apps for simpler container hosting.',
      stack: ['Amazon EKS + Karpenter', 'Google GKE / Autopilot', 'Azure AKS', 'Amazon ECS / Fargate', 'Cloud Run'],
      points: [
        'Use managed node groups or Karpenter for node lifecycle and right-sized capacity.',
        'Integrate IAM per workload (IRSA / Workload Identity) instead of node-level credentials.',
        'Load balancer controllers create cloud LBs from Ingress/Gateway objects.',
      ],
    },
    private: {
      summary: 'On-prem Kubernetes (OpenShift, Rancher, vanilla kubeadm, Tanzu) needs you to provide what clouds give for free: load balancers (MetalLB), storage (Ceph/Portworx via CSI), node provisioning (Cluster API, MAAS) and control-plane HA.',
      stack: ['Red Hat OpenShift', 'Rancher / RKE2', 'VMware Tanzu', 'MetalLB', 'Rook-Ceph'],
      points: [
        'Run 3 or 5 control-plane nodes for etcd quorum across failure domains.',
        'Plan upgrades carefully — Kubernetes minor versions have a limited support window.',
      ],
    },
    hybrid: {
      summary: 'Kubernetes is a common hybrid abstraction: the same manifests deploy to on-prem and cloud clusters, managed centrally with GitOps (Argo CD/Flux) and fleet tools (Anthos, Azure Arc, Rancher, EKS Anywhere).',
      stack: ['GitOps (Argo CD / Flux)', 'Google Anthos', 'Azure Arc-enabled Kubernetes', 'EKS Anywhere', 'Multi-cluster service mesh'],
      points: [
        'Keep clusters independent (one per site/region) rather than stretching one cluster over a WAN.',
        'Abstract storage and ingress differences with platform-level templates.',
      ],
    },
  },
  examples: [
    {
      company: 'Google',
      headline: 'Borg → Kubernetes',
      scale: 'Billions of containers launched per week internally (as described by Google)',
      detail: 'Kubernetes was open-sourced by Google in 2014, drawing on lessons from Borg, its internal cluster manager. Concepts like declarative desired state, labels and reconciliation loops come directly from that experience.',
      lesson: 'Declarative desired state plus reconciliation is a powerful pattern far beyond containers.',
    },
    {
      company: 'OpenAI',
      headline: 'Scaling Kubernetes to 7,500 nodes',
      scale: '7,500-node clusters for large ML workloads (2021)',
      detail: 'OpenAI has written about running very large Kubernetes clusters for research workloads, describing work on etcd, API-server load, networking and monitoring needed to operate at that scale.',
      lesson: 'At large scale the control plane itself (etcd, API server) becomes the system to engineer.',
    },
  ],
  interview: [
    {
      question: 'What is the difference between a container and a virtual machine?',
      difficulty: 'Junior/Mid',
      answer: [
        'A VM virtualises hardware and runs a full guest OS on a hypervisor — strong isolation, slower boot, more overhead. A container is an isolated process on a shared host kernel using namespaces and cgroups — starts in about a second, lightweight and dense, but with weaker isolation.',
        'In the cloud, containers usually run inside VMs, and micro-VMs (Firecracker, Kata) combine VM isolation with container-like speed.',
      ],
      followUps: [{ q: 'Can a container run a different OS kernel?', a: 'No — containers share the host kernel. A Linux container cannot run a Windows kernel; that needs a VM.' }],
      redFlags: ['Claiming containers are “lightweight VMs” with their own kernel.'],
    },
    {
      question: 'Walk through what happens when you apply a Deployment with 3 replicas.',
      difficulty: 'Junior/Mid',
      answer: [
        'The API server validates and persists it to etcd. The Deployment controller creates a ReplicaSet; the ReplicaSet controller creates 3 Pod objects. The scheduler binds each pod to a node based on resources and constraints. Each node’s kubelet pulls the image and starts the containers. Readiness probes pass, and the pods are added to the Service’s endpoints so they receive traffic.',
        'If a pod dies, the ReplicaSet controller notices fewer than 3 and creates a replacement — the reconcile loop.',
      ],
      followUps: [{ q: 'How does a rolling update work?', a: 'The Deployment creates a new ReplicaSet and shifts replicas gradually (maxSurge / maxUnavailable), waiting for readiness at each step; rollback scales the old ReplicaSet back up.' }],
      redFlags: ['Thinking kubectl talks directly to nodes.'],
    },
    {
      question: 'What are resource requests and limits, and what goes wrong if they are misconfigured?',
      difficulty: 'Senior',
      answer: [
        'Requests are what the scheduler reserves for a pod (used for placement); limits cap usage at runtime. CPU over the limit is throttled; memory over the limit gets the container OOM-killed.',
        'Too-high requests waste capacity (nodes look full while idle). Too-low requests cause overcommitted nodes, noisy neighbours, evictions and OOM kills. CPU limits that are too tight cause throttling latency even at low average utilisation. Set requests from observed usage (VPA recommendations), keep memory limit ≈ request for predictability, and be careful with CPU limits on latency-sensitive services.',
      ],
      followUps: [{ q: 'What are QoS classes?', a: 'Guaranteed (requests = limits), Burstable, BestEffort — they determine eviction order under node memory pressure.' }],
      redFlags: ['Running production pods without requests.'],
    },
    {
      question: 'A node fails. How long until its pods are running elsewhere, and how do you make that faster?',
      difficulty: 'Senior',
      answer: [
        'The node stops heart-beating; after node-monitor grace (~40 s) it is NotReady. Pods have default tolerations for not-ready/unreachable of 300 s, after which they are evicted and recreated elsewhere — roughly 5+ minutes by default, plus image pull and startup.',
        'Faster: shorter tolerationSeconds for critical workloads, multiple replicas spread across nodes/AZs (topologySpreadConstraints) so the service never depends on one node, PodDisruptionBudgets for planned disruptions, pre-pulled images, and spare capacity so replacements schedule immediately.',
      ],
      followUps: [{ q: 'Why not set the eviction timeout to a few seconds?', a: 'Brief network blips would cause mass rescheduling and churn; the timeout trades recovery speed for stability.' }],
      redFlags: ['Running single-replica critical services.'],
    },
    {
      question: 'Your company wants every team on Kubernetes. As a staff engineer, how do you build the platform and avoid it becoming a bottleneck?',
      difficulty: 'Staff',
      answer: [
        'Treat it as a product: golden paths (templates/Helm charts or a higher-level abstraction) that encode probes, resources, autoscaling, security context, observability and network policy by default; GitOps for deploys; self-service namespaces with quotas; policy-as-code (Kyverno/OPA) for guardrails; managed control planes to reduce toil.',
        'Decide cluster topology (per environment/region, not per team), multi-tenancy model, upgrade cadence and ownership boundaries. Measure adoption, lead time and incident rates, and keep escape hatches (serverless, managed PaaS) for workloads that do not fit — not everything belongs on Kubernetes.',
      ],
      followUps: [{ q: 'One cluster or many?', a: 'Several medium clusters (per environment/region) limit blast radius and upgrade risk; one giant shared cluster is efficient but risky; per-team clusters multiply overhead.' }],
      redFlags: ['Raw Kubernetes for every team with no abstraction or guardrails.'],
    },
  ],
};

const serverless: Topic = {
  id: 'serverless',
  title: 'Serverless / FaaS',
  tagline: 'Run functions on demand, scale from zero to thousands of concurrent executions automatically, and pay only for what runs.',
  sceneId: 'serverless',
  camera: { position: [0, 18, 23], target: [-1, 0.5, 0] },
  controls: {
    traffic: true,
    cache: true,
    cacheLabels: { label: 'Execution env', on: 'WARM', off: 'COLD' },
    failureLabel: 'Reserved concurrency = 4',
    failureStates: ['CAPPED', 'unlimited'],
    hint: 'Raise traffic and concurrency grows with it, one environment per in-flight request. Switch to COLD to see slower first requests. Turn on the concurrency cap to see throttling with 429s.',
  },
  fundamentals: {
    what: '**Function-as-a-Service** (AWS Lambda, Google Cloud Functions/Cloud Run functions, Azure Functions) runs your code in response to events — HTTP requests, queue messages, file uploads, schedules — without you managing servers. The platform creates **execution environments** on demand, runs **one request per environment at a time** (Lambda’s model), scales concurrency automatically, and bills per request and per millisecond of compute.',
    why: 'Removes server management, capacity planning and idle cost. Spiky or low-volume workloads cost almost nothing when idle and scale instantly with events. Teams ship glue code, APIs and event processing quickly with built-in HA across AZs.',
    where: 'Event processing (S3 uploads, queue consumers, stream processing), APIs with variable traffic, scheduled jobs, webhooks, data transformation, automation/ops glue. Less suited to long-running jobs, steady high throughput (where containers are cheaper), latency-critical paths sensitive to cold starts, or workloads needing GPUs or special hardware.',
    how: [
      'An event arrives (API Gateway request, SQS batch, S3 notification, EventBridge schedule).',
      'If a **warm** environment is idle, the platform reuses it — the handler runs immediately.',
      'Otherwise it **cold starts**: provisions a micro-VM (Firecracker for Lambda), downloads the code package/image, starts the runtime and runs your **init code** (outside the handler), then invokes the handler.',
      'Each environment processes one event at a time; N concurrent events → N environments (**concurrency**).',
      'Account/region limits and **reserved concurrency** cap concurrency; excess synchronous calls are **throttled** (429), asynchronous events are retried.',
      'Idle environments are kept warm for a while and eventually reclaimed; **provisioned concurrency** keeps a number pre-initialised.',
      'State lives outside the function: DynamoDB, S3, ElastiCache, Step Functions for workflows.',
    ],
    bottlenecks: [
      { problem: 'Paying for idle servers on spiky/low traffic', solution: 'Pay per invocation and execution time; zero cost at zero traffic.' },
      { problem: 'Capacity planning and patching servers', solution: 'The provider manages OS, runtime patching, scaling and AZ redundancy.' },
      { problem: 'Building event plumbing', solution: 'Native triggers from queues, streams, storage and schedules.' },
      { problem: 'Scaling worker fleets with queue depth', solution: 'Pollers scale concurrency automatically with backlog.' },
    ],
    tradeoffs: [
      { aspect: 'Latency', gain: 'Warm invocations are fast.', cost: 'Cold starts add ~100 ms to seconds (runtime, package size, VPC, init code).' },
      { aspect: 'Cost', gain: 'Excellent for spiky/low utilisation.', cost: 'At sustained high throughput, per-ms billing can exceed containers/VMs.' },
      { aspect: 'Limits', gain: 'Built-in safety rails.', cost: 'Max duration (15 min on Lambda), payload sizes, concurrency quotas, limited local disk.' },
      { aspect: 'Downstream pressure', gain: 'Massive automatic scale-out.', cost: 'Can overwhelm databases with connections — use RDS Proxy, DynamoDB, or reserved concurrency.' },
      { aspect: 'Lock-in & debugging', gain: 'Deep integration with the cloud’s event sources.', cost: 'Provider-specific triggers; distributed tracing needed to debug.' },
    ],
    keyNumbers: [
      { label: 'Lambda max duration', value: '15 min' },
      { label: 'Lambda max memory', value: '10,240 MB' },
      { label: 'Default concurrency quota', value: '1,000 / region' },
      { label: 'Cold start (typical)', value: '~100 ms–1 s+' },
    ],
  },
  cloud: {
    public: {
      summary: 'AWS Lambda (with API Gateway, SQS, EventBridge, Step Functions), Google Cloud Run / Cloud Run functions, Azure Functions. Container-based serverless (Cloud Run, Fargate) relaxes FaaS limits while keeping scale-to-zero.',
      stack: ['AWS Lambda', 'API Gateway / Function URLs', 'Step Functions', 'Google Cloud Run', 'Azure Functions'],
      points: [
        'Provisioned concurrency or SnapStart reduce cold starts for latency-sensitive paths.',
        'Use RDS Proxy or HTTP-based datastores (DynamoDB) to avoid connection storms.',
        'Reserved concurrency both guarantees and caps capacity for a function.',
      ],
    },
    private: {
      summary: 'On-prem FaaS platforms run on Kubernetes: Knative, OpenFaaS, OpenWhisk, Fission. They provide scale-to-zero and event triggers, but capacity is the cluster you own and you operate the platform.',
      stack: ['Knative Serving / Eventing', 'OpenFaaS', 'Apache OpenWhisk', 'KEDA (event-driven autoscaling)'],
      points: [
        'KEDA scales ordinary deployments from event sources (Kafka lag, queue depth) — serverless-style scaling without FaaS.',
        'Scale-to-zero saves cluster capacity, not a cloud bill.',
      ],
    },
    hybrid: {
      summary: 'Serverless functions often act as hybrid glue: processing events from on-prem systems via queues, or calling on-prem APIs through VPC-attached functions over Direct Connect.',
      stack: ['VPC-attached Lambda', 'EventBridge', 'SQS bridging', 'Knative on-prem + Cloud Run'],
      points: [
        'VPC-attached functions reaching on-prem add WAN latency to every call — batch where possible.',
        'Knative and Cloud Run share an API model, easing portability.',
      ],
    },
  },
  examples: [
    {
      company: 'Amazon Prime Video',
      headline: 'Moving a monitoring pipeline from serverless to a monolith',
      scale: 'Reported ~90% cost reduction for that component (2023)',
      detail: 'A Prime Video team described a video-quality monitoring service initially built from Step Functions and Lambda. At their scale the per-transition orchestration and S3 intermediate storage were expensive, so they consolidated it into a single process on ECS, cutting infrastructure cost substantially.',
      lesson: 'Serverless is a cost and complexity trade-off, not a default — sustained, high-volume, chatty workloads may be cheaper as long-running services.',
    },
    {
      company: 'AWS Lambda',
      headline: 'Firecracker micro-VMs',
      scale: 'Trillions of invocations per month (as described by AWS)',
      detail: 'AWS built Firecracker, an open-source virtual machine monitor, to run Lambda and Fargate workloads in lightweight micro-VMs that boot in a fraction of a second with strong isolation between tenants.',
      lesson: 'Serverless platforms depend on fast, secure isolation primitives — cold starts are an engineering problem providers keep shrinking.',
    },
  ],
  interview: [
    {
      question: 'What is serverless, and what does “serverless” not mean?',
      difficulty: 'Junior/Mid',
      answer: [
        'Serverless means the provider manages servers, scaling and availability; you deploy functions or containers that run on demand and are billed per use, scaling to zero when idle.',
        'It does not mean there are no servers, no operational concerns, or no limits — you still handle timeouts, concurrency, cold starts, observability, security and downstream capacity.',
      ],
      followUps: [{ q: 'Is a managed database “serverless”?', a: 'Some are (DynamoDB on-demand, Aurora Serverless) in the sense of automatic capacity and per-use billing. The term describes the operating model.' }],
      redFlags: ['Saying serverless is always cheaper.'],
    },
    {
      question: 'What is a cold start and how do you mitigate it?',
      difficulty: 'Junior/Mid',
      answer: [
        'When no warm environment is available, the platform must create one: allocate a micro-VM, load code, start the runtime and run initialisation — adding latency to that request.',
        'Mitigations: smaller packages and fewer dependencies, faster runtimes, lazy initialisation, avoiding heavy frameworks, provisioned concurrency or SnapStart for critical paths, and keeping latency-critical endpoints off FaaS if needed.',
      ],
      followUps: [{ q: 'Why put initialisation outside the handler?', a: 'Init code runs once per environment and is reused by subsequent warm invocations (e.g. DB clients, SDK setup).' }],
      redFlags: ['Using “ping the function every 5 minutes” as the only strategy.'],
    },
    {
      question: 'A Lambda function behind API Gateway is overwhelming your PostgreSQL database. Why, and how do you fix it?',
      difficulty: 'Senior',
      answer: [
        'Each concurrent execution environment opens its own connection(s); a spike to 1,000 concurrent executions means ~1,000 connections, far beyond what PostgreSQL handles, causing errors and memory pressure.',
        'Fixes: RDS Proxy (connection pooling and multiplexing), reserved concurrency to cap the function, buffering writes through SQS with controlled consumer concurrency, caching reads, or choosing a datastore designed for many short-lived HTTP clients (DynamoDB).',
      ],
      followUps: [{ q: 'What does reserved concurrency do exactly?', a: 'It guarantees that many concurrent executions for the function and also caps it at that number; excess invocations are throttled.' }],
      redFlags: ['Raising DB max_connections as the fix.'],
    },
    {
      question: 'When would you choose containers (ECS/Kubernetes) over Lambda?',
      difficulty: 'Senior',
      answer: [
        'Sustained high throughput where always-on containers are cheaper; long-running work beyond 15 minutes; latency-sensitive services where cold starts are unacceptable; need for persistent connections (WebSockets at scale, gRPC streaming), GPUs, large memory or local disk; or heavy frameworks with slow startup.',
        'Lambda wins for event-driven glue, spiky/low traffic, and teams wanting minimal ops. A rough cost model (requests × duration × memory vs. instance-hours at expected utilisation) usually settles it.',
      ],
      followUps: [{ q: 'Middle ground?', a: 'Container-based serverless (Cloud Run, Fargate, App Runner) gives scale-to-zero with fewer FaaS limits and multiple concurrent requests per instance.' }],
      redFlags: ['Tribal answers without cost or latency reasoning.'],
    },
    {
      question: 'Design an image-processing pipeline for user uploads that must handle 100× spikes cost-effectively.',
      difficulty: 'Staff',
      answer: [
        'Clients upload directly to S3 via presigned URLs. S3 events go to an SQS queue (not directly to Lambda) so spikes are buffered and retried. A Lambda consumer with a concurrency limit processes images (resize, thumbnails, moderation), writes results to S3 and metadata to DynamoDB; failures go to a DLQ with alarms. Idempotency keys (object key + version) prevent duplicate work.',
        'For heavy jobs (video) use Step Functions or Fargate/Batch. Serve outputs via CDN. Track cost per image, queue age as the SLO metric, and adjust concurrency to protect downstream services.',
      ],
      followUps: [{ q: 'Why put SQS between S3 and Lambda?', a: 'Buffering, controlled concurrency, batching, visibility-timeout retries and a DLQ — better control than direct async invocation.' }],
      redFlags: ['Uploading through API servers.', 'No idempotency or DLQ.'],
    },
  ],
};

export const module3Topics: Topic[] = [scaling, asg, kubernetes, serverless];
