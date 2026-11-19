import type { Topic } from '../types';

/* Module 1 — Cloud Infrastructure Foundations
 * Prose uses the typographic apostrophe (’) so strings can stay single-quoted.
 */

const publicCloud: Topic = {
  id: 'public-cloud',
  title: 'Public Cloud',
  tagline: 'Rent elastic, globally distributed infrastructure by the second — and design for the failure domains it exposes: regions and availability zones.',
  sceneId: 'public-cloud',
  camera: { position: [2, 18, 25], target: [-1, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'AZ-a outage',
    hint: 'Fail AZ-a and watch the ALB drain its targets and RDS promote the standby in AZ-b. Then raise the traffic rate — capacity is elastic, so nothing saturates.',
  },
  fundamentals: {
    what: 'A **public cloud** is compute, storage, networking and managed services owned and operated by a provider (AWS, Google Cloud, Azure) and rented to many tenants over the Internet through APIs. Capacity is organised into **regions** (geographic areas such as `us-east-1`) made up of multiple **availability zones (AZs)** — one or more physically separate data centres with independent power, cooling and networking, connected by low-latency private fibre.',
    why: 'Before the cloud, adding capacity meant forecasting demand, raising a purchase order and waiting weeks for hardware. The public cloud turns capital expenditure into operating expenditure and capacity into an API call: you can launch a thousand servers in minutes, pay only while they run, and use managed services (databases, queues, ML) instead of operating them yourself. It also hands you a global footprint you could never build alone.',
    where: 'It is the default for most new products, startups, spiky or unpredictable workloads, global consumer apps, and anything that benefits from managed services. It is less ideal for very large, steady, predictable workloads (where owned hardware can be cheaper), ultra-low-latency trading, or data that regulators require to stay on hardware you control.',
    how: [
      'A user resolves `app.example.com` via DNS (often Route 53) to the public IPs of an **Application Load Balancer**, which has nodes in every enabled AZ.',
      'The request crosses the public Internet, enters the provider’s backbone at a nearby edge location, and reaches the VPC through the **Internet Gateway**.',
      'The ALB terminates TLS and forwards the request to a healthy target in an **Auto Scaling Group** spread across AZs (cross-zone load balancing evens out the spread).',
      'The stateless app server reads/writes the **RDS primary**. With Multi-AZ, every committed write is synchronously replicated to a standby in a different AZ before it is acknowledged.',
      'Read-heavy queries may go to **read replicas**, which replicate asynchronously and can lag.',
      'If an AZ fails, ALB health checks stop routing to it within seconds, the ASG launches replacement capacity in healthy AZs, and RDS fails over by repointing its DNS endpoint to the standby (typically 1–2 minutes).',
      'All of it is billed per second/hour/GB, observed via CloudWatch, and defined as code (Terraform/CloudFormation) so the whole environment can be recreated.',
    ],
    bottlenecks: [
      { problem: 'Capacity planning lead time (weeks to months for hardware)', solution: 'On-demand provisioning in minutes; auto-scaling follows demand automatically.' },
      { problem: 'Single data centre = single point of failure', solution: 'Multiple AZs per region with independent power and networking; multi-AZ deployments survive a data-centre loss.' },
      { problem: 'Undifferentiated operational work (patching DBs, replacing disks)', solution: 'Managed services (RDS, DynamoDB, S3, SQS) shift that work to the provider under an SLA.' },
      { problem: 'Global reach requires building data centres abroad', solution: '30+ regions worldwide; deploy a new region with the same templates.' },
    ],
    tradeoffs: [
      { aspect: 'Cost', gain: 'Pay-as-you-go, no capex, scale to zero.', cost: 'At large steady scale, on-demand pricing and **egress fees** can exceed owned hardware; requires FinOps discipline (Savings Plans, Spot, rightsizing).' },
      { aspect: 'Control', gain: 'No hardware to manage.', cost: 'Limited control over hardware, hypervisor, network paths and maintenance timing; you live within provider quotas.' },
      { aspect: 'Reliability', gain: 'AZs/regions make high availability achievable.', cost: 'Only if you architect for it — single-AZ deployments fail with the AZ. Shared control-plane outages (e.g. a region-wide service event) still happen.' },
      { aspect: 'Lock-in', gain: 'Deep managed services accelerate delivery.', cost: 'Proprietary APIs (DynamoDB, Lambda, IAM) make migration expensive.' },
      { aspect: 'Security', gain: 'Mature, audited physical and platform security.', cost: '**Shared responsibility**: misconfigured IAM, open S3 buckets and security groups are still your problem.' },
    ],
    keyNumbers: [
      { label: 'AZs per region (typical)', value: '3–6' },
      { label: 'Inter-AZ latency', value: '< 2 ms' },
      { label: 'RDS Multi-AZ failover', value: '~60–120 s' },
      { label: 'S3 designed durability', value: '99.999999999%' },
    ],
  },
  cloud: {
    public: {
      summary: 'This topic **is** the public model: multi-tenant infrastructure where isolation is logical (hypervisors, VPCs, IAM) rather than physical. The architecture shown — multi-AZ ALB + ASG + RDS Multi-AZ — is the canonical highly available web stack on AWS; GCP and Azure have direct equivalents.',
      stack: ['AWS: VPC, ALB, EC2 ASG, RDS Multi-AZ', 'GCP: VPC, Cloud Load Balancing, MIG, Cloud SQL HA', 'Azure: VNet, App Gateway, VMSS, Azure SQL zone-redundant'],
      points: [
        'Design unit is the **AZ**: spread every tier across ≥ 2 (ideally 3) AZs and size so N−1 AZs can carry peak load.',
        'Keep the app tier **stateless** (sessions in Redis/DynamoDB) so any instance in any AZ can serve any request.',
        'Watch **cross-AZ data transfer** charges — chatty services spread across AZs pay per GB in each direction.',
        'Use quotas, budgets and tagging from day one; cloud cost scales as fast as cloud capacity.',
      ],
    },
    private: {
      summary: 'The same three-tier, N+1 design can be built on-prem: an F5/HAProxy pair instead of an ALB, a VMware or OpenStack cluster instead of an ASG, and an Oracle Data Guard / Postgres Patroni pair instead of RDS Multi-AZ. The difference is that the “AZs” are racks or rooms you built, and capacity is whatever you bought.',
      stack: ['OpenStack Nova + Octavia LB', 'VMware vSphere HA + NSX', 'Patroni / Data Guard', 'Ceph / NetApp'],
      points: [
        'Failure domains are rack, power feed, row, room — rarely truly independent sites unless you pay for a second DC.',
        'Elasticity must be simulated with spare headroom, which is idle capital most of the time.',
        'You operate every “managed service” yourself: backups, failover drills, patching, hardware refresh.',
      ],
    },
    hybrid: {
      summary: 'Many enterprises run the customer-facing tier in the public cloud while the system of record stays on-prem, or use the cloud for disaster recovery of an on-prem stack (“pilot light”). The public cloud VPC connects back via Site-to-Site VPN or Direct Connect.',
      stack: ['AWS Direct Connect', 'Site-to-Site VPN', 'AWS Outposts', 'Azure Arc / Google Distributed Cloud'],
      points: [
        'Cloud as DR target: replicate on-prem databases to the cloud and keep minimal compute warm; scale it up only during a disaster.',
        'AWS Outposts / Azure Stack bring the public-cloud API into your data centre for latency- or residency-bound workloads.',
        'Data gravity matters: keep chatty components on the same side of the WAN link to avoid latency and egress costs.',
      ],
    },
  },
  examples: [
    {
      company: 'Netflix',
      headline: 'All-in on AWS after a data-centre database corruption',
      scale: 'Hundreds of millions of members · multi-region active-active',
      detail: 'In 2008 a database corruption in Netflix’s own data centre halted DVD shipping for days. Netflix decided to move to AWS, completing the migration of its streaming service around 2016. It runs active-active across multiple AWS regions and pioneered **chaos engineering** (Chaos Monkey kills instances in production) to prove the system survives instance, AZ and even region failure.',
      lesson: 'The cloud gives you failure domains, not reliability. Netflix earned its availability by assuming every component will fail and continuously testing that.',
    },
    {
      company: 'Capital One',
      headline: 'A large US bank exits its data centres',
      scale: 'Major regulated bank · data centres closed by 2020',
      detail: 'Capital One announced it had closed its last owned data centre in 2020 and moved its applications to AWS, showing that heavy regulation does not by itself require on-prem infrastructure. Its 2019 breach — caused by a misconfigured web application firewall and over-permissive IAM role — is also the textbook case of the **shared responsibility model**.',
      lesson: 'The provider secures the cloud; you secure what you put in it. IAM least privilege and configuration hygiene are your job.',
    },
    {
      company: 'Stripe',
      headline: 'Payment infrastructure on public cloud with extreme availability targets',
      scale: '~$1 trillion+ total payment volume per year (2023)',
      detail: 'Stripe runs its platform on AWS and engineers for very high API availability. Practices like idempotency keys on every mutating API call, careful multi-AZ database topologies and staged deploys let it tolerate infrastructure failures without double-charging customers.',
      lesson: 'In public cloud, correctness under failure (retries, idempotency) is as important as redundancy.',
    },
  ],
  interview: [
    {
      question: 'What is the difference between a region and an availability zone, and how would you use them to design a highly available web app?',
      difficulty: 'Junior/Mid',
      answer: [
        'A **region** is a geographic area (e.g. `eu-west-1`, Ireland) that is fully isolated from other regions. An **availability zone** is one or more discrete data centres inside a region with independent power, cooling and networking, connected to the other AZs by redundant low-latency links (single-digit ms).',
        'For HA I deploy every tier across at least **2–3 AZs**: a load balancer with nodes in each AZ, an Auto Scaling Group whose instances are balanced across AZs, and a database in Multi-AZ mode (synchronous standby in another AZ). The app tier is stateless, so any instance can serve any request.',
        'I size capacity so that losing one AZ still leaves enough to handle peak — with 3 AZs that means each AZ runs ~50% of peak capacity (N+1). Regions protect against regional disasters or provider control-plane events, which requires a multi-region design (covered in Module 7).',
      ],
      followUps: [
        { q: 'Why not just put everything in one AZ to avoid cross-AZ data transfer costs?', a: 'An AZ is a real failure domain — power events, network partitions and fires have taken out single AZs. The cross-AZ cost is an insurance premium; you can reduce it with AZ-aware routing (keep a request inside one AZ when possible) rather than by giving up redundancy.' },
        { q: 'Does Multi-AZ RDS help read scalability?', a: 'No. The standby in classic Multi-AZ is not readable — it exists purely for failover. Read scaling needs read replicas (or Multi-AZ DB clusters with readable standbys).' },
      ],
      redFlags: ['Treating AZs and regions as the same thing.', 'Designing “HA” with a single database instance.', 'Forgetting to size for N−1 capacity after an AZ loss.'],
    },
    {
      question: 'Explain the shared responsibility model. Give examples of incidents that were the customer’s responsibility.',
      difficulty: 'Junior/Mid',
      answer: [
        'The provider is responsible for **security of the cloud**: physical data centres, hardware, the hypervisor, the global network and the managed-service software. The customer is responsible for **security in the cloud**: IAM policies, network configuration (security groups, NACLs), OS patching on VMs, application code, data classification and encryption choices.',
        'The split shifts with the service level: on EC2 you patch the OS; on RDS the provider patches the DB engine; on Lambda or S3 you mostly manage only identity, configuration and data.',
        'Classic customer-side incidents: publicly readable S3 buckets exposing data, leaked access keys committed to Git, over-privileged IAM roles abused via SSRF (the 2019 Capital One breach), and security groups open to `0.0.0.0/0` on database ports.',
      ],
      followUps: [
        { q: 'How do you prevent public S3 buckets at an organisational level?', a: 'Enable S3 Block Public Access at the account/organisation level, enforce it with Service Control Policies, detect drift with AWS Config / Security Hub rules, and serve public content through CloudFront with Origin Access Control instead of public buckets.' },
        { q: 'Who is responsible if an AZ outage takes down my single-AZ app?', a: 'The provider is responsible for the AZ outage, but the availability of your app is your responsibility: the SLA credits you get rarely compensate for the business loss. Architecting across AZs is on you.' },
      ],
      redFlags: ['“The cloud is secure, so we don’t need to worry about it.”', 'Not knowing that managed services change where the line is drawn.'],
    },
    {
      question: 'Your EC2 bill doubled last month with flat traffic. How do you investigate and what levers do you have?',
      difficulty: 'Senior',
      answer: [
        'First, **attribute** the cost: Cost Explorer grouped by service, account, region, usage type and tags. Doubling with flat traffic usually means something unintended — a runaway auto-scaling policy, forgotten dev/test environments, a new instance family, a NAT Gateway or **data transfer** spike (cross-AZ, inter-region or Internet egress), or unattached EBS volumes and old snapshots.',
        'Then correlate the cost line with deploys and scaling events. Common culprits: a scale-out triggered by a bad metric that never scales in; a service calling another across AZs or regions in a hot loop; logs/metrics with exploding cardinality.',
        'Levers: **rightsizing** (CPU/memory utilisation), **Savings Plans / Reserved Instances** for the steady baseline, **Spot** for fault-tolerant batch and stateless workers, Graviton (ARM) instances for better price-performance, scheduled shutdown of non-prod, VPC endpoints to avoid NAT data processing charges, and AZ-affinity to cut cross-AZ traffic. Institutionalise it with budgets, anomaly detection and tagging enforcement.',
      ],
      followUps: [
        { q: 'When is Spot inappropriate?', a: 'For stateful single instances or workloads that cannot tolerate a 2-minute interruption notice — e.g. a primary database. Spot works best with diversified instance types across AZs and checkpointing.' },
        { q: 'How do you buy commitments without over-committing?', a: 'Commit only to the stable floor of usage (e.g. the p10 of hourly spend over months), use flexible Compute Savings Plans rather than instance-specific RIs, and ladder purchases over time.' },
      ],
      redFlags: ['Jumping straight to “buy reserved instances” without finding the root cause.', 'Ignoring data transfer and NAT costs, which are often the hidden culprits.'],
    },
    {
      question: 'How does an Auto Scaling Group behave during an AZ outage, and what can go wrong?',
      difficulty: 'Senior',
      answer: [
        'The ASG continuously balances instances across its configured AZs. When an AZ fails, instance health checks (EC2 or, better, ELB health checks) fail, the ASG terminates and replaces those instances — but it can only launch them in the healthy AZs. The load balancer stops routing to the failed AZ as soon as targets fail health checks.',
        'Problems: (1) **Capacity crunch** — every customer in the region is trying to launch in the remaining AZs simultaneously, so you may hit insufficient-capacity errors; mitigate with pre-provisioned headroom (static stability), multiple instance types and On-Demand Capacity Reservations. (2) **Slow scale-out** if AMIs are large or boot does heavy work — bake images and use warm pools. (3) **Gray failures** — an AZ that is degraded but not dead passes shallow health checks; use deep health checks and zonal shift.',
        'The principle is **static stability**: the system should survive an AZ loss without needing to make control-plane calls (like launching instances) at the moment of failure.',
      ],
      followUps: [
        { q: 'What is zonal shift?', a: 'A capability (e.g. Route 53 ARC zonal shift for ALB/NLB) to temporarily move traffic away from one AZ when you suspect a gray failure, without waiting for health checks to fail.' },
        { q: 'What does “static stability” cost?', a: 'Running ~50% extra capacity with 3 AZs (each AZ must absorb a third more load). It is a deliberate trade of money for not depending on the control plane during incidents.' },
      ],
      redFlags: ['Assuming new instances will always be available instantly during a regional event.', 'Using only EC2 status checks, which do not detect an unhealthy application.'],
    },
    {
      question: 'Design the network layout (VPC, subnets, routing) for a three-tier app in a public cloud.',
      difficulty: 'Senior',
      answer: [
        'One VPC with a non-overlapping CIDR (e.g. `10.20.0.0/16`, chosen to avoid conflicts with on-prem and other VPCs). In each of 3 AZs: a **public subnet** (load balancer nodes, NAT gateways), a **private app subnet** (EC2/ECS/EKS), and an **isolated data subnet** (RDS, ElastiCache) with no route to the Internet.',
        'Routing: public subnets route `0.0.0.0/0` to the Internet Gateway. Private subnets route to a **NAT gateway in their own AZ** (one per AZ to avoid an AZ dependency and cross-AZ charges). Data subnets have only local routes plus VPC endpoints.',
        'Security: security groups as the primary firewall, referencing each other (ALB SG → app SG → DB SG) instead of CIDRs. VPC endpoints (gateway endpoints for S3/DynamoDB, interface endpoints for other services) keep AWS API traffic private and cut NAT costs. Flow logs on for forensics.',
      ],
      followUps: [
        { q: 'Why one NAT gateway per AZ?', a: 'A single NAT gateway lives in one AZ; if that AZ fails, every private subnet loses outbound Internet. Per-AZ NAT also avoids cross-AZ data processing charges.' },
        { q: 'How large should subnets be?', a: 'Large enough for growth — EKS in particular consumes an IP per pod with the VPC CNI. Under-sized subnets are painful to fix later; plan /19–/20 for app subnets in busy VPCs.' },
      ],
      redFlags: ['Putting databases in public subnets.', 'Overlapping CIDRs with on-prem, which blocks future hybrid connectivity.'],
    },
    {
      question: 'When would you recommend NOT using the public cloud?',
      difficulty: 'Staff',
      answer: [
        'When the economics or constraints favour owned infrastructure: (1) **Large, steady, predictable workloads** where utilisation of owned hardware would be high — the premium for elasticity is wasted (Dropbox’s storage, 37signals’ apps). (2) **Bandwidth-heavy** workloads where egress fees dominate (video, large dataset distribution). (3) **Specialised hardware or latency** requirements (HFT co-location, custom networking). (4) **Sovereignty/regulatory** rules not satisfiable by a local region. (5) Organisations with existing, efficient data-centre operations and depreciated assets.',
        'I would frame it as a total-cost-of-ownership comparison over 3–5 years: hardware + facilities + power + network + **people** + the opportunity cost of slower delivery, versus cloud list price minus commitments. Engineering time is usually the variable people underestimate in both directions.',
        'In practice the answer is often hybrid: keep the steady base on owned capacity and burst, experiment and run managed services in the cloud — and keep the architecture portable enough (containers, Terraform, open databases) that the decision can be revisited.',
      ],
      followUps: [
        { q: 'How do you avoid lock-in without losing cloud velocity?', a: 'Accept lock-in where it buys a lot (managed databases, IAM), abstract where it is cheap (containers, Kubernetes, OpenTelemetry, Terraform), and keep data in open formats. Full portability is expensive; selective portability is pragmatic.' },
      ],
      redFlags: ['Dogmatic answers (“always cloud” / “cloud is a scam”).', 'Ignoring people cost in TCO comparisons.'],
    },
  ],
};

const privateCloud: Topic = {
  id: 'private-cloud',
  title: 'Private Cloud',
  tagline: 'Cloud-style self-service and virtualisation on hardware you own — maximum control and predictable cost, bounded by the capacity you bought.',
  sceneId: 'private-cloud',
  camera: { position: [1, 18, 25], target: [-1, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'Hypervisor host 1',
    hint: 'Push traffic above 75% and watch the fixed-capacity cluster saturate (amber). Then fail host 1: HA restarts its VMs on hosts 2–3, but the N+1 headroom is gone.',
  },
  fundamentals: {
    what: 'A **private cloud** is infrastructure dedicated to a single organisation — usually in its own or a colocated data centre — that offers cloud-like capabilities: virtualisation, self-service provisioning via API/portal, software-defined networking and storage, and metering. Typical stacks are **VMware vSphere/vCenter/NSX**, **OpenStack** (Nova, Neutron, Cinder, Swift) or Kubernetes on bare metal, on top of owned servers, switches and storage arrays.',
    why: 'Organisations choose it for **control** (hardware, network paths, maintenance windows), **regulatory or data-sovereignty** requirements, **predictable cost** for steady workloads with high utilisation, specialised hardware, very low latency to existing systems (e.g. mainframes), or because they already own efficient data centres. It lets internal teams get cloud-style agility without handing infrastructure to a third party.',
    where: 'Banks, governments, defence, telcos, healthcare and large enterprises with legacy estates; companies at a scale where owning hardware is clearly cheaper (Dropbox’s storage); research organisations with huge steady compute (CERN). It is a poor fit for spiky, unpredictable demand or small teams without data-centre expertise.',
    how: [
      'Corporate users reach the data centre over **MPLS or SD-WAN**; external users through the DC’s Internet edge.',
      'Traffic passes **perimeter firewalls/IPS** that you operate, then a **spine-leaf** network fabric.',
      'A hardware or software **load balancer** pair (F5, Citrix, HAProxy, OpenStack Octavia) distributes requests across VMs.',
      'VMs run on a **hypervisor cluster** (ESXi or KVM). VM disks live on **shared storage** (SAN, vSAN, Ceph) so any host can run any VM.',
      'If a host dies, **vSphere HA** (or OpenStack evacuation) restarts its VMs on surviving hosts — a restart, not a live migration, so those VMs see minutes of downtime. Planned maintenance uses **vMotion/live migration** with no downtime.',
      'Capacity is fixed: when the cluster runs hot, new capacity requires procurement, racking, cabling and burn-in — typically **weeks to months**.',
      'A self-service portal or API (vRealize/Aria, OpenStack Horizon, Terraform providers) lets teams provision VMs, networks and volumes within quotas.',
    ],
    bottlenecks: [
      { problem: 'Regulated data cannot leave owned or in-country infrastructure', solution: 'Physical and legal control over where data lives and who can touch the hardware.' },
      { problem: 'Unpredictable cloud bills for steady, high-utilisation workloads', solution: 'Capex amortised over 3–5 years; marginal cost of using existing capacity is close to zero.' },
      { problem: 'Slow ticket-based provisioning in traditional IT', solution: 'Virtualisation + self-service APIs give developers VMs/networks in minutes — within the capacity pool.' },
      { problem: 'Latency to on-prem systems of record (mainframes, factory floors)', solution: 'Workloads sit microseconds away from the systems they integrate with.' },
    ],
    tradeoffs: [
      { aspect: 'Elasticity', gain: 'Guaranteed capacity you own.', cost: 'Hard ceiling; peaks must be pre-provisioned as idle headroom.' },
      { aspect: 'Cost', gain: 'Lower unit cost at high, steady utilisation.', cost: 'Large upfront capex, refresh cycles, facilities, and expensive specialised staff.' },
      { aspect: 'Control & compliance', gain: 'Full control of hardware, network and data location.', cost: 'You own every security control, patch and audit.' },
      { aspect: 'Velocity', gain: 'No provider quotas or surprise deprecations.', cost: 'No catalogue of hundreds of managed services; you build or buy each one.' },
      { aspect: 'Vendor risk', gain: 'Independence from hyperscalers.', cost: 'Dependence on hypervisor/storage vendors instead (e.g. VMware licensing changes after the Broadcom acquisition).' },
    ],
    keyNumbers: [
      { label: 'Hardware refresh cycle', value: '3–5 years' },
      { label: 'New capacity lead time', value: 'weeks–months' },
      { label: 'vSphere HA restart', value: '~minutes' },
      { label: 'Target cluster headroom', value: 'N+1 or more' },
    ],
  },
  cloud: {
    public: {
      summary: 'Public cloud offers “virtual private cloud” features that mimic private-cloud isolation: VPCs, dedicated hosts, dedicated tenancy, and sovereign/government regions. These give logical or single-tenant hardware isolation while keeping elasticity and managed services.',
      stack: ['VPC + Dedicated Hosts', 'AWS GovCloud / sovereign regions', 'Azure Dedicated Host', 'GCP Sole-tenant nodes'],
      points: [
        'Dedicated hosts solve per-socket licensing (Oracle, Windows) and some compliance requirements.',
        'Sovereign regions address many residency rules without owning hardware.',
        'VPC isolation is logical: tenants share physical infrastructure underneath.',
      ],
    },
    private: {
      summary: 'The scene shows the classic private-cloud stack: perimeter firewall → spine-leaf fabric → hardware LB → hypervisor cluster with shared storage → databases. OpenStack provides the API layer (Nova compute, Neutron networking, Cinder block, Swift object, Keystone identity); VMware provides vCenter, vSAN and NSX equivalents.',
      stack: ['OpenStack Nova/Neutron/Cinder/Swift', 'VMware vSphere + vSAN + NSX', 'Ceph', 'Kubernetes on bare metal', 'MAAS / Ironic'],
      points: [
        'Design for **N+1 (or N+2)** hosts per cluster so one failure plus one maintenance does not exhaust capacity.',
        'Use separate failure domains (racks, power feeds, top-of-rack switches) and spread replicas across them.',
        'Self-service and quotas are what make it a *cloud* rather than just virtualisation.',
        'Track utilisation carefully: the business case depends on keeping expensive hardware busy.',
      ],
    },
    hybrid: {
      summary: 'Most private clouds today are one half of a hybrid estate: steady workloads stay on owned hardware while burst, DR or new greenfield services run in public cloud. Consistent tooling across both (Kubernetes, Terraform, VMware Cloud on AWS, Azure Arc, Anthos) reduces the operational split.',
      stack: ['VMware Cloud on AWS', 'Azure Arc / Azure Stack HCI', 'Google Distributed Cloud', 'AWS Outposts', 'Red Hat OpenShift'],
      points: [
        '“Cloud bursting” moves overflow to the public cloud when the private cluster saturates — the scenario you just saw at 75%+ load.',
        'Public cloud is a common DR site for private clouds, avoiding the cost of a second owned data centre.',
        'Network connectivity (Direct Connect/ExpressRoute/Interconnect) becomes critical infrastructure.',
      ],
    },
  },
  examples: [
    {
      company: 'Dropbox',
      headline: 'Moving storage off public cloud to an in-house system',
      scale: 'Exabyte-scale storage · “Magic Pocket”',
      detail: 'Dropbox originally stored file data on Amazon S3. Around 2015–2016 it migrated the vast majority of user data to **Magic Pocket**, its own custom storage system on its own hardware. Its 2018 IPO filing attributed substantial infrastructure savings (tens of millions of dollars over two years) to the move.',
      lesson: 'At very large, predictable scale with a core competency in the workload itself, owning infrastructure can beat public-cloud pricing.',
    },
    {
      company: 'CERN',
      headline: 'One of the largest OpenStack private clouds',
      scale: 'Hundreds of thousands of CPU cores',
      detail: 'CERN runs a large OpenStack-based private cloud to process data from the Large Hadron Collider, providing self-service VMs and bare metal to thousands of physicists. The workload is massive, steady and research-funded, which suits owned capacity.',
      lesson: 'Private cloud shines for large, sustained, specialised compute with in-house expertise.',
    },
    {
      company: '37signals',
      headline: 'A well-publicised “cloud exit”',
      scale: 'SaaS (Basecamp, HEY) · exited cloud compute in 2023',
      detail: '37signals moved its applications off public cloud compute onto purchased servers in colocated data centres, publicly projecting savings of millions of dollars over five years. Their apps had stable, well-understood load, and they had operations expertise.',
      lesson: 'Cloud repatriation is rational for steady workloads — but the calculation must include people, facilities and the loss of managed services.',
    },
  ],
  interview: [
    {
      question: 'What makes a private cloud a “cloud” rather than just a virtualised data centre?',
      difficulty: 'Junior/Mid',
      answer: [
        'Virtualisation alone just consolidates servers. A private cloud adds the essential cloud characteristics (as defined by NIST): **on-demand self-service** (developers provision via API/portal without a ticket), **broad network access**, **resource pooling** (shared compute/storage/network with quotas), **rapid elasticity** (within the pool’s capacity) and **measured service** (metering, showback/chargeback).',
        'Concretely that means an API layer like OpenStack or VMware Aria, software-defined networking (Neutron, NSX) so networks can be created programmatically, software-defined storage, identity integration and quota management — usually driven by Terraform or similar.',
      ],
      followUps: [
        { q: 'Is Kubernetes on bare metal a private cloud?', a: 'It provides self-service, pooling and metering for containers, so it delivers many private-cloud properties, but you still need machine provisioning (e.g. MAAS/Ironic), storage and networking layers underneath.' },
      ],
      redFlags: ['Equating “private cloud” with “we have VMware”.', 'Not mentioning self-service and APIs.'],
    },
    {
      question: 'How does a VMware/OpenStack cluster recover from a host failure, and what capacity do you need?',
      difficulty: 'Junior/Mid',
      answer: [
        'With shared storage, VM disks are not on the failed host, so the cluster manager (vSphere HA, or an OpenStack evacuate workflow/Masakari) detects the failure via heartbeats and **restarts** the VMs on surviving hosts. It is a cold restart — those VMs lose in-memory state and see minutes of downtime — unlike vMotion/live migration, which is used for *planned* maintenance with no downtime.',
        'This only works if survivors have spare capacity, so clusters are sized **N+1** (or N+2 to tolerate a failure during maintenance). HA admission control reserves that headroom so you cannot accidentally overcommit it.',
        'Applications that need zero downtime still need application-level redundancy (two VMs on different hosts via anti-affinity rules, behind a load balancer).',
      ],
      followUps: [
        { q: 'What is split-brain in this context?', a: 'If a host is isolated from the network but still running, the cluster may think it failed and restart its VMs elsewhere, giving two copies writing to the same disk. Datastore heartbeats and isolation responses (power off VMs on isolation) prevent this.' },
      ],
      redFlags: ['Confusing HA restart with live migration.', 'Not reserving failover capacity.'],
    },
    {
      question: 'How would you build a 5-year TCO comparison between private and public cloud for a workload?',
      difficulty: 'Senior',
      answer: [
        '**Private side**: servers, storage, network gear (amortised over 3–5 years), software licences (hypervisor, OS, support contracts), data-centre space/power/cooling or colocation fees, WAN/Internet transit, spares, and — most often underestimated — the **people** to run hardware, virtualisation, storage, networking, security and on-call, plus the headroom you must buy for peaks and failures (utilisation of 40–60% is common).',
        '**Public side**: compute/storage at realistic discounts (Savings Plans, RIs, Spot), managed services, **data egress** and cross-AZ transfer, support plans, plus the people for cloud operations and FinOps. Include migration costs and dual-running periods.',
        'Then add the qualitative factors: time-to-market, access to managed services, elasticity value (how spiky is the load?), compliance, risk concentration and vendor lock-in. Run sensitivity analysis on growth and utilisation — the answer often flips around a utilisation threshold.',
      ],
      followUps: [
        { q: 'Which single variable most often flips the decision?', a: 'Average utilisation of owned hardware. Above ~60–70% sustained, owned hardware tends to win on unit cost; at low or spiky utilisation, cloud elasticity wins.' },
      ],
      redFlags: ['Comparing list price of EC2 to the price of a server and stopping there.', 'Ignoring staffing and facilities.'],
    },
    {
      question: 'Your private cloud is at 85% utilisation and procurement takes 10 weeks. Traffic is growing 8% per month. What do you do?',
      difficulty: 'Senior',
      answer: [
        'At 8%/month compounding, demand grows ~22% in 10 weeks, so the cluster will saturate before new hardware arrives. Short term: **reclaim** capacity (idle/zombie VMs, oversized VMs, dev/test shutdown at night), tighten overcommit carefully, and **prioritise** — tier workloads so critical services keep capacity and batch jobs yield.',
        'Medium term: **burst to public cloud** for stateless or batch tiers via an existing VPN/Direct Connect link and consistent deployment tooling (containers, Terraform). Place an order now sized not just for 10 weeks but for the next forecast horizon, and change the process: forecast-driven procurement with a buffer that accounts for lead time.',
        'Long term, treat capacity as a pipeline: lead time × growth rate tells you how much headroom to keep. If growth is volatile, a hybrid model where the cloud absorbs variance is cheaper than buying for the worst case.',
      ],
      followUps: [
        { q: 'What is safe to burst and what is not?', a: 'Stateless web/API tiers and batch/analytics jobs burst well. Latency-sensitive services that make many round trips to on-prem databases burst poorly — the WAN latency is added to every call.' },
      ],
      redFlags: ['Not doing the compounding arithmetic.', 'Suggesting raising CPU overcommit without discussing the latency/noisy-neighbour risk.'],
    },
    {
      question: 'How do you provide multi-tenancy and isolation between internal teams in a private cloud?',
      difficulty: 'Senior',
      answer: [
        'Isolation layers: **identity and projects/tenants** (Keystone projects, vCenter folders/permissions) with quotas; **network isolation** with overlays (VXLAN via Neutron/NSX) giving each tenant its own L2/L3 networks, plus micro-segmentation firewalls; **compute** controls — anti-affinity, dedicated host aggregates for sensitive workloads, CPU pinning for noisy neighbours; **storage** separation with per-tenant pools/volumes and encryption.',
        'Operationally: chargeback/showback so teams see the cost of what they reserve, audit logging of all API calls, and a policy-as-code layer (OPA, Sentinel) on top of Terraform to enforce guardrails.',
      ],
      followUps: [{ q: 'How is this different from public-cloud multi-tenancy?', a: 'Conceptually similar, but in a private cloud tenants are internal teams, so isolation is often about blast radius, compliance scopes (e.g. PCI) and fairness rather than hostile tenants. Hardware separation is easier to grant when you own the hardware.' }],
      redFlags: ['Relying only on VLANs for isolation at scale (4094 limit, no micro-segmentation).'],
    },
    {
      question: 'Your company is reconsidering its VMware-based private cloud after a large licensing price increase. How would you lead the decision?',
      difficulty: 'Staff',
      answer: [
        'Frame the options: (1) **renegotiate and stay** — lowest risk, highest cost; (2) **migrate hypervisor** to KVM-based platforms (OpenStack, Proxmox, OpenShift Virtualization, Nutanix AHV); (3) **move to public cloud** (rehost via VMware Cloud on AWS/Azure VMware Solution as a stepping stone, then modernise); (4) **containerise** the workloads that can be, shrinking the VM estate regardless.',
        'Build an inventory with dependency mapping and classify workloads by business criticality, licence constraints, latency to on-prem systems and modernisation potential. Model TCO for each option over 5 years including migration effort, retraining and dual-running.',
        'Run a pilot migration on representative workloads to measure real effort. Sequence the programme to exit the most expensive licences first, negotiate a bridge contract to avoid a cliff, and keep the platform team’s skills in mind — a new hypervisor is also a new operational discipline.',
      ],
      followUps: [{ q: 'What is the biggest hidden risk?', a: 'The surrounding ecosystem: backup, DR orchestration, monitoring and security tooling are often VMware-integrated. Replacing the hypervisor means replacing or re-validating all of them.' }],
      redFlags: ['Choosing a platform before inventorying workloads.', 'Ignoring operational skills and tooling dependencies.'],
    },
  ],
};

const hybridCloud: Topic = {
  id: 'hybrid-cloud',
  title: 'Hybrid Cloud',
  tagline: 'One logical estate spanning owned data centres and public cloud — keep regulated data and steady load on-prem, burst and innovate in the cloud.',
  sceneId: 'hybrid-cloud',
  camera: { position: [0, 18, 24], target: [0, 0.5, 0] },
  controls: {
    traffic: true,
    link: true,
    failureLabel: 'Primary link',
    hint: 'Switch between Direct Connect and VPN and watch packet speed and jitter change. Then fail the primary link and see BGP fail over to the other path.',
  },
  fundamentals: {
    what: 'A **hybrid cloud** combines private infrastructure (on-prem or colocated) with one or more public clouds, connected by private networking and operated as one environment: shared identity, consistent networking (non-overlapping IP space and routing), unified security policy, and tooling that can deploy to either side. When several public clouds are involved it is often called **multi-cloud**.',
    why: 'Very few large organisations can — or should — move everything at once. Hybrid lets them keep systems of record, regulated data and steady workloads where they are, while using the public cloud for **elastic burst capacity**, **disaster recovery**, analytics/ML, and new digital products. It also addresses **data residency** (personal data must stay in-country or on owned hardware) and latency to on-prem systems such as mainframes or factory equipment.',
    where: 'Banks and insurers (core ledger on mainframe, mobile apps in the cloud), retailers (stores and DCs on-prem, e-commerce in the cloud), healthcare (patient records on-prem, analytics on anonymised data in the cloud), manufacturing (OT/edge on-prem), and any enterprise mid-migration.',
    how: [
      'Plan a **single IP address space** across on-prem and every VPC/VNet — overlapping CIDRs are the number-one blocker for hybrid routing.',
      'Connect the sites with **Site-to-Site VPN** (IPsec over the Internet; quick, cheap) and/or **Direct Connect / ExpressRoute / Cloud Interconnect** (dedicated private circuits; fast, consistent). Production estates usually use DX as primary and VPN as backup.',
      'Run **BGP** across the links so routes propagate automatically and failover happens without manual changes. Prefer DX with AS-path prepending, local preference or more-specific prefixes.',
      'Terminate the cloud side on a **Transit Gateway** (or Virtual WAN / Network Connectivity Center) so all VPCs share the hybrid connection.',
      'Extend **identity** (Active Directory/Entra ID, Okta federation) and **DNS** (Route 53 Resolver endpoints forwarding between on-prem and cloud zones) across both sides.',
      'Decide **workload placement** by data gravity, latency, compliance and cost. In the scene, cloud burst workers call back to the on-prem PII service, so raw personal data never leaves the data centre — only tokens and results do.',
      'Operate with a common control plane where possible: Kubernetes everywhere, Terraform, centralised logging/monitoring, and policy-as-code.',
    ],
    bottlenecks: [
      { problem: 'Private data centre capacity is fixed, demand is spiky', solution: 'Cloud bursting: overflow workloads scale out in public cloud and back to zero afterwards.' },
      { problem: 'Regulations require some data to stay in-country / on owned infrastructure', solution: 'Keep regulated data on-prem; send only tokenised/anonymised data or requests to the cloud.' },
      { problem: 'A second owned DC for disaster recovery is very expensive', solution: 'Use the cloud as the DR site (pilot light / warm standby) and pay for it mostly when needed.' },
      { problem: 'Big-bang migrations are risky', solution: 'Migrate incrementally, service by service, over a private network that makes both sides reachable.' },
    ],
    tradeoffs: [
      { aspect: 'Flexibility', gain: 'Place each workload where it fits best.', cost: 'Two (or more) operating models, skill sets and toolchains.' },
      { aspect: 'Latency', gain: 'Systems of record stay close to their users/devices.', cost: 'Every cross-site call adds WAN RTT (2–5 ms on DX, 20–60+ ms on VPN). Chatty cross-boundary designs suffer.' },
      { aspect: 'Cost', gain: 'Use sunk on-prem capacity and pay for cloud only for variable load.', cost: 'Circuit fees, egress charges, and duplicated tooling.' },
      { aspect: 'Security', gain: 'Sensitive data stays under direct control.', cost: 'Larger attack surface; identity, policy and logging must be unified or gaps appear.' },
      { aspect: 'Resilience', gain: 'Either side can back up the other.', cost: 'The interconnect becomes a critical dependency and needs its own redundancy.' },
    ],
    keyNumbers: [
      { label: 'Direct Connect port speeds', value: '1/10/100 Gbps' },
      { label: 'VPN throughput per tunnel', value: '≈1.25 Gbps' },
      { label: 'DX RTT (same metro)', value: '~1–5 ms' },
      { label: 'DX provisioning time', value: 'weeks' },
    ],
  },
  cloud: {
    public: {
      summary: 'The public-cloud half provides elastic compute (ASGs, Spot, Kubernetes node pools), managed data and analytics services, and the cloud-side network hub (Transit Gateway / Virtual WAN / Network Connectivity Center) where the hybrid links terminate.',
      stack: ['AWS Transit Gateway', 'Azure Virtual WAN + ExpressRoute', 'GCP Cloud Interconnect + NCC', 'Route 53 Resolver endpoints'],
      points: [
        'Put the hybrid connection on a shared **network/hub account**, not in individual application VPCs.',
        'Use **Route 53 Resolver** inbound/outbound endpoints (or Azure DNS Private Resolver) for two-way DNS between on-prem and cloud.',
        'Egress from cloud to on-prem over DX is billed at lower DX data-transfer rates than Internet egress.',
      ],
    },
    private: {
      summary: 'The on-prem half keeps systems of record, regulated datasets and steady workloads. It needs edge routers that speak BGP, a carrier circuit to a Direct Connect location, firewalls that inspect hybrid traffic, and an identity source that both sides trust.',
      stack: ['Customer edge routers (BGP)', 'Carrier circuit / colocation', 'Active Directory / Entra ID', 'On-prem Kubernetes / VMware'],
      points: [
        'Run **two edge routers** and two circuits (ideally in two DX locations) to avoid single points of failure.',
        'Tokenise or anonymise data at the boundary when residency rules apply.',
        'Keep on-prem change windows and cloud deployment velocity from blocking each other via clear interfaces (APIs, events).',
      ],
    },
    hybrid: {
      summary: 'This topic is hybrid by definition. The essential building blocks are: non-overlapping IP plan, redundant private connectivity (DX primary + VPN backup) running BGP, a cloud transit hub, unified DNS and identity, consistent policy, and a workload-placement strategy driven by data gravity and residency.',
      stack: ['Site-to-Site VPN', 'AWS Direct Connect', 'VPC Peering', 'Transit Gateway', 'Kubernetes / Anthos / Arc / EKS Anywhere'],
      points: [
        '**Data residency**: keep personal data in the jurisdiction; process it locally and send aggregates or tokens to the cloud.',
        '**Cloud bursting** works best for stateless or batch workloads that do not need many round trips to on-prem data.',
        '**DR to cloud**: replicate databases continuously; keep infrastructure as code ready to scale out the standby.',
        'Monitor the interconnect like a production service: BGP state, utilisation, latency, packet loss.',
      ],
    },
  },
  examples: [
    {
      company: 'Uber',
      headline: 'From owned data centres toward a hybrid/multi-cloud model',
      scale: 'Millions of trips per day · global',
      detail: 'Uber historically ran much of its infrastructure in its own data centres alongside public-cloud services. In 2023 it announced multi-year agreements with **Oracle Cloud** and **Google Cloud** to move significant workloads, while still operating a hybrid estate during the transition.',
      lesson: 'Large migrations are multi-year hybrid periods; the network and platform layers must make both sides feel like one environment.',
    },
    {
      company: 'Zoom',
      headline: 'Bursting into public cloud during a demand shock',
      scale: 'Daily meeting participants jumped from ~10M to 300M in early 2020',
      detail: 'Zoom ran its own co-located data centres and used public cloud capacity as well. When the pandemic multiplied demand within weeks, it added large amounts of capacity from AWS and Oracle Cloud — something no procurement cycle for owned hardware could have delivered in time.',
      lesson: 'Hybrid gives you the economics of owned capacity for the baseline and the elasticity of cloud for the unexpected.',
    },
    {
      company: 'Walmart',
      headline: 'A hybrid “triplet” model',
      scale: 'Thousands of stores · global e-commerce',
      detail: 'Walmart has described a hybrid architecture that combines its own regional private-cloud data centres with public clouds (Microsoft Azure and Google Cloud), with a platform layer that lets applications be deployed across them and traffic shifted between them.',
      lesson: 'A consistent platform layer (containers, deployment tooling, networking) is what turns separate clouds into one hybrid system.',
    },
  ],
  interview: [
    {
      question: 'What is a hybrid cloud and why would a company choose it over going all-in on one model?',
      difficulty: 'Junior/Mid',
      answer: [
        'A hybrid cloud is a combination of private infrastructure and public cloud connected by private networking and managed as one environment — shared IP plan, identity, security policy and deployment tooling.',
        'Reasons: **regulation and data residency** (some data must stay on owned or in-country infrastructure), **existing investment** (depreciated hardware, mainframes that cannot move), **latency** to on-prem systems or devices, **elasticity** for peaks without buying hardware, **cloud as DR site**, and **incremental migration** without a risky big bang.',
        'The cost is complexity: two operating models, a critical interconnect, and the discipline needed to keep security and observability consistent.',
      ],
      followUps: [{ q: 'Is multi-cloud the same as hybrid?', a: 'Not exactly. Hybrid = private + public; multi-cloud = more than one public provider. Many enterprises are both. The networking and governance challenges are similar.' }],
      redFlags: ['Defining hybrid as “we use some SaaS tools”.', 'Not mentioning the connectivity or governance cost.'],
    },
    {
      question: 'How do you decide which workloads stay on-prem and which move to the cloud?',
      difficulty: 'Senior',
      answer: [
        'I score workloads on: **data gravity** (where its data lives and how much it moves), **latency and chattiness** to other systems, **compliance/residency** constraints, **load profile** (steady vs spiky), **licensing** constraints, **modernisation potential** and **business value** of faster change.',
        'Good cloud candidates: spiky customer-facing tiers, new products, analytics/ML on anonymised data, DR, dev/test. Good on-prem candidates: systems of record with strict residency, steady high-utilisation workloads, latency-critical integrations with mainframes or factory equipment.',
        'Crucially, move **cohesive groups** of services together: splitting a chatty service from its database across a WAN adds RTT to every query (a 5 ms RTT × 50 queries per request = 250 ms). Use dependency mapping before deciding.',
      ],
      followUps: [{ q: 'How do you handle a service that needs on-prem data but needs to scale in the cloud?', a: 'Options: cache/replicate a read-only, residency-compliant subset to the cloud; tokenise data at the boundary; make calls coarse-grained (one batched call instead of many); or move processing to the data instead of moving data to processing.' }],
      redFlags: ['Ignoring latency between split components.', 'Deciding purely on cost.'],
    },
    {
      question: 'Design network connectivity between an on-prem data centre and AWS for a production hybrid workload.',
      difficulty: 'Senior',
      answer: [
        '**Primary**: two Direct Connect connections at **two different DX locations**, each to a different on-prem edge router, using transit VIFs to a Direct Connect Gateway attached to a Transit Gateway. This meets AWS’s “maximum resiliency” pattern. **Backup**: Site-to-Site VPN attached to the same TGW.',
        '**Routing**: BGP everywhere. AWS prefers DX over VPN for the same prefix; on-prem, set local preference to prefer DX. Enable **BFD** on DX for sub-second failure detection. Summarise prefixes to stay within route limits.',
        '**IP plan & DNS**: non-overlapping CIDRs; Route 53 Resolver endpoints for bidirectional DNS forwarding. **Security**: on-prem firewalls inspect hybrid traffic; optionally a TGW inspection VPC; encrypt DX with MACsec (on supported ports) or IPsec over DX if policy requires encryption in transit.',
        '**Capacity**: size the VPN backup for critical traffic only, or accept degraded mode; monitor utilisation so that failover onto VPN does not saturate it.',
      ],
      followUps: [
        { q: 'Why two DX locations instead of two connections at one location?', a: 'A single DX location is a single facility — power, fibre or facility incidents would take out both connections. Two locations eliminate that shared fate.' },
        { q: 'Is Direct Connect encrypted?', a: 'Not by default. It is private, not encrypted. Use MACsec on supported dedicated connections or run IPsec VPN over the DX public/transit VIF if encryption is required.' },
      ],
      redFlags: ['Single DX with no backup.', 'Assuming DX is encrypted.', 'No mention of BGP or how failover actually happens.'],
    },
    {
      question: 'How do you satisfy GDPR-style data residency while using public cloud for analytics?',
      difficulty: 'Senior',
      answer: [
        'Classify data first: which fields are personal or sensitive, and what jurisdictions apply. Options then include: (1) use a **public-cloud region inside the jurisdiction**, often sufficient for residency; (2) **tokenise or pseudonymise** at the boundary — keep the token vault on-prem (as in the scene) and ship only tokens to the cloud; (3) **aggregate/anonymise** before export; (4) keep processing local and send only results.',
        'Add controls: customer-managed encryption keys (possibly in an on-prem HSM via external key store), service control policies that deny resource creation outside approved regions, data-loss-prevention scanning, and audit logs proving where data went.',
        'Remember residency also covers backups, logs, support access and replication targets — a backup copied to another region can violate it.',
      ],
      followUps: [{ q: 'Is pseudonymised data still personal data?', a: 'Under GDPR, pseudonymised data is still personal data if it can be re-identified with additional information (the token vault). Truly anonymised data is out of scope, but robust anonymisation is hard.' }],
      redFlags: ['Assuming encryption alone solves residency.', 'Forgetting logs and backups.'],
    },
    {
      question: 'Your primary Direct Connect link fails. Walk me through what happens at each layer.',
      difficulty: 'Senior',
      answer: [
        '**Physical/L2**: the optical signal drops or the link stays up but stops forwarding. **Detection**: with **BFD**, failure is detected in under a second; without it, BGP waits for the hold timer (default 90 s on AWS) — a long outage.',
        '**Routing**: the BGP session goes down, the routes learned over DX are withdrawn from the TGW/VGW route tables and from on-prem routers. The next-best routes — over the second DX or the VPN — are already in the tables and become active. Traffic re-converges, typically in seconds.',
        '**Transport/application**: in-flight TCP connections may see retransmits; long-lived connections usually survive if the path change is quick, since IPs are unchanged. If the backup is a VPN with lower throughput, latency rises and large transfers slow — capacity planning determines whether this is degraded or broken.',
        '**Operations**: alerts on BGP state and link metrics fire; the provider/carrier is engaged; after repair, routes come back and traffic shifts back (optionally with dampening to avoid flapping).',
      ],
      followUps: [{ q: 'How do you test this safely?', a: 'Schedule failover drills: shut the BGP session on the DX in a maintenance window (or use the AWS DX failover testing feature), observe convergence time and backup utilisation, then restore.' }],
      redFlags: ['No mention of BGP or timers.', 'Assuming the backup link has unlimited capacity.'],
    },
    {
      question: 'As a staff engineer, how would you prevent a hybrid estate from turning into two disconnected platforms?',
      difficulty: 'Staff',
      answer: [
        'Define a **platform contract** independent of where code runs: container images, a deployment pipeline that targets both on-prem Kubernetes and cloud Kubernetes (or ECS), Terraform modules with the same interfaces, and service templates with built-in observability.',
        'Unify the **cross-cutting planes**: one identity provider and workload identity scheme, one secrets approach, one logging/metrics/tracing stack (OpenTelemetry), one policy engine (OPA/Kyverno, SCPs), one service catalogue. Networking: a single IP plan and DNS design owned by one team.',
        'Govern with paved roads rather than mandates: make the consistent path the easiest. Track metrics like “percentage of services deployable to either side” and the lead time for a cross-boundary change. Revisit placement decisions periodically as costs and regulations change.',
      ],
      followUps: [{ q: 'What is the danger of abstracting too much?', a: 'Lowest-common-denominator platforms that cannot use valuable managed services. Abstract the interfaces teams touch daily (deploy, observe, secure), not every infrastructure primitive.' }],
      redFlags: ['Technology-only answer with no organisational or governance component.'],
    },
  ],
};

const vpnDx: Topic = {
  id: 'vpn-direct-connect',
  title: 'Site-to-Site VPN vs. Direct Connect',
  tagline: 'Two ways to privately connect a data centre to the cloud: encrypted tunnels over the Internet, or a dedicated fibre circuit — and how BGP fails over between them.',
  sceneId: 'vpn-dx',
  camera: { position: [0, 19, 25], target: [0, 0.5, 0] },
  controls: {
    traffic: true,
    link: true,
    failureLabel: 'Active path',
    hint: 'In VPN mode, fail Tunnel 1 and watch both tunnels’ ECMP traffic collapse onto Tunnel 2. In Direct Connect mode, fail the circuit and watch BGP move traffic onto the VPN backup.',
  },
  fundamentals: {
    what: '**Site-to-Site VPN** creates encrypted **IPsec tunnels** between your on-prem router (the customer gateway) and the cloud (a Virtual Private Gateway or Transit Gateway) over the public Internet. On AWS each VPN connection has **two tunnels** to endpoints in different AZs. **AWS Direct Connect (DX)** — like Azure ExpressRoute and Google Cloud Interconnect — is a **dedicated physical connection**: a fibre cross-connect from your router to an AWS router in a colocation facility, carrying traffic over **virtual interfaces (VIFs)** that never touch the public Internet.',
    why: 'Workloads split between on-prem and cloud need private, reliable connectivity. VPN is fast to set up and cheap, but its throughput and latency depend on Internet conditions. DX provides **consistent latency, high bandwidth (1/10/100 Gbps)** and lower data-transfer pricing, at the cost of weeks of provisioning and monthly port fees. Most production designs use DX as primary and VPN as a backup — or VPN alone for small sites.',
    where: 'VPN: branch offices, dev/test, small or early hybrid setups, backup for DX, and encrypted overlay on top of DX. DX: production hybrid traffic, large data migrations, latency-sensitive integration with on-prem systems, high-volume replication, and regulated workloads that must avoid the Internet path.',
    how: [
      '**VPN setup**: create a customer gateway (your router’s public IP and BGP ASN) and a VPN connection to a TGW/VGW. AWS provides configuration for two tunnels.',
      '**IKE/IPsec**: your router negotiates IKE (phase 1) and IPsec SAs (phase 2) for each tunnel; traffic is encrypted with ESP and encapsulated over the Internet.',
      '**Routing over VPN**: BGP sessions inside each tunnel advertise prefixes. With TGW, both tunnels can be active with **ECMP**; Dead Peer Detection (DPD) tears down a dead tunnel.',
      '**DX setup**: order a port at a DX location (or a hosted connection from a partner), receive an LOA-CFA, and have a **cross-connect** installed between your router (or the carrier’s) and the AWS router.',
      '**VIFs**: configure 802.1Q VLAN virtual interfaces — **private VIF** (to a VGW/DX Gateway), **transit VIF** (to a DX Gateway → Transit Gateway), or **public VIF** (to AWS public endpoints like S3). Each VIF runs its own BGP session.',
      '**Path preference**: when the same prefix is learned via DX and VPN, AWS prefers DX. On-prem, use local preference/AS-path to prefer DX outbound too.',
      '**Failover**: BFD on DX detects failure in under a second; BGP withdraws the DX routes and traffic moves to the next best path (second DX or VPN).',
    ],
    bottlenecks: [
      { problem: 'Internet paths have variable latency, jitter and packet loss', solution: 'DX gives a deterministic, dedicated path with consistent latency.' },
      { problem: 'VPN throughput is limited (~1.25 Gbps per tunnel)', solution: 'DX ports provide 1/10/100 Gbps; or aggregate VPN tunnels with ECMP on TGW.' },
      { problem: 'DX takes weeks to provision and is a single physical path', solution: 'VPN is available in minutes and serves as an independent backup path.' },
      { problem: 'Internet egress pricing for large hybrid data flows', solution: 'Data transfer out over DX is billed at lower rates than Internet egress.' },
    ],
    tradeoffs: [
      { aspect: 'Time to deploy', gain: 'VPN: minutes.', cost: 'DX: weeks (port, LOA, cross-connect, carrier circuit).' },
      { aspect: 'Performance', gain: 'DX: consistent low latency and high bandwidth.', cost: 'VPN: Internet-dependent latency, ~1.25 Gbps per tunnel, encryption overhead.' },
      { aspect: 'Encryption', gain: 'VPN: IPsec by design.', cost: 'DX: private but **not encrypted** by default; add MACsec or IPsec over DX.' },
      { aspect: 'Cost', gain: 'VPN: low hourly fee; DX: cheaper per GB at volume.', cost: 'DX: port-hour fees plus carrier and colocation costs.' },
      { aspect: 'Resilience', gain: 'Two VPN tunnels in two AZs by default.', cost: 'A single DX is a single point of failure — you need two connections, ideally in two locations.' },
    ],
    keyNumbers: [
      { label: 'VPN tunnels per connection', value: '2' },
      { label: 'VPN throughput / tunnel', value: '≈1.25 Gbps' },
      { label: 'DX dedicated ports', value: '1/10/100 Gbps' },
      { label: 'BGP hold time (no BFD)', value: '90 s' },
    ],
  },
  cloud: {
    public: {
      summary: 'Each major cloud has both a VPN service and a dedicated-interconnect service. Concepts map closely: customer gateway ↔ peer VPN gateway, VGW/TGW ↔ VPN gateway / Cloud Router, DX ↔ ExpressRoute / Cloud Interconnect, VIF ↔ ExpressRoute peering / VLAN attachment.',
      stack: ['AWS Site-to-Site VPN + Direct Connect', 'Azure VPN Gateway + ExpressRoute', 'GCP HA VPN + Cloud Interconnect', 'Cloud Router (BGP)'],
      points: [
        'AWS **Accelerated VPN** routes tunnels via the Global Accelerator edge to reduce Internet variability.',
        'Hosted DX connections from partners (50 Mbps–25 Gbps) avoid needing your own presence in a DX location.',
        'A **DX Gateway** lets one connection reach VPCs and TGWs in many regions.',
      ],
    },
    private: {
      summary: 'On the private side you need BGP-capable edge routers (or firewalls) to terminate IPsec and DX VIFs, a carrier circuit from your data centre to the DX location (unless you colocate there), and firewall policy for hybrid traffic.',
      stack: ['Cisco / Juniper / Arista edge routers', 'Palo Alto / Fortinet IPsec', 'Carrier MPLS or dark fibre', 'Colocation (Equinix, Digital Realty)'],
      points: [
        'Use two routers and diverse carrier paths so a router reboot or fibre cut does not take down both links.',
        'Clamp TCP MSS on IPsec tunnels to avoid fragmentation issues (ESP overhead reduces effective MTU).',
        'Monitor tunnel state, BGP sessions, BFD and circuit utilisation like production services.',
      ],
    },
    hybrid: {
      summary: 'The recommended production hybrid pattern: two DX connections in two locations (transit VIFs → DX Gateway → Transit Gateway) plus a Site-to-Site VPN attachment as tertiary backup, all running BGP. Optionally run IPsec over DX for encryption, or MACsec where supported.',
      stack: ['DX Gateway', 'Transit Gateway', 'Site-to-Site VPN (backup)', 'BFD', 'MACsec'],
      points: [
        'AWS routing preference for the same prefix: longest prefix match first, then DX over VPN, then static over propagated (check current docs for exact ordering).',
        'Size the backup path for critical traffic; a 10 Gbps DX failing over to 2.5 Gbps of VPN will drop or queue the rest.',
        'Run regular failover drills — untested backup paths often fail when needed.',
      ],
    },
  },
  examples: [
    {
      company: 'Netflix',
      headline: 'Private interconnects for content and control traffic',
      scale: 'A large share of downstream Internet traffic in many regions',
      detail: 'While Netflix’s control plane runs in AWS, its video is served from **Open Connect** appliances placed inside ISPs and at Internet exchange points. Netflix interconnects with ISPs via private peering and settlement-free interconnects rather than relying on transit — the same principle as DX: dedicated paths for predictable, high-volume traffic.',
      lesson: 'High-volume, latency-sensitive flows justify dedicated interconnects; the public Internet is the fallback.',
    },
    {
      company: 'Financial institutions',
      headline: 'DX + IPsec for encrypted, deterministic links',
      scale: 'Typical for regulated hybrid estates',
      detail: 'Banks commonly run redundant Direct Connect connections in separate locations for deterministic latency to cloud workloads, and layer IPsec (or MACsec) on top because regulators require encryption in transit even on private circuits. VPN over the Internet remains a tertiary backup.',
      lesson: '“Private” is not “encrypted”. Regulated designs combine both properties.',
    },
    {
      company: 'Cloudflare',
      headline: 'Replacing hardware VPN concentrators with an anycast WAN',
      scale: 'Network in 300+ cities',
      detail: 'Cloudflare Magic WAN and similar SASE offerings let enterprises connect sites with IPsec/GRE tunnels to the nearest anycast PoP instead of to a single VPN concentrator — combining VPN’s ease with a private backbone, a middle ground between plain VPN and dedicated circuits.',
      lesson: 'Modern networking increasingly blends encrypted tunnels with private backbones to get both agility and performance.',
    },
  ],
  interview: [
    {
      question: 'Compare Site-to-Site VPN and Direct Connect. When would you choose each?',
      difficulty: 'Junior/Mid',
      answer: [
        '**VPN**: IPsec tunnels over the public Internet; set up in minutes; encrypted; cheap; throughput ~1.25 Gbps per tunnel; latency and jitter vary with Internet conditions. **Direct Connect**: dedicated physical circuit to AWS; weeks to provision; private but not encrypted by default; 1–100 Gbps; consistent latency; lower per-GB transfer cost.',
        'Choose VPN for small sites, quick starts, dev/test, and as backup. Choose DX for production hybrid workloads with high bandwidth, latency sensitivity or large data volumes — usually with VPN (or a second DX) as backup.',
      ],
      followUps: [{ q: 'Can you have both at the same time?', a: 'Yes — the standard pattern. Both advertise routes via BGP; AWS prefers DX for identical prefixes, so VPN carries traffic only when DX fails.' }],
      redFlags: ['Claiming DX is encrypted.', 'Not knowing that AWS VPN gives you two tunnels.'],
    },
    {
      question: 'Why does an AWS Site-to-Site VPN connection come with two tunnels, and how should you use them?',
      difficulty: 'Junior/Mid',
      answer: [
        'The two tunnels terminate on endpoints in **different AZs**, so AWS maintenance or a failure on one endpoint drops only one tunnel. AWS performs periodic maintenance that can take a tunnel down, so a single-tunnel configuration will see outages.',
        'Configure **both** tunnels on your customer gateway with BGP. With a VGW, traffic typically uses one tunnel at a time; with a **Transit Gateway** you can enable **ECMP** and use both actively for up to ~2× throughput. For more bandwidth, add more VPN connections and ECMP across them.',
      ],
      followUps: [{ q: 'What happens if you only configure one tunnel?', a: 'It works until AWS performs maintenance on that endpoint or it fails — then the connection goes down entirely. AWS explicitly recommends configuring both.' }],
      redFlags: ['Configuring a single tunnel in production.'],
    },
    {
      question: 'How does BGP decide between DX and VPN paths, and how do you control it from on-prem?',
      difficulty: 'Senior',
      answer: [
        'From the AWS side, route selection for traffic toward on-prem considers **longest prefix match** first; for identical prefixes, **Direct Connect-learned routes are preferred over VPN-learned routes**. Within DX, you can influence preference with BGP communities (local preference communities) and AS-path prepending.',
        'For traffic from on-prem to AWS, your routers choose based on standard BGP attributes — set a higher **local preference** on routes learned over DX. To make a path less attractive to AWS, **AS-path prepend** your advertisements on it, or advertise more-specific prefixes on the preferred path.',
        'Keep routing **symmetric**: stateful firewalls on-prem may drop return traffic arriving on a different path than the request.',
      ],
      followUps: [{ q: 'What happens with asymmetric routing?', a: 'Request goes out via DX, response returns via VPN. Stateful firewalls that did not see the outbound flow drop the response. Control both directions with matching preferences.' }],
      redFlags: ['Thinking failover is automatic without BGP.', 'Not considering asymmetric routing.'],
    },
    {
      question: 'Design a highly resilient Direct Connect architecture.',
      difficulty: 'Senior',
      answer: [
        'Follow the **maximum resiliency** model: at least **two DX locations**, each with two connections terminating on separate on-prem routers (four connections total). Each connection carries transit VIFs to a **DX Gateway** associated with a **Transit Gateway** in each region you use.',
        'Use **BFD** for fast failure detection, diverse carrier paths into each location, and size each connection so the remaining capacity carries peak load after a failure. Add a **Site-to-Site VPN** attached to the TGW as a final backup over the Internet.',
        'Operationally: monitor BGP sessions and connection metrics in CloudWatch, enable MACsec or IPsec where encryption is required, and test failover regularly (DX supports failover testing by bringing BGP sessions down temporarily).',
      ],
      followUps: [{ q: 'Is Link Aggregation (LAG) a resiliency feature?', a: 'Partially. A LAG bundles connections at one location for bandwidth; all links share the same location and AWS device, so it does not protect against facility failure.' }],
      redFlags: ['Single location, even with multiple connections.', 'No sizing for N−1 capacity.'],
    },
    {
      question: 'Your VPN throughput is capped around 1.2 Gbps but you need 5 Gbps. What are your options?',
      difficulty: 'Senior',
      answer: [
        'Each tunnel is limited to roughly 1.25 Gbps. Options: (1) Use a **Transit Gateway with ECMP** across multiple VPN connections (each with two tunnels) — e.g. 3 connections × 2 tunnels ≈ 7.5 Gbps aggregate, though individual flows are still capped by one tunnel because ECMP hashes per flow. (2) **Direct Connect** at 10 Gbps — the right answer for sustained high throughput. (3) As a bridge while DX is provisioned, a **hosted DX connection** from a partner can be faster to get.',
        'Also check the customer gateway: IPsec at multi-gigabit speeds needs hardware with crypto acceleration, and MTU/MSS issues (ESP overhead) can reduce effective throughput.',
      ],
      followUps: [{ q: 'Why does a single large file transfer not get faster with ECMP?', a: 'ECMP hashes per flow (5-tuple). One TCP connection always uses one tunnel, so it is capped at that tunnel’s throughput. Parallel streams help.' }],
      redFlags: ['Thinking ECMP increases single-flow throughput.'],
    },
    {
      question: 'A regulator requires all traffic between your DC and the cloud to be encrypted and to avoid the public Internet. Design it.',
      difficulty: 'Staff',
      answer: [
        'Use **Direct Connect** for the private path, and add encryption: **MACsec** (Layer-2 encryption on supported dedicated connections, line-rate, between your router and the AWS device) or **IPsec VPN over DX** (run Site-to-Site VPN using private IP VPN over a transit VIF, so tunnels ride the DX rather than the Internet).',
        'Trade-offs: MACsec is efficient but only point-to-point on the physical link and needs supported ports/hardware; IPsec over DX encrypts end-to-end to the TGW but is capped per tunnel (aggregate via ECMP). The “no Internet” requirement also means the backup path cannot be a normal Internet VPN — use a second DX location instead.',
        'Complete the design with application-level TLS (defence in depth), key management and rotation procedures, and documented evidence (flow logs, configuration audits) for the regulator.',
      ],
      followUps: [{ q: 'What about encryption inside AWS between VPCs?', a: 'Traffic between certain instance types is encrypted automatically by the Nitro system, but compliance teams often still require TLS end-to-end at the application layer.' }],
      redFlags: ['Assuming “private” satisfies “encrypted”.', 'Proposing an Internet VPN backup in a no-Internet requirement.'],
    },
  ],
};

const peeringTgw: Topic = {
  id: 'vpc-peering-tgw',
  title: 'VPC Peering & Transit Gateway',
  tagline: 'Connecting many networks: point-to-point peering is simple and fast but non-transitive; a Transit Gateway hub scales to thousands of attachments with central routing.',
  sceneId: 'transit-gateway',
  camera: { position: [0, 21, 19], target: [0, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'Shared-Services path',
    variants: [
      { id: 'peering', label: 'Full-mesh peering' },
      { id: 'tgw', label: 'Transit Gateway hub' },
    ],
    hint: 'In peering mode, fail the Dev ↔ Shared Services path: Dev cannot reach Shared through Prod App, because peering is not transitive. Switch to Transit Gateway: one attachment per VPC, and an AZ failure only degrades the path.',
  },
  fundamentals: {
    what: '**VPC peering** is a direct, private network connection between two VPCs (same or different account/region) using the provider’s backbone. It is **non-transitive**: if A peers with B and B peers with C, A cannot reach C through B. A **Transit Gateway (TGW)** is a regional, managed, horizontally scaled router that VPCs, VPNs and Direct Connect gateways attach to in a **hub-and-spoke** topology, with route tables that control which attachments can reach each other — transitive routing with central policy.',
    why: 'As organisations grow from one VPC to dozens or hundreds (per team, environment, account), connecting them becomes a scaling problem. A full mesh of peerings needs **N(N−1)/2** connections — 45 for 10 VPCs, 4,950 for 100 — each with route table entries on both sides. TGW reduces this to **N attachments**, centralises routing and segmentation, and lets one hybrid connection serve all VPCs.',
    where: 'Peering: a few VPCs, high-throughput pairs (no extra hop, no processing charge), and simple cross-account sharing. TGW: multi-account landing zones (AWS Organizations / Control Tower), shared services VPCs, centralised egress and inspection, and hybrid connectivity shared across many VPCs. Alternatives for service-level connectivity include **PrivateLink** and **VPC Lattice**.',
    how: [
      '**Peering**: VPC A requests a peering with VPC B; B accepts. Each side adds routes for the other’s CIDR pointing to the peering connection (`pcx-…`), and security groups allow the traffic.',
      'Peering requires **non-overlapping CIDRs**, does not support transitive routing, and does not allow using the peer’s Internet gateway, NAT or VPN (no edge-to-edge routing).',
      '**TGW**: create a Transit Gateway; attach VPCs (the attachment places an ENI in a subnet in each chosen AZ), VPN connections, DX gateways, and peered TGWs in other regions.',
      'Each attachment is **associated** with one TGW route table and can **propagate** its routes into one or more route tables. Static routes and blackhole routes add control.',
      '**Segmentation**: e.g. a “prod” route table where prod VPCs see each other and shared services, and a “dev” route table where dev VPCs see shared services but not prod.',
      'Packets from a VPC route to the TGW (`tgw-…` target in the VPC route table), the TGW looks up the destination in the attachment’s associated route table, and forwards to the target attachment.',
      'For inspection, route traffic through an inspection VPC with firewalls (AWS Network Firewall or third-party appliances), using appliance mode to keep flows symmetric.',
    ],
    bottlenecks: [
      { problem: 'Full-mesh peering grows quadratically with VPC count', solution: 'TGW hub-and-spoke: N attachments instead of N(N−1)/2 peerings.' },
      { problem: 'No transitive routing over peering (e.g. reaching on-prem via a hub VPC)', solution: 'TGW routes transitively between any attachments allowed by its route tables.' },
      { problem: 'Each VPC needs its own VPN/DX connection to on-prem', solution: 'Attach one VPN/DX gateway to the TGW and share it with all VPCs.' },
      { problem: 'Inconsistent, per-VPC network policy', solution: 'Central route tables and inspection VPCs enforce segmentation in one place.' },
    ],
    tradeoffs: [
      { aspect: 'Scalability', gain: 'TGW: thousands of attachments, central routing.', cost: 'Peering: unmanageable beyond tens of VPCs.' },
      { aspect: 'Cost', gain: 'Peering: no hourly fee; only data transfer (free within the same AZ).', cost: 'TGW: per-attachment hourly fee plus per-GB data processing.' },
      { aspect: 'Latency & throughput', gain: 'Peering: direct path, no extra hop, no bandwidth cap beyond the instance.', cost: 'TGW: an extra hop and per-attachment bandwidth limits (very high but finite).' },
      { aspect: 'Control', gain: 'TGW: segmentation and inspection in one place.', cost: 'TGW: becomes a critical shared dependency; misconfigured route tables have a large blast radius.' },
      { aspect: 'Simplicity', gain: 'Peering: easy to reason about for a few VPCs.', cost: 'Peering: route sprawl and no transitivity as you grow.' },
    ],
    keyNumbers: [
      { label: 'Mesh links for N VPCs', value: 'N(N−1)/2' },
      { label: 'Peerings per VPC (max)', value: '125' },
      { label: 'TGW attachments (default quota)', value: '5,000' },
      { label: 'Peering transitive?', value: 'No' },
    ],
  },
  cloud: {
    public: {
      summary: 'Every hyperscaler offers both primitives. AWS: VPC peering, Transit Gateway, PrivateLink, Cloud WAN. Azure: VNet peering (which can be global) and Virtual WAN hubs. GCP: VPC Network Peering, Shared VPC, and Network Connectivity Center.',
      stack: ['AWS VPC Peering / TGW / Cloud WAN', 'Azure VNet Peering / Virtual WAN', 'GCP VPC Peering / Shared VPC / NCC', 'AWS PrivateLink'],
      points: [
        '**Inter-region**: TGWs peer with each other across regions; Cloud WAN adds a global policy-driven network on top.',
        '**PrivateLink** exposes a single service (not a whole network) across VPCs, even with overlapping CIDRs.',
        'GCP **Shared VPC** centralises the network in a host project and lets service projects use its subnets — another way to avoid mesh peering.',
      ],
    },
    private: {
      summary: 'The on-prem analogue is the classic enterprise network: VRFs (virtual routing and forwarding) for segmentation, a core/backbone that routes between them, and firewalls between security zones. OpenStack Neutron routers and VMware NSX tier-0/tier-1 gateways play the TGW role inside a private cloud.',
      stack: ['VRF-lite / MPLS L3VPN', 'VMware NSX T0/T1 gateways', 'OpenStack Neutron routers', 'Data-centre firewalls'],
      points: [
        'VRFs give separate routing tables per segment — the same idea as TGW route tables.',
        'Route leaking between VRFs is the equivalent of propagating routes between TGW route tables.',
      ],
    },
    hybrid: {
      summary: 'TGW is the cloud-side hub of most hybrid networks: the on-prem VPN and DX gateway attach to it, and route tables decide which VPCs can reach on-prem. In the scene, “On-Prem DC” is one attachment instead of a VPN per VPC.',
      stack: ['TGW + DX Gateway', 'TGW + Site-to-Site VPN', 'Inspection VPC + AWS Network Firewall', 'Route 53 Resolver rules'],
      points: [
        'Advertise summarised cloud CIDRs to on-prem, and keep on-prem route counts within TGW and DX limits.',
        'Use separate TGW route tables so dev VPCs cannot reach on-prem production systems.',
        'Plan the global IP address space up front — overlapping ranges cannot be routed through a TGW.',
      ],
    },
  },
  examples: [
    {
      company: 'Slack',
      headline: 'Transit Gateway scaling during a January traffic surge',
      scale: 'Millions of users returning from holidays at once',
      detail: 'Slack’s public analysis of its January 4, 2021 outage described how AWS Transit Gateways in its network did not scale up quickly enough for the sudden traffic spike on the first workday of the year, contributing to packet loss and cascading failures. AWS worked with Slack on TGW scaling.',
      lesson: 'Managed network hubs are still finite systems with scaling behaviour. Understand how your hub scales, pre-warm or engage the provider ahead of known surges, and avoid single shared chokepoints for critical paths.',
    },
    {
      company: 'Multi-account landing zones',
      headline: 'Hub-and-spoke as the default enterprise pattern',
      scale: 'Hundreds to thousands of AWS accounts',
      detail: 'AWS Control Tower-style landing zones usually place a Transit Gateway in a central network account, shared via Resource Access Manager. Workload accounts attach their VPCs; central route tables segment prod, non-prod and shared services; and an inspection VPC centralises egress and east-west firewalling.',
      lesson: 'Centralising the network in one account with clear ownership is what makes hundreds of VPCs manageable.',
    },
    {
      company: 'Data-heavy platforms',
      headline: 'Peering where the hop and processing fee matter',
      scale: 'Very high-volume data flows between VPCs',
      detail: 'Organisations with very high-volume flows between a specific pair of VPCs (e.g. data pipelines) often keep a direct peering for that pair while using TGW for everything else — avoiding the TGW per-GB processing charge and the extra hop for the heaviest traffic.',
      lesson: 'Peering and TGW are complementary: use the hub for manageability and peering for the few flows where cost or latency dominates.',
    },
  ],
  interview: [
    {
      question: 'What does “VPC peering is non-transitive” mean, and why does it matter?',
      difficulty: 'Junior/Mid',
      answer: [
        'If VPC A peers with B and B peers with C, A **cannot** reach C through B. Traffic over a peering connection must originate or terminate in one of the two peered VPCs. Likewise, A cannot use B’s Internet gateway, NAT gateway, VPN or Direct Connect (no edge-to-edge routing).',
        'It matters because hub designs built on peering do not work: a “shared services” VPC cannot act as a router between spokes, and on-prem connectivity cannot be shared through one VPC. You need a direct peering for every pair that must communicate — or a Transit Gateway.',
      ],
      followUps: [{ q: 'Can you work around it with a proxy in the middle VPC?', a: 'Yes, application-level proxies or NAT instances in B can relay traffic, but that is an operational burden and a bottleneck; TGW is the network-level answer.' }],
      redFlags: ['Assuming peering behaves like a router.'],
    },
    {
      question: 'How many peering connections do you need for 20 VPCs that all talk to each other? What would you do instead?',
      difficulty: 'Junior/Mid',
      answer: [
        'A full mesh needs N(N−1)/2 = 20×19/2 = **190** peering connections, plus route table entries for 19 peers in each VPC, plus security group updates — and it breaks entirely if any CIDRs overlap.',
        'Instead, use a **Transit Gateway**: 20 attachments, and route tables to control which VPCs may communicate. If only a few pairs need very high throughput, keep direct peerings for those pairs in addition to the TGW.',
      ],
      followUps: [{ q: 'What if the VPCs have overlapping CIDRs?', a: 'Neither peering nor TGW can route between overlapping ranges. Options: re-IP, use PrivateLink to expose specific services, or NAT (e.g. private NAT gateway) at the boundary.' }],
      redFlags: ['Arithmetic errors on mesh count.', 'Ignoring overlapping CIDRs.'],
    },
    {
      question: 'Design network segmentation for prod, dev and shared services using a Transit Gateway.',
      difficulty: 'Senior',
      answer: [
        'Create three TGW route tables: **prod**, **dev**, **shared**. Associate prod VPC attachments with the prod table, dev VPC attachments with the dev table, and shared-services + on-prem (VPN/DX) attachments with the shared table.',
        'Propagation: prod VPCs propagate into the prod and shared tables; dev VPCs into the dev and shared tables; shared services propagate into all tables. Result: prod ↔ prod, dev ↔ dev, everyone ↔ shared services, but **prod ↛ dev**. Add blackhole routes for defence in depth.',
        'Layer an inspection VPC (with appliance mode) for traffic that must be filtered, security groups/NACLs inside VPCs, and route table changes managed via infrastructure as code with review.',
      ],
      followUps: [{ q: 'Should on-prem reach dev VPCs?', a: 'Usually developers need it, but on-prem production systems should not. Split on-prem prefixes or use separate attachments/route tables so dev cannot reach on-prem prod.' }],
      redFlags: ['A single route table for everything (flat network).', 'Relying only on security groups for environment isolation.'],
    },
    {
      question: 'When would you still choose VPC peering over a Transit Gateway?',
      difficulty: 'Senior',
      answer: [
        '(1) **Few VPCs** with simple connectivity — peering is simpler and has no hourly cost. (2) **Very high-volume** pairs where TGW per-GB data processing is significant. (3) **Latency-sensitive** flows where the extra TGW hop matters. (4) Cross-account sharing of a single pair without central network ownership.',
        'Often the answer is **both**: TGW for general connectivity and governance, plus targeted peerings for heavy pairs. Longest-prefix match and route specificity determine which path is used, so design the routes deliberately.',
      ],
      followUps: [{ q: 'What about PrivateLink?', a: 'Use it when a consumer needs one service, not network-level access — it is one-directional, works with overlapping CIDRs and exposes minimal surface area.' }],
      redFlags: ['“TGW is always better.”', 'Not knowing the TGW cost model.'],
    },
    {
      question: 'A Transit Gateway attachment shows packet drops during a traffic spike. How do you investigate?',
      difficulty: 'Senior',
      answer: [
        'Check CloudWatch TGW metrics per attachment: `BytesIn/Out`, `PacketsIn/Out`, `PacketDropCountBlackhole`, `PacketDropCountNoRoute`. Blackhole or no-route drops point to routing errors (e.g. a recent route table change), not capacity.',
        'If drops correlate with throughput, compare against per-attachment bandwidth limits and per-flow limits; a few elephant flows can saturate a single ENI path. Review VPC Flow Logs / TGW Flow Logs for top talkers, and check whether traffic is unexpectedly hair-pinning through an inspection VPC whose firewalls are the real bottleneck.',
        'Mitigations: spread attachment subnets across more AZs, move heavy pairs to direct peering, scale the inspection tier, and contact AWS for scaling ahead of known events (Slack’s 2021 outage is the cautionary tale).',
      ],
      followUps: [{ q: 'What is appliance mode and when do you need it?', a: 'It makes the TGW keep both directions of a flow in the same AZ when routing through an inspection VPC, so stateful firewalls see symmetric traffic.' }],
      redFlags: ['Blaming capacity before ruling out routing changes.'],
    },
    {
      question: 'You are designing the global network for 500 AWS accounts across 4 regions plus on-prem. Outline the architecture and governance.',
      difficulty: 'Staff',
      answer: [
        '**IP plan** first: allocate non-overlapping summarisable blocks per region and environment (e.g. a /12 per region, /16 per account tier) managed by IPAM. **Topology**: one TGW per region in a central network account, shared via RAM; inter-region TGW peering or **AWS Cloud WAN** with a global policy for segment-based routing. Two DX locations per major region into DX Gateways, plus VPN backup.',
        '**Segmentation**: segments/route tables for prod, non-prod, shared services, PCI and on-prem; inspection VPCs for egress and inter-segment traffic. **DNS**: Route 53 Resolver rules shared across accounts, private hosted zones per domain. **Service connectivity**: PrivateLink/VPC Lattice for service-level exposure to reduce network-level coupling.',
        '**Governance**: network as code with review, automated VPC vending (accounts get a pre-attached VPC from a template), SCPs that prevent creating IGWs or peering outside policy, centralised flow logs, and quotas monitoring. Define ownership: a platform network team owns the hub; application teams own their VPC internals.',
      ],
      followUps: [{ q: 'How do you handle a team that already used 10.0.0.0/16 everywhere?', a: 'Short term: PrivateLink or private NAT at the boundary to expose specific services. Long term: re-IP into the IPAM-allocated ranges, prioritising VPCs that need hybrid or cross-VPC routing.' }],
      redFlags: ['No IP address management strategy.', 'No ownership or governance model.'],
    },
  ],
};

export const module1Topics: Topic[] = [publicCloud, privateCloud, hybridCloud, vpnDx, peeringTgw];
