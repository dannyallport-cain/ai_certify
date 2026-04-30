# Project Dataflow Diagram

This diagram shows the main runtime flows in AI Certify: web and mobile requests, authentication, database access, ServiceM8 integration, AI worker calls, and scheduled backup handling.

```mermaid
flowchart LR
  %% Actors
  User[Web User]
  MobileUser[Mobile User]
  ServiceM8[ServiceM8 API]
  RailwayWorker[Railway AI Worker]
  R2[Cloudflare R2]
  Cron[Vercel Cron]
  
  %% Web App
  subgraph WebApp[Next.js 15 Web App]
    Landing[Landing / Marketing Pages]
    Auth[NextAuth / Session Auth]
    Dashboard[Dashboard & Certificate Forms]
    API[App Router API Routes]
    Actions[Server Actions]
  end

  %% Database
  subgraph DB[PostgreSQL + Drizzle]
    Teams[Teams]
    Customers[Customers]
    Certificates[Certificates]
    CertItems[Certificate Items]
    SM8Conn[ServiceM8 Connections]
    SM8JobMap[ServiceM8 Job Mappings]
    SM8ClientMap[ServiceM8 Client Mappings]
  end

  %% Main web flows
  User --> Landing
  User --> Auth
  Auth --> Dashboard
  Dashboard --> Actions
  Dashboard --> API
  Actions --> DB
  API --> DB

  %% ServiceM8 integration
  API <--> ServiceM8
  Dashboard <--> ServiceM8
  SM8Conn <--> API
  SM8JobMap <--> API
  SM8ClientMap <--> API
  API --> Customers
  API --> Certificates
  API --> CertItems
  API --> Teams

  %% Mobile flows
  MobileUser --> API
  API --> Customers
  API --> Certificates
  API --> SM8Conn

  %% AI worker flows
  User --> API
  API --> RailwayWorker
  RailwayWorker --> DB
  RailwayWorker --> R2

  %% File and backup flows
  User --> R2
  Cron --> API
  API --> RailwayWorker
  RailwayWorker --> R2
  RailwayWorker --> DB

  %% Styling hints
  classDef external fill:#0f172a,stroke:#38bdf8,color:#ffffff,stroke-width:1px;
  classDef app fill:#1e293b,stroke:#94a3b8,color:#ffffff,stroke-width:1px;
  classDef db fill:#14532d,stroke:#4ade80,color:#ffffff,stroke-width:1px;
  classDef storage fill:#312e81,stroke:#a5b4fc,color:#ffffff,stroke-width:1px;

  class User,MobileUser,ServiceM8,RailwayWorker,Cron external;
  class Landing,Auth,Dashboard,API,Actions app;
  class Teams,Customers,Certificates,CertItems,SM8Conn,SM8JobMap,SM8ClientMap db;
  class R2 storage;
```

## Reading the diagram

- **Web users** interact with the landing pages, authenticate with NextAuth, and use the dashboard and certificate forms.
- **Server actions and API routes** handle most app logic and persist data via PostgreSQL/Drizzle.
- **ServiceM8** connects through OAuth and is used for jobs, clients, and connection management.
- **Mobile users** hit the mobile API routes, which reuse the same database and ServiceM8 connection layer.
- **The Railway worker** handles AI-assisted analysis and the database backup job.
- **Cloudflare R2** stores uploaded files and generated backup archives.
- **Vercel Cron** triggers the scheduled backup route, which forwards the job to Railway.
