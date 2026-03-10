# Ordo Creator OS — Deployment Architecture

> Production-ready cloud infrastructure specification for Ordo Creator OS. Covers AWS deployment, container orchestration, databases, caching, storage, CI/CD, and disaster recovery.

---

## 1. Cloud Provider Selection: AWS

**Why AWS?**
- **Most mature cloud ecosystem**: 10+ years of production patterns, largest documentation base
- **Broadest service portfolio**: ECS, RDS, ElastiCache, S3, CloudFront, Secrets Manager, CloudWatch
- **Best Go SDK support**: `aws-sdk-go-v2`, fully featured and actively maintained
- **S3 native**: Industry-standard object storage with built-in replication, lifecycle policies
- **Cost transparency**: Pay-as-you-go, free tier for development, predictable scaling costs
- **IAM security**: Fine-grained role-based access control, audit logging (CloudTrail)
- **Regional redundancy**: Multi-AZ support for high availability out of the box

**Alternative considered:**
- Google Cloud: Good GKE support, but less mature Go SDK. Rejected.
- Azure: Enterprise focus, less container-friendly. Rejected.

---

## 2. Infrastructure Overview

### 2.1 System Diagram

```
                    ┌──────────────────┐
                    │   CloudFlare      │  CDN + DDoS protection
                    │   DNS (Root)      │  TLS termination at edge
                    └────────┬──────────┘
                             │
                  ┌──────────┼──────────┐
                  │          │          │
            ┌─────┴────┐ ┌──┴───┐ ┌───┴──────┐
            │  Vercel  │ │  ALB  │ │CloudFront│
            │(Next.js) │ │(port  │ │ (assets) │
            │ App      │ │ 443)  │ │ (CDN)    │
            └──────────┘ └───┬──┘ └──────────┘
                             │
                       ┌─────┴──────┐
                       │ ECS Fargate │  Serverless container orchestration
                       │ Service:    │  Auto-scaling (2-10 tasks)
                       │ ordo-api    │  Health checks every 30s
                       │ (Go API)    │  Graceful shutdown 30s
                       └─────┬──────┘
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────┴────────┐ ┌────┴─────┐ ┌───────┴────┐
        │   RDS        │ │ElastiCache│ │     S3     │
        │PostgreSQL 16 │ │  Redis 7  │ │  Buckets   │
        │Multi-AZ      │ │Single+    │ │CloudFront  │
        │Auto-scaling  │ │Replica    │ │Lifecycle   │
        │100GB→500GB   │ │AOF        │ │Policies    │
        └──────────────┘ └──────────┘ └────────────┘

        ┌──────────────────────────────────────┐
        │    AWS Secrets Manager                │
        │  (DB passwords, API keys, JWTs)       │
        │  Rotation: 90-day policy              │
        └──────────────────────────────────────┘

        ┌──────────────────────────────────────┐
        │    CloudWatch Logs & Alarms           │
        │  (Metrics, dashboards, alerting)      │
        └──────────────────────────────────────┘
```

---

## 3. Deployment Environments

### 3.1 Development
- **Location**: Developer local machine
- **Stack**: Docker Compose (see `02-local-dev.md`)
- **PostgreSQL**: Local container, 5432
- **Redis**: Local container, 6379
- **S3**: MinIO (S3-compatible), 9000
- **API**: localhost:8080
- **Lifecycle**: On-demand by developer

### 3.2 Staging
- **Location**: AWS
- **Architecture**: Identical to production (for parity)
- **Instances**:
  - ECS: 1 task (db.t4g.medium equivalent compute)
  - RDS: db.t4g.medium (burstable, ~$0.09/hour)
  - ElastiCache: cache.t4g.micro (burstable)
- **Data**: Real-like (anonymized production snapshot weekly)
- **Lifespan**: Always-on (for CI/CD integration tests)
- **Domain**: staging-api.ordocreator.com, staging-app.ordocreator.com
- **Cost**: ~$200-250/month

### 3.3 Production
- **Location**: AWS (multi-region ready, initial: us-east-1)
- **Architecture**: Full-scale, production-grade
- **Instances**:
  - ECS: 2-10 tasks (1 vCPU, 2GB RAM each)
  - RDS: db.r6g.large (production-grade, ~$0.35/hour)
  - ElastiCache: cache.r6g.large (production-grade, ~$0.21/hour)
- **Data**: All live creator data, backups, PITR
- **Lifespan**: Permanent (managed 24/7)
- **Domain**: api.ordocreator.com, app.ordocreator.com
- **Cost**: Scales with usage (see Section 13)

---

## 4. Compute: AWS ECS Fargate

### 4.1 Architecture Choice
**Why ECS Fargate over EKS or EC2?**
- **Serverless**: No EC2 instance management, automatic scaling, pay per second
- **Cost**: Lower overhead than EKS for monolithic applications (no control-plane cost)
- **Simplicity**: Less operational burden than EKS; suitable for monolith
- **Scale**: Can grow from 1 task to 100+ tasks elastically
- **Failure resilience**: Automatic container replacement on failure

**Why not EKS?** EKS is better for microservices at scale (100+ services); Ordo starts as monolith.

### 4.2 ECS Service Configuration

```yaml
Service Name: ordo-api
Cluster: ordo-prod (regional)

Task Definition:
  Name: ordo-api-task
  Revision: Latest
  
  Container:
    Name: ordo-api
    Image: {AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/ordo-api:latest
    Essential: true
    Memory: 2048 MiB
    CPU: 1024 CPU units (1 vCPU)
    
    Port Mappings:
      - ContainerPort: 8080
        Protocol: tcp
        HostPort: 0 (Fargate dynamic port mapping)
    
    Environment Variables:
      - GO_ENV: production
      - LOG_LEVEL: info
      - DATABASE_SSL: require
    
    Secrets (from AWS Secrets Manager):
      - DATABASE_URL: /ordo/prod/database-url
      - REDIS_URL: /ordo/prod/redis-url
      - JWT_SECRET: /ordo/prod/jwt-secret
      - OPENAI_API_KEY: /ordo/prod/openai-api-key
      - ANTHROPIC_API_KEY: /ordo/prod/anthropic-api-key
    
    LogConfiguration:
      LogDriver: awslogs
      Options:
        awslogs-group: /ecs/ordo-api-prod
        awslogs-region: us-east-1
        awslogs-stream-prefix: ecs
    
    HealthCheck:
      Command: ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      Interval: 30 seconds
      Timeout: 5 seconds
      Retries: 2
      StartPeriod: 10 seconds

Service Configuration:
  Desired Count: 2 (minimum for HA)
  Minimum: 2
  Maximum: 10
  
  Deployment Configuration:
    MaximumPercent: 200 (allow 4 tasks during rollout)
    MinimumHealthyPercent: 100 (maintain 2 tasks running)
    DeploymentCircuitBreaker:
      Enabled: true
      Rollback: true
  
  Networking:
    Subnets:
      - subnet-{private-az-1a}
      - subnet-{private-az-1b}
      - subnet-{private-az-1c}
    
    SecurityGroups:
      - sg-ordo-api-prod (inbound: ALB on 8080)
    
    AssignPublicIP: DISABLED (traffic only from ALB)
  
  Load Balancer:
    Type: Application Load Balancer (ALB)
    TargetGroup: ordo-api-tg-prod
      Protocol: HTTP
      Port: 8080
      HealthCheck:
        Path: /health
        Interval: 30 seconds
        Timeout: 5 seconds
        HealthyThreshold: 2
        UnhealthyThreshold: 2
      
      Stickiness: disabled (stateless API)
      DeregistrationDelay: 30 seconds (graceful shutdown)
  
  Auto Scaling:
    Type: Target Tracking
    
    Target Metrics:
      - Metric: ECSServiceAverageCPUUtilization
        Target Value: 70%
        Scale Out: when CPU > 70% for 2 minutes
        Scale In: when CPU < 30% for 10 minutes
      
      - Metric: ECSServiceAverageMemoryUtilization
        Target Value: 80%
        Scale Out: when memory > 80% for 2 minutes
        Scale In: when memory < 50% for 10 minutes
    
    Cooldown:
      Scale-out: 60 seconds (fast response)
      Scale-in: 300 seconds (avoid thrashing)
    
    Min Capacity: 2
    Max Capacity: 10
  
  Graceful Shutdown:
    StopTimeout: 30 seconds
    Application must listen to SIGTERM and:
      1. Stop accepting new requests
      2. Wait up to 30s for in-flight requests to complete
      3. Close DB/Redis connections gracefully
      4. Exit with code 0
```

### 4.3 Container Placement & Networking
- **Placement**: Spread across 3+ availability zones (AWS default)
- **Private subnets**: API containers only accessible from ALB, not public internet
- **Security groups**: Inbound 8080 from ALB only; outbound to RDS (5432), Redis (6379), S3, external APIs

---

## 5. Database: AWS RDS PostgreSQL 16

### 5.1 Instance Selection

**Production (us-east-1a, us-east-1b):**
```
Instance Class: db.r6g.large
  vCPU: 2
  Memory: 16 GiB
  Graviton2 processor (ARM-based, cost-efficient)
  Network performance: Up to 10 Gigabit

Multi-AZ: Enabled
  Primary in us-east-1a
  Standby in us-east-1b
  Automatic failover < 2 minutes
  Synchronous replication
```

**Staging (us-east-1c):**
```
Instance Class: db.t4g.medium
  vCPU: 2
  Memory: 4 GiB
  Burstable (good for low-traffic environments)
  CPU credit: accrual + surplus for spike handling
```

### 5.2 Storage Configuration

```
Storage Type: gp3 (General Purpose SSD)
  IOPS: 3000 (default)
  Throughput: 125 MB/s (default)
  Latency: < 1ms

Allocated Storage: 100 GiB (initial)
  Auto-scaling: enabled
  Maximum: 500 GiB
  Threshold: Scale when >= 90% full

Backup:
  Automated Backups: enabled
  Retention Period: 7 days (production), 1 day (staging)
  Backup Window: 03:00-04:00 UTC (low-traffic window)
  
Point-in-Time Recovery (PITR):
  Enabled: yes
  Retention: 7 days (can restore to any point in last 7 days)

Enhanced Monitoring:
  Enabled: yes
  Interval: 60 seconds
  Monitor: CPU, memory, disk I/O, network, database processes

Performance Insights:
  Enabled: yes
  Retention: 7 days free
  Helps identify slow queries and bottlenecks
```

### 5.3 Connection Management

```
Max Connections: 200
  Standard: 100 (application threads)
  Reserved: 50 (RDS monitoring, admin operations)
  Margin: 50 (burst capacity)

Connection Pooling:
  Method: RDS Proxy (AWS managed)
    Max client connections: 500 (each multiplexed to ~100 DB connections)
    Idle client timeout: 1800 seconds (30 minutes)
    Idle DB connection timeout: 600 seconds (10 minutes)
    Session pinning: false (stateless app)
    
    Credentials:
      Stored in: AWS Secrets Manager
      Name: /rds-proxy/ordo-prod
      Rotation: 30 days

Alternative (sidecar):
  PgBouncer in transaction pooling mode
    Max server connections: 100
    Default pool size: 25
    Min pool size: 10
    Lifetime: 600 seconds
```

### 5.4 Database Initialization & Migrations

```
Migrations Tool: golang-migrate
  Location: ./migrations
  Naming: {timestamp}_{description}.up.sql and .down.sql
  
  Schema Versioning: _schema_migrations table
  
  CI/CD Flow:
    1. Build Docker image (includes migration binaries)
    2. Migration check: run migrations against test DB, verify rollback
    3. Deploy: new ECS task runs migrations before app startup
    4. Timeout: 5 minutes for migration to complete
    5. Rollback: if migrations fail, ECS task exits; ALB detects failure, rolls back to previous task
```

### 5.5 Performance Tuning

```
Parameter Group: ordo-prod-params
  max_connections: 200
  shared_buffers: 4GB (25% of memory on db.r6g.large)
  effective_cache_size: 12GB (75% of memory)
  maintenance_work_mem: 1GB
  checkpoint_completion_target: 0.9 (reduce I/O impact)
  wal_buffers: 16MB
  default_statistics_target: 100
  
  Log settings:
    log_statement: 'all' (in staging), 'ddl' (in production)
    log_duration: true (track slow queries)
    log_min_duration_statement: 1000 (queries > 1 second)
    log_lock_waits: true
    
  Connection tuning:
    idle_in_transaction_session_timeout: 300000 (5 minutes)
    tcp_keepalives_idle: 30
    tcp_keepalives_interval: 10
    tcp_keepalives_count: 5
```

---

## 6. Cache: AWS ElastiCache Redis 7

### 6.1 Cluster Configuration

**Production:**
```
Cluster Name: ordo-redis-prod
Engine: Redis
Engine Version: 7.0 (latest stable)

Node Type:
  cache.r6g.large
  vCPU: 2
  Memory: 16 GiB
  Network: 10 Gigabit

Cluster Mode: Disabled
  Primary node + 1 replica (multi-AZ)
  Automatic failover enabled
  Single-zone to Multi-AZ migration: 0 downtime
```

**Staging:**
```
Cluster Name: ordo-redis-staging
Node Type: cache.t4g.micro (512 MB) for cost savings
  Can scale up temporarily for load testing
```

### 6.2 Persistence & Backups

```
Persistence:
  Type: AOF (Append Only File)
  Frequency: every 1 second
  Rewrite-in-AOF: enabled
  
  Automatic Backups:
    Daily snapshot: 01:00 UTC
    Retention: 5 days
    Backup window: 01:00-02:00 UTC

RDB Snapshots:
  Creation: manual for major releases
  Location: S3 bucket (ordo-backups-prod)
```

### 6.3 Use Cases in Ordo

```
1. Session Cache:
   Key: session:{session_id}
   Value: {user_id, workspace_id, permissions, expiry}
   TTL: 24 hours
   Pattern: HyperLogLog for active session count

2. Rate Limiting:
   Key: rate-limit:{user_id}:{endpoint}
   Value: {count}
   TTL: 1 minute
   Pattern: INCR + EXPIRE

3. Real-time Pub/Sub (WebSocket):
   Channel: workspace:{workspace_id}:updates
   Publishers: API when content/pipeline changes
   Subscribers: Connected clients (WebSocket handler)
   Persistence: No (ephemeral, clients reconnect on failure)

4. Queue (Background Jobs):
   Type: Sorted Set (by timestamp)
   Key: queue:{job_type}
   Value: {job_id, payload, retry_count}
   Consumers: Worker threads in same ECS task (or separate workers)
   
   Example jobs:
     - Send email notifications
     - Process media encoding
     - Generate analytics reports
     - Sync sponsorship data

5. Caching:
   Key: cache:{entity_type}:{entity_id}
   Value: Serialized JSON
   TTL: 5-60 minutes (depends on entity)
   Invalidation: on write, or lazy expiry

6. Leaderboard / Rankings:
   Key: leaderboard:{metric_name}
   Type: Sorted Set
   Score: metric value (views, followers, etc.)
   Expiry: 1 day (refresh daily)
```

### 6.4 Monitoring & Alarms

```
CloudWatch Metrics:
  CPU: < 30% (healthy)
  Memory: < 80% (healthy)
  NetworkBytesIn/Out: monitor for spikes
  ConnectionCount: < 5000 (should be < 1000 in practice)
  EvictionsPending: 0 (if > 0, resize)
  
Alarms:
  - CPU > 85% for 5 minutes → page on-call
  - Memory > 90% for 5 minutes → page on-call
  - EvictionsPending > 0 → alert (resize immediately)
  - ConnectionCount > 10000 → alert (connection leak)
```

---

## 7. Storage: AWS S3 + CloudFront

### 7.1 S3 Buckets

```
Bucket 1: ordo-uploads-prod
  Purpose: User-uploaded files (raw, unprocessed)
  Versioning: disabled (to save space)
  
  Lifecycle Policy:
    1. Incomplete multipart uploads → delete after 7 days
    2. Non-current versions (if versioning re-enabled) → delete after 30 days
    3. Objects → move to Glacier Deep Archive after 90 days (unused uploads)
       Class: STANDARD_IA (30 days) → Glacier Flexible Retrieval (90+ days)
  
  Permissions:
    Bucket public: blocked
    Objects: private (signed URLs for access)
    CORS: enabled (app.ordocreator.com origin)
  
  Encryption: AES-256 (default, no extra cost)
  
  Pricing estimate:
    100 GB stored: ~$2/month
    Glacier after 90d: ~$1/month
    
  Monitoring:
    CloudWatch: object count, total size
    S3 Access Logs: disabled (for cost, can enable per object with tags)

Bucket 2: ordo-media-prod
  Purpose: Processed media (thumbnails, transcoded videos, resized images)
  Versioning: disabled
  
  Lifecycle Policy:
    Objects → move to Glacier after 180 days (cold storage, infrequent access)
    Delete after 365 days (retention policy)
  
  Permissions:
    Public read (CloudFront distribution serves, not direct S3)
  
  Encryption: AES-256
  
  Pricing estimate:
    500 GB standard: ~$11/month
    Glacier: ~$2/month

Bucket 3: ordo-exports-prod
  Purpose: Generated reports, exports, downloads
  Versioning: disabled
  
  Lifecycle Policy:
    Objects → delete after 30 days (temporary, don't store long-term)
  
  Permissions:
    Private (signed URLs for download)
  
  Encryption: AES-256
  
  Pricing estimate:
    10 GB active: ~$0.23/month

Bucket 4: ordo-backups-prod
  Purpose: Database backups, Redis snapshots
  Versioning: enabled (keep multiple backup versions)
  
  Lifecycle Policy:
    Current version → keep indefinitely (7-year retention)
    Non-current versions → delete after 90 days (save space)
  
  Permissions:
    Restricted (only RDS, ElastiCache, EC2 backup tools can write)
  
  Encryption: KMS (customer-managed key for audit trail)
  
  Replication:
    Cross-region replication: us-west-2 (disaster recovery)
    Replication time control: 15 minutes RTC for critical backups
  
  Pricing estimate:
    1 TB backups: ~$20/month (multi-region: ~$40/month)
```

### 7.2 CloudFront Distribution

```
Distribution Name: ordo-media-cdn-prod

Origins:
  1. S3 Origin (ordo-media-prod.s3.amazonaws.com)
     Origin Access Identity: OAI-ordo-prod
     (restricts direct S3 access, only CloudFront can read)
     
     Behaviors:
       Path: /images/* → cache 86400s (1 day)
       Path: /videos/* → cache 604800s (7 days)
       Path: /thumbnails/* → cache 604800s (7 days)
       
  2. Custom Origin (api.ordocreator.com)
     Port: 443 (HTTPS only)
     Protocol: HTTPS
     Path: /api/*
     
     Behaviors:
       Cache: disabled (or minimal, 1 second)
       Headers: forward all
       Query strings: forward all
       Compress: gzip, brotli

Cache Behaviors:
  Default: /api/* → no cache (origin pull every request)
  /images/* → compress, cache 1 day
  /videos/* → cache 7 days (manifest + segments)
  /health → no cache (1 second TTL)

Restrictions:
  Geo-blocking: disabled (serve worldwide)
  IP whitelist: none
  
  Origin Shield:
    Enabled for media origins (S3)
    Reduces origin load by 80-90%
    Regional: us-east-1

SSL/TLS:
  Viewer Protocol Policy: redirect HTTP to HTTPS
  Minimum SSL Version: TLSv1.2
  Certificate: ACM (*.ordocreator.com)
  
HTTP/2 and HTTP/3:
  Enabled (faster delivery)

Logging:
  CloudFront Logs → S3 bucket (ordo-cdn-logs-prod)
  Log delivery: every 1 hour
  Retention: 90 days
  Pricing: ~$0.01 per 100k logs
  
Pricing estimate:
  10 GB/month data transfer: ~$0.85
  1M requests: ~$0.02
  Monthly: ~$1-5 (depends on usage)
```

### 7.3 Signed URL Generation (Go)

```go
// In API, before serving download link to user
import "github.com/aws/aws-sdk-go-v2/aws/signer/v4"

// Generate signed URL for private S3 object
func GenerateDownloadURL(ctx context.Context, bucket, key string, ttl time.Duration) (string, error) {
    s3Client := s3.NewFromConfig(cfg)
    presignClient := s3.NewPresignFromClient(s3Client)
    
    result, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
        Bucket: aws.String(bucket),
        Key:    aws.String(key),
    }, func(opts *s3.PresignOptions) {
        opts.Expires = durationconv.ToDurationSeconds(int64(ttl.Seconds()))
    })
    
    return result.URL, err
}

// Usage:
url, _ := GenerateDownloadURL(ctx, "ordo-exports-prod", "report-123.pdf", 24*time.Hour)
// URL is valid for 24 hours, contains AWS4-HMAC-SHA256 signature
```

---

## 8. CI/CD: GitHub Actions

### 8.1 Repository Structure

```
ordo-creator-os/
├── .github/workflows/
│   ├── lint-test-build.yaml      (on PR)
│   ├── deploy-staging.yaml       (on merge to main)
│   ├── deploy-production.yaml    (manual trigger)
│   └── release.yaml              (on version tag)
├── cmd/api/main.go
├── internal/
│   ├── service/
│   ├── repository/
│   ├── handler/
│   └── middleware/
├── migrations/
│   ├── 001_init.up.sql
│   └── 001_init.down.sql
├── Dockerfile
├── docker-compose.yml
├── go.mod / go.sum
├── Makefile
└── README.md
```

### 8.2 Workflow: Pull Request

**Trigger:** On every push to a feature branch (PR opened/updated)

**File: `.github/workflows/lint-test-build.yaml`**

```yaml
name: Lint, Test, Build

on:
  pull_request:
    branches:
      - main

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: '1.22'
      
      - name: golangci-lint
        uses: golangci/golangci-lint-action@v3
        with:
          version: latest
          args: --timeout=5m
      
      - name: Go fmt
        run: |
          if [ "$(gofmt -s -l . | wc -l)" -gt 0 ]; then
            echo "Go code is not formatted"
            exit 1
          fi
      
      - name: Go vet
        run: go vet ./...

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: ordo_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: '1.22'
      
      - name: Run migrations
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/ordo_test
        run: |
          go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
          migrate -path ./migrations -database "$DATABASE_URL" up
      
      - name: Run tests
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/ordo_test
          REDIS_URL: redis://localhost:6379
          GO_ENV: test
        run: go test -v -race -coverprofile=coverage.out ./...
      
      - name: Run migrations down (verify rollback)
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/ordo_test
        run: migrate -path ./migrations -database "$DATABASE_URL" down -all

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker image (test)
        run: |
          docker build -t ordo-api:pr-${{ github.event.pull_request.number }} .
          docker run --rm ordo-api:pr-${{ github.event.pull_request.number }} --version || echo "No version flag"
      
      - name: Scan image (Trivy)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ordo-api:pr-${{ github.event.pull_request.number }}
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

**Checks required to pass before merge:**
- ✅ Lint (golangci-lint, gofmt, go vet)
- ✅ Unit tests (100% on critical paths)
- ✅ Integration tests (with real DB/Redis)
- ✅ Migration check (up + down)
- ✅ Container build (Dockerfile builds cleanly)
- ✅ Container scan (no critical vulns)

---

### 8.3 Workflow: Deploy to Staging

**Trigger:** Automatic on merge to `main` (no approval required)

**File: `.github/workflows/deploy-staging.yaml`**

```yaml
name: Deploy to Staging

on:
  push:
    branches:
      - main

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: ordo-api
  ECS_SERVICE: ordo-api-staging
  ECS_CLUSTER: ordo-staging
  CONTAINER_NAME: ordo-api

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    permissions:
      id-token: write
      contents: read
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/GitHubActionsOIDC
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        run: |
          aws ecr get-login-password --region ${{ env.AWS_REGION }} | \
            docker login --username AWS --password-stdin \
            ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com
      
      - name: Build and push Docker image
        run: |
          docker build -t ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com/${{ env.ECR_REPOSITORY }}:staging-latest .
          docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com/${{ env.ECR_REPOSITORY }}:staging-latest
      
      - name: Update ECS task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition ordo-api-staging \
            --query taskDefinition \
            > task-def.json
          
          jq --arg IMAGE "${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com/${{ env.ECR_REPOSITORY }}:staging-latest" \
            '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' \
            task-def.json > new-task-def.json
          
          aws ecs register-task-definition \
            --cli-input-json file://new-task-def.json
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --force-new-deployment
      
      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }} \
            --services ${{ env.ECS_SERVICE }}
      
      - name: Run integration tests against staging
        env:
          API_URL: https://staging-api.ordocreator.com
        run: |
          go test -v -tags integration ./tests/integration/...
      
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_STAGING }}
          payload: |
            {
              "text": "Staging deployment: ${{ job.status }}\nCommit: ${{ github.sha }}\nAuthor: ${{ github.actor }}"
            }
```

---

### 8.4 Workflow: Deploy to Production

**Trigger:** Manual approval required (GitHub deployment protection rules)

**File: `.github/workflows/deploy-production.yaml`**

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version tag (e.g., v1.0.0)'
        required: true

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: ordo-api
  ECS_SERVICE: ordo-api-prod
  ECS_CLUSTER: ordo-prod
  CONTAINER_NAME: ordo-api

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    permissions:
      id-token: write
      contents: read
    
    environment:
      name: production
      url: https://api.ordocreator.com
    
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version }}
      
      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/GitHubActionsOIDC
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        run: |
          aws ecr get-login-password --region ${{ env.AWS_REGION }} | \
            docker login --username AWS --password-stdin \
            ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com
      
      - name: Build and push Docker image
        run: |
          docker build -t ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com/${{ env.ECR_REPOSITORY }}:${{ github.event.inputs.version }} .
          docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com/${{ env.ECR_REPOSITORY }}:${{ github.event.inputs.version }}
      
      - name: Update ECS task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition ordo-api-prod \
            --query taskDefinition \
            > task-def.json
          
          jq --arg IMAGE "${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ env.AWS_REGION }}.amazonaws.com/${{ env.ECR_REPOSITORY }}:${{ github.event.inputs.version }}" \
            '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' \
            task-def.json > new-task-def.json
          
          aws ecs register-task-definition \
            --cli-input-json file://new-task-def.json
      
      - name: Create ECS deployment
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --force-new-deployment
      
      - name: Wait for deployment (with timeout)
        run: |
          timeout 900 aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }} \
            --services ${{ env.ECS_SERVICE }}
      
      - name: Smoke tests against production
        env:
          API_URL: https://api.ordocreator.com
        run: |
          go test -v -tags smoke ./tests/smoke/...
      
      - name: Notify Slack (success)
        if: success()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_PROD }}
          payload: |
            {
              "text": ":rocket: Production deployment successful!\nVersion: ${{ github.event.inputs.version }}\nAuthor: ${{ github.actor }}"
            }
      
      - name: Notify Slack (failure - trigger rollback)
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_PROD }}
          payload: |
            {
              "text": ":warning: Production deployment FAILED!\nVersion: ${{ github.event.inputs.version }}\nRollback initiated..."
            }
```

### 8.5 Release Flow

```
Feature Development:
  1. Branch: git checkout -b feature/some-feature
  2. Commit: git commit -m "feat: add feature"
  3. Push: git push origin feature/some-feature
  4. PR: Open PR on GitHub (triggers lint-test-build workflow)
  5. Review: Team reviews code
  6. Approve & Merge: Reviewer approves → merge to main

Staging Deployment (automatic):
  1. GitHub Actions detects merge to main
  2. Runs deploy-staging workflow
  3. Builds image, pushes to ECR
  4. Updates ECS task definition
  5. Deploys to staging (2 new tasks, old tasks drain)
  6. Waits for new tasks to pass health checks
  7. Integration tests run against staging
  8. Notifies Slack

Production Deployment (manual):
  1. Create release tag: git tag -a v1.0.0 -m "Release v1.0.0"
  2. Push tag: git push origin v1.0.0
  3. Go to GitHub Actions → Deploy to Production (manual trigger)
  4. Enter version: v1.0.0
  5. Approve in environment gate
  6. Workflow builds image, pushes to ECR
  7. Updates task definition with new image
  8. Deploys to production (rolling update: 2→4→2 or similar)
  9. Waits for all tasks to pass health checks
  10. Runs smoke tests
  11. Notifies Slack
  12. If failure detected → auto-rollback (revert to previous task definition)
```

---

## 9. Dockerfile: Multi-Stage Build

### 9.1 Dockerfile Specification

**File: `./Dockerfile`**

```dockerfile
# ============================================================================
# Stage 1: Builder
# ============================================================================
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev ca-certificates git tzdata

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
# CGO_ENABLED=0: static binary (no C lib dependencies)
# GOOS=linux: target OS
# GOARCH=amd64: target architecture (can be arm64 for ARM-based systems)
# -ldflags: embed version info
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-X main.Version=$(git describe --tags --always) \
              -X main.BuildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
              -w -s" \
    -o /ordo-api \
    ./cmd/api

# Verify binary exists
RUN ls -lh /ordo-api

# ============================================================================
# Stage 2: Runtime
# ============================================================================
FROM alpine:3.19

# Install runtime dependencies
# ca-certificates: for TLS/HTTPS (AWS API, external service calls)
# tzdata: for time zone support
# curl: for health checks (optional, can use built-in)
RUN apk add --no-cache ca-certificates tzdata curl

# Set timezone (can be overridden at runtime)
ENV TZ=UTC

# Create app user (non-root for security)
RUN addgroup -g 1000 ordo && \
    adduser -D -u 1000 -G ordo ordo

# Copy binary from builder
COPY --from=builder /ordo-api /app/ordo-api

# Copy migrations (if present)
COPY migrations /app/migrations

# Set ownership
RUN chown -R ordo:ordo /app

# Switch to non-root user
USER ordo

# Set working directory
WORKDIR /app

# Expose port (informational, ALB will use 8080)
EXPOSE 8080

# Health check (optional, ECS uses separate health check config)
HEALTHCHECK --interval=30s --timeout=5s --retries=2 --start-period=10s \
    CMD curl -f http://localhost:8080/health || exit 1

# Default command
CMD ["/app/ordo-api"]

# ============================================================================
# Image Metadata
# ============================================================================
# Size: ~30-50 MB (Go binary + Alpine + ca-certificates)
# Scan: Trivy (automated in CI/CD) - should show minimal CVEs (base image only)
```

### 9.2 Build & Push

```bash
# Local development build
docker build -t ordo-api:latest .

# AWS ECR build (in CI/CD pipeline)
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ordo-api:v1.0.0 .
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ordo-api:v1.0.0

# Tag for multiple registries
docker tag ordo-api:v1.0.0 $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ordo-api:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ordo-api:latest
```

### 9.3 Container Registry: AWS ECR

```
Repository Name: ordo-api
Visibility: Private (IAM-controlled access)
Image Scanning:
  On push: enabled (Trivy integration)
  Scan results: published to AWS Security Hub
Retention Policy:
  Untagged images: delete after 30 days (save space)
  Tagged images: keep indefinitely
  Latest tag: keep 10 versions
Lifecycle Rules:
  Pattern: image-count
  Keep most recent: 20 images (for easy rollback)
Encryption:
  Type: AWS KMS (default or customer-managed)
```

---

## 10. Secrets Management: AWS Secrets Manager

### 10.1 Secret Naming & Organization

```
Secrets Hierarchy:

/ordo/prod/
  database-url (RDS connection string)
  database-password (DB password, rotated separately)
  redis-url (ElastiCache endpoint)
  jwt-secret (JWT signing key)
  jwt-refresh-secret (refresh token key)
  openai-api-key (OpenAI API key)
  anthropic-api-key (Anthropic API key)
  s3-bucket-uploads (bucket name)
  s3-bucket-media (bucket name)
  s3-bucket-exports (bucket name)
  sendgrid-api-key (email service)
  stripe-secret-key (payment processing)
  stripe-webhook-secret (webhook signing)
  sentry-dsn (error tracking)
  slack-webhook-url (notifications)

/ordo/staging/
  (same as above, different values)

/ordo/dev/
  (developer secrets for local or test env)
```

### 10.2 Rotation Policy

```
Automatic Rotation:
  Database Password:
    Interval: 30 days
    Function: Lambda (AWS-provided template)
    Rotation strategy: rotate credentials, test connection, finalize
    
  API Keys (OpenAI, Anthropic):
    Manual rotation: every 90 days (set calendar reminder)
    Process: generate new key → update secret → test → retire old key
    
  JWT Secrets:
    Manual rotation: every 180 days (low risk)
    Process: keep old secret in secondary slot for 24h grace period
             (allow clients with old JWT to still auth)
    
  S3 Access Keys (if used):
    Interval: 90 days (if using key-based, not IAM role)
    Process: rotate 2 keys simultaneously to avoid outage

Rotation Without Downtime:
  1. Secrets Manager supports multiple versions
  2. Application checks both current + pending versions
  3. Rotation Lambda function:
     - Creates new credentials in secret service (e.g., DB user)
     - Tests new credentials
     - Updates Secrets Manager
     - Application picks up new value on next read
```

### 10.3 Accessing Secrets in Go

```go
import "github.com/aws/aws-sdk-go-v2/service/secretsmanager"

func GetSecret(ctx context.Context, secretName string) (string, error) {
    client := secretsmanager.NewFromConfig(cfg)
    
    result, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
        SecretId: aws.String(secretName),
    })
    if err != nil {
        return "", fmt.Errorf("unable to read secret %s: %w", secretName, err)
    }
    
    // Return secret string
    return aws.ToString(result.SecretString), nil
}

// Usage (in main.go or config initialization)
jwtSecret, _ := GetSecret(ctx, "/ordo/prod/jwt-secret")
dbUrl, _ := GetSecret(ctx, "/ordo/prod/database-url")

// Or use environment variables set by ECS from Secrets Manager
os.Getenv("JWT_SECRET") // injected by ECS task role
```

### 10.4 ECS Task Role (IAM)

```yaml
# In ECS Task Definition, attach role with these permissions:

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:/ordo/prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::ordo-uploads-prod",
        "arn:aws:s3:::ordo-uploads-prod/*",
        "arn:aws:s3:::ordo-media-prod",
        "arn:aws:s3:::ordo-media-prod/*",
        "arn:aws:s3:::ordo-exports-prod",
        "arn:aws:s3:::ordo-exports-prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/ecs/ordo-api-prod:*"
    }
  ]
}
```

---

## 11. Domain & SSL/TLS

### 11.1 Domain Structure

```
Root Domain: ordocreator.com
  Registrar: Route53 (AWS DNS)
  
Subdomains:
  api.ordocreator.com              → ALB (API Gateway)
  app.ordocreator.com              → Vercel (Next.js frontend)
  staging-api.ordocreator.com      → ALB (Staging environment)
  staging-app.ordocreator.com      → Vercel (Staging app)
  cdn.ordocreator.com              → CloudFront (optional, media CDN)
  
DNS Records (Route53):
  ordocreator.com A                → CloudFlare (apex)
  *.ordocreator.com CNAME          → CloudFlare (wildcard)
  
  Or (if using Route53 directly):
  api.ordocreator.com ALIAS        → ALB
  app.ordocreator.com ALIAS        → Vercel nameservers
```

### 11.2 SSL/TLS Certificates

```
Certificates:
  Provider: AWS Certificate Manager (ACM)
  Domains: *.ordocreator.com, ordocreator.com
  Validation: DNS (automatic via Route53)
  Renewal: Automatic (90 days before expiry)
  
  Attached to:
    - ALB (listener 443 → 8080 redirect HTTP)
    - CloudFront (viewer certificate)
    
Layer 1 - CloudFlare (edge):
  TLS: Full (Strict to origin)
  HTTP/2: enabled
  HSTS: enabled (max-age=31536000)
  
Layer 2 - ALB:
  Protocol: HTTPS (TLS 1.2+)
  Certificate: ACM (*.ordocreator.com)
  
Layer 3 - ECS Fargate:
  Protocol: HTTP (8080, internal only)
  TLS: not needed (traffic is private within AWS)

Health Check (ALB):
  Protocol: HTTP (health checks use HTTP, not HTTPS)
  Path: /health
  Interval: 30 seconds
```

### 11.3 HSTS & Security Headers

```
CloudFlare Page Rule:
  URL: *ordocreator.com/*
  Settings:
    - Security Level: High
    - Always HTTPS: ON
    - HSTS: enabled
      Max-Age: 31536000 (1 year)
      Include subdomains: yes
      Preload: yes

ALB Response Headers (via middleware):
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  X-XSS-Protection: 1; mode=block
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

---

## 12. Scaling Strategy: Phased Approach

### 12.1 Phase 1: MVP (0-1,000 users)
**Timeline:** Months 1-3 (launch)

```
Architecture:
  ECS: 1-2 tasks (1 vCPU, 2GB RAM each)
  RDS: db.t4g.small (1 CPU, 2GB RAM)
  ElastiCache: cache.t4g.micro (512MB)
  S3: Standard storage only
  
Costs:
  ECS: ~$40-80/month
  RDS: ~$30-40/month
  ElastiCache: ~$10-15/month
  S3/CDN: ~$5-10/month
  ────────────────────
  Total: ~$85-145/month

Constraints:
  Max concurrent users: 100
  DB connections: 50
  Cache memory: 512MB
  
Scaling triggers: None (manual if needed)
```

### 12.2 Phase 2: Growth (1,000-10,000 users)
**Timeline:** Months 3-9

```
Architecture Changes:
  ECS: 2-4 tasks (auto-scaling enabled)
  RDS: db.r6g.large with Multi-AZ failover
  ElastiCache: cache.r6g.large with replica
  S3: Same, but with more data
  CloudFront: CDN enabled for media
  
Costs:
  ECS: ~$150-300/month
  RDS Multi-AZ: ~$350-450/month
  ElastiCache replica: ~$100-150/month
  CloudFront: ~$50-100/month
  S3: ~$20-50/month
  ────────────────────
  Total: ~$670-1,050/month

Scaling Triggers Implemented:
  CPU > 70% → scale +1 task
  Memory > 80% → alert + manual scale
  DB connections > 150 → add read replica
  S3 storage > 100GB → verify lifecycle policies

New components:
  - RDS read replica (for reporting, analytics)
  - ElastiCache replica (high availability)
  - CloudWatch alarms + SNS notifications
  - Slack alerts for ops team
```

### 12.3 Phase 3: Scale (10,000-100,000 users)
**Timeline:** Months 9-18

```
Architecture Changes:
  ECS: 4-10 tasks (aggressive auto-scaling)
  RDS: db.r6g.xlarge, read replicas (3+)
  ElastiCache: Cluster mode (sharding)
  S3: Intelligent-Tiering + Glacier
  CloudFront: Multiple origins, edge caching
  
New Components:
  - API rate limiting (per-user, per-IP)
  - DynamoDB for real-time counters (high write load)
  - SQS for job queues (decoupling)
  - Lambda for background jobs (media encoding, exports)
  - ElastiSearch for full-text search (content discovery)
  - Kinesis Data Firehose for analytics → S3
  
Costs:
  ECS: ~$600-1000/month
  RDS with replicas: ~$1200-1600/month
  ElastiCache cluster: ~$300-500/month
  CDN: ~$200-400/month
  DynamoDB: ~$100-300/month
  Lambda: ~$50-200/month
  Others: ~$200-400/month
  ────────────────────────
  Total: ~$2,650-4,400/month

Scaling Triggers:
  Auto-scale ECS (2-10 tasks)
  RDS read replica pool: expand to 5+
  ElastiCache: evaluate cluster mode
  DynamoDB: on-demand or provisioned capacity
```

### 12.4 Phase 4: Enterprise (100,000+ users)
**Timeline:** Months 18+

```
Architecture Changes:
  Microservices: Break monolith into services
    - auth-service (JWT, OAuth)
    - content-service (CRUD)
    - pipeline-service (workflows)
    - media-service (encoding, transcoding)
    - ai-service (gateway, model calls)
    - search-service (ElasticSearch)
    - analytics-service (aggregation)
  
  Multi-region:
    - Primary: us-east-1 (N. Virginia)
    - Secondary: eu-west-1 (Ireland)
    - Tertiary: ap-southeast-1 (Singapore)
    - CloudFront: global edge locations
  
  New Components:
    - Service mesh: AWS App Mesh (Envoy sidecars)
    - gRPC: for service-to-service communication
    - GraphQL gateway: for frontend flexibility
    - Kafka: for real-time event streaming
    - MongoDB: for flexible schema (user profiles, settings)
    - Datadog/NewRelic: advanced monitoring
    - HashiCorp Vault: secrets management at scale
  
Costs:
  Estimated: $10,000-50,000/month (depends on compute + data)
```

---

## 13. Cost Estimates

### 13.1 MVP (Phase 1): 0-1,000 users

```
Component              Qty    Unit Price    Monthly Cost
────────────────────────────────────────────────────────
ECS Fargate
  vCPU                 1      $0.04134/hr   $30
  Memory (GB)          2      $0.00456/hr   $7
  
RDS PostgreSQL
  db.t4g.small         1      $0.063/hr     $47
  Storage (10GB)       1      $0.10/GB      $1
  Backup storage       1      $0.023/GB     ~$5
  
ElastiCache Redis
  cache.t4g.micro      1      $0.003/hr     $2
  
S3 Storage
  Standard (5GB)       1      $0.023/GB     ~$0.12
  Requests (100k)      1      $0.0000004    ~$0.04
  
CloudWatch
  Metrics              ~100   ~$0.01 each   $1
  Logs (5GB)           1      $0.50/GB      $2.50
  
Secrets Manager
  Secrets              5      $0.40/month   $2
  Rotations            1      $0.05/rotation $0.50
  
Route53
  Hosted zone          1      $0.50/month   $0.50
  Queries (1M)         1      $0.40/M       $0.40
  
─────────────────────────────────────────────────────────
Subtotal                                     $98.50
────────────────────────────────────────────────────────

Estimated Range: $85-150/month
Assumptions: light usage, <100 concurrent users, <1GB data
```

### 13.2 Growth (Phase 2): 1,000-10,000 users

```
Component              Qty    Unit Price    Monthly Cost
────────────────────────────────────────────────────────
ECS Fargate
  vCPU                 3      $0.04134/hr   $90
  Memory (GB)          6      $0.00456/hr   $20
  
RDS PostgreSQL
  db.r6g.large         1      $0.276/hr     $202
  Multi-AZ standby     1      (included)    $0
  Storage (50GB)       1      $0.10/GB      $5
  Backup storage       1      $0.023/GB     ~$3
  
ElastiCache Redis
  cache.r6g.large      1      $0.102/hr     $75
  Replica (included)   1      (included)    $0
  
S3 Storage
  Standard (100GB)     1      $0.023/GB     $2.30
  Requests (5M)        1      $0.0000004    $0.20
  
CloudFront
  Data out (10GB)      1      $0.085/GB     $0.85
  Requests (10M)       1      $0.0075/10k   $7.50
  
CloudWatch
  Metrics              ~200   ~$0.01 each   $2
  Logs (20GB)          1      $0.50/GB      $10
  
Secrets Manager,
Route53, etc.                                $5
  
─────────────────────────────────────────────────────────
Subtotal                                     $422.85
────────────────────────────────────────────────────────

Estimated Range: $400-600/month
Assumptions: 2-4 tasks running, RDS Multi-AZ, some media serving
```

### 13.3 Scale (Phase 3): 10,000-100,000 users

```
Component              Qty    Unit Price    Monthly Cost
────────────────────────────────────────────────────────
ECS Fargate
  vCPU                 8      $0.04134/hr   $240
  Memory (GB)          16     $0.00456/hr   $53
  
RDS PostgreSQL
  db.r6g.xlarge        1      $0.552/hr     $405
  Read replicas        3      $0.276/hr     $607
  Storage (200GB)      1      $0.10/GB      $20
  Backup storage       1      $0.023/GB     ~$10
  
ElastiCache Redis
  cache.r6g.xlarge     1      $0.204/hr     $150
  Cluster mode         1      (additional)  ~$200
  
DynamoDB (if added)
  Write capacity       ~500    $1.25/100    $6.25
  Read capacity        ~500    $0.25/100    $1.25
  Storage (1GB)        1       $0.25/GB     $0.25
  
S3 Storage
  Standard (500GB)     1      $0.023/GB     $11.50
  Glacier (500GB)      1      $0.004/GB     $2
  Requests (50M)       1      $0.0000004    $2
  
CloudFront
  Data out (100GB)     1      $0.085/GB     $8.50
  Requests (100M)      1      $0.0075/10k   $75
  Origin Shield        1      $0.005/req    $150
  
Lambda (if used)
  Invocations (10M)    1      $0.0000002    $2
  Duration (1M seconds) 1     $0.0000167    $17
  
ElasticSearch (if used)
  Domain (3 nodes)     1      ~$600/month   $600
  
CloudWatch
  Metrics              ~500   ~$0.01 each   $5
  Logs (100GB)         1      $0.50/GB      $50
  
Miscellaneous                                $50
  
─────────────────────────────────────────────────────────
Subtotal                                     $2,771
────────────────────────────────────────────────────────

Estimated Range: $2,500-4,000/month
Assumptions: 4-8 tasks, RDS with replicas, active CDN, some serverless
```

### 13.4 Cost Optimization Tips

```
1. Reserved Instances:
   - Commit 1-3 years for RDS/ElastiCache
   - Save 40-60% vs on-demand
   - Estimate: RDS -$100/mo, ElastiCache -$30/mo

2. S3 Lifecycle:
   - Move to Intelligent-Tiering (auto-cost-optimize)
   - Move old data to Glacier (90% savings)
   - Enable S3 Select (avoid downloading whole objects)

3. ECS Fargate Spot Instances:
   - Mix Spot (70% cheaper) with On-Demand
   - Good for non-critical workloads, batch jobs
   - Estimate: ECS -50-70% during low-load hours

4. CloudFront Caching:
   - Increase TTL for static assets (1 month)
   - Enable Origin Shield (reduces origin load)
   - Save: 20-30% data transfer costs

5. Database Optimization:
   - Use RDS Read Replicas for analytics queries (off peak)
   - Connection pooling (RDS Proxy)
   - Indexing & query optimization

6. Compute Right-Sizing:
   - Start small, scale up based on metrics
   - Monitor CPU/memory utilization
   - Don't over-provision for peaks (use auto-scaling)

Estimated savings:
  With reservations + optimization: -$200-400/month
```

---

## 14. Disaster Recovery

### 14.1 Failure Scenarios & Recovery

```
┌─────────────────────────────────────────────────────────────┐
│                  FAILURE SCENARIOS                          │
└─────────────────────────────────────────────────────────────┘

Scenario 1: ECS Task Failure
  Cause: Out of memory, crash, health check fails
  Detection: Health check fails 2x (60 seconds)
  Recovery:
    - ALB removes task from target group (5-10s)
    - ECS detects failed task, replaces it (30-60s)
    - New task starts, passes health check (10-20s)
    - Total downtime: ~30-90 seconds (some traffic served by other tasks)
  RTO: 1-2 minutes
  Data loss: None (session/data in RDS/Redis)

Scenario 2: RDS Primary Failure
  Cause: Hardware failure, network partition
  Detection: Health check fails, DB connection timeout
  Recovery:
    - RDS Multi-AZ automatic failover (< 2 minutes)
    - Standby becomes primary in different AZ
    - Application reconnects with same endpoint
    - No manual intervention needed
  RTO: 2-5 minutes
  RPO: < 1 second (synchronous replication)
  Data loss: None (sync replication)

Scenario 3: ElastiCache Cluster Failure
  Cause: Node hardware failure
  Detection: Connection timeouts, cache misses spike
  Recovery:
    - ElastiCache replaces failed node (3-5 minutes)
    - Replica promotes to primary (if single node + replica)
    - Application retries cache operations
    - Fallback: recompute data from DB (slower)
  RTO: 5-10 minutes
  RPO: < 1 minute (async replication)
  Data loss: Session data lost (non-critical, user re-auth)

Scenario 4: ALB Failure
  Cause: Software bug, hardware failure
  Detection: Route53 health check fails
  Recovery:
    - AWS automatically replaces ALB (5-10 minutes)
    - Route53 fails over to backup ALB (if configured)
    - Or: CloudFlare cached responses serve (if cached)
  RTO: 5-15 minutes
  RPO: N/A (stateless)
  Data loss: None

Scenario 5: S3 Bucket Outage (unlikely)
  Cause: Misconfiguration, account issue
  Detection: S3 API errors
  Recovery:
    - Activate cross-region replication
    - Point to secondary bucket in different region
    - Estimated: 5-30 minutes (manual, if automated)
  RTO: 5-30 minutes
  RPO: < 1 hour (async replication)
  Data loss: Maybe (if replication lag)

Scenario 6: Database Corruption
  Cause: Application bug, data race
  Detection: Data integrity check fails
  Recovery:
    - Point-in-Time Restore: pick time before corruption
    - Restore to new RDS instance
    - Verify data, swap primary
    - Estimated: 15-30 minutes (manual, not automated)
  RTO: 15-30 minutes
  RPO: Last backup time (typically < 1 hour)
  Data loss: 0-1 hour of data

Scenario 7: Regional Outage (AWS region down)
  Cause: Major AWS infrastructure failure (rare)
  Detection: All AWS services in region fail simultaneously
  Recovery:
    - Manual failover to secondary region (hours)
    - Requires pre-configured infrastructure in secondary
    - RTO: 1-4 hours (depends on automation)
  RPO: Cross-region replication lag (minutes to hours)
  Data loss: Minutes to hours
```

### 14.2 Backup & Recovery Strategy

```
Database (RDS PostgreSQL):
  Automated Backups:
    - Frequency: Daily at 03:00 UTC
    - Retention: 7 days (prod), 1 day (staging)
    - Type: Full snapshot + transaction logs (for PITR)
  
  Point-in-Time Recovery:
    - Enabled: yes
    - Retention: 7 days
    - Granularity: per second
    - Recovery process:
      1. AWS restore from base snapshot + logs up to target time
      2. Creates new RDS instance
      3. Verify data integrity
      4. Swap DNS to new instance
      5. Estimated time: 10-30 minutes
  
  Manual Snapshots:
    - Frequency: before major deployments
    - Retention: indefinite (manual cleanup)
    - Process: snapshot → export to S3 → archive

Cache (ElastiCache Redis):
  Automated Backups:
    - Frequency: Daily at 01:00 UTC
    - Type: RDB snapshot (point-in-time)
    - Retention: 5 days
    - Enabled: yes
  
  AOF (Append-Only File):
    - Enabled: yes (persistence on disk)
    - Rewrite-in-AOF: enabled
    - Helps recover from crashes faster

Storage (S3):
  Versioning:
    - Enabled: yes
    - Retention: keep all versions
    - Allows recovery from accidental deletion
  
  Cross-Region Replication:
    - Buckets: ordo-uploads-prod, ordo-media-prod, ordo-backups-prod
    - Target region: us-west-2 (different geography)
    - Replication time control: 15 minutes max lag
    - Enables regional failover
  
  Backup Bucket (ordo-backups-prod):
    - Encrypted: yes (KMS)
    - Lifecycle: keep for 7 years (compliance)
    - Replication: yes (cross-region)

Recovery Time Objectives (RTO):

Component           Failure Type      RTO        Automated?
─────────────────────────────────────────────────────────
ECS Task           Crash             1-2 min    Yes
RDS Primary        Failure            2-5 min    Yes (Multi-AZ)
RDS Data           Corruption        15-30 min  Manual
ElastiCache        Node failure      5-10 min   Yes (auto-replace)
S3                 Accidental delete 5-15 min   Yes (restore version)
Region             Outage            1-4 hours  Manual
─────────────────────────────────────────────────────────

Recovery Point Objectives (RPO):

Component           Backup Frequency  RPO
─────────────────────────────────────────────────────────
RDS                Daily + PITR       < 1 minute (PITR)
ElastiCache        Daily snapshot     < 1 minute
S3                 Cross-region rep   < 15 minutes
Backups            Cross-region rep   < 15 minutes
─────────────────────────────────────────────────────────
```

### 14.3 Disaster Recovery Plan

```
1. Monitoring & Alerting:
   ✓ CloudWatch alarms for all services (CPU, memory, latency, errors)
   ✓ Automated notifications: Slack, PagerDuty, email
   ✓ Health dashboards: public status page (StatusPage.io)

2. Incident Response Runbooks:
   - RDS failover: automated, no action needed
   - ECS task failure: automated replacement
   - Corruption recovery: manual restore from backup
   - Regional failure: manual DNS update to secondary region

3. Backup Validation:
   ✓ Weekly restore test: restore DB backup to staging
   ✓ Verify data integrity (row count, checksums)
   ✓ Test application with restored data
   ✓ Document any issues, fix gaps

4. Business Continuity:
   ✓ Team training: quarterly DR drills
   ✓ On-call rotation: 24/7 coverage for critical incidents
   ✓ Communication plan: status page, customer email templates
   ✓ Rollback procedure: revert to previous task definition in seconds

5. Testing Schedule:
   Weekly:
     - Health check endpoint monitoring
     - ECS task replacement (chaos engineering)
   Monthly:
     - RDS backup restore test
     - Failover simulation (manual)
   Quarterly:
     - Full disaster recovery drill
     - Customer communication (status page update)
```

---

## 15. Monitoring & Observability

### 15.1 CloudWatch Metrics

```
ECS Service:
  Metrics:
    - DesiredTaskCount: should match RunningTaskCount
    - RunningTaskCount: actual tasks running
    - PendingTaskCount: tasks waiting to start (should be 0)
  
  Alarms:
    - RunningTaskCount < DesiredTaskCount for > 2 min → alert
    - PendingTaskCount > 0 for > 5 min → alert (capacity issue)

ECS Task:
  Metrics:
    - CPUUtilization: % of CPU used
    - MemoryUtilization: % of memory used
  
  Alarms:
    - CPUUtilization > 80% for 2 min → scale out
    - MemoryUtilization > 85% for 2 min → alert (memory leak?)

RDS:
  Metrics:
    - DatabaseConnections: active connections
    - CPUUtilization: database CPU %
    - FreeableMemory: available RAM
    - DiskQueueDepth: pending I/O operations
    - ReadThroughput, WriteThroughput: MB/s
    - ReadLatency, WriteLatency: milliseconds
  
  Alarms:
    - CPUUtilization > 80% for 5 min → scale (or add read replicas)
    - DatabaseConnections > 150 → alert (connection pool pressure)
    - FreeableMemory < 2GB → alert (memory pressure)
    - DiskQueueDepth > 10 → alert (I/O bottleneck)
    - ReadLatency > 10ms → alert (unusual slowness)

ElastiCache:
  Metrics:
    - CPUUtilization: % of CPU
    - DatabaseMemoryUsagePercentage: % memory used
    - EvictionsPending: items being evicted from memory
    - NetworkBytesIn, NetworkBytesOut: network throughput
  
  Alarms:
    - DatabaseMemoryUsagePercentage > 90% → scale or alert
    - EvictionsPending > 0 → alert (cache too small)
    - CPUUtilization > 85% → alert (capacity issue)

Application (via logs):
  Metrics:
    - RequestCount: total HTTP requests
    - ErrorCount: 4xx and 5xx responses
    - LatencyP50, LatencyP95, LatencyP99: response times
    - RequestDuration: histogram of request times
  
  Alarms:
    - ErrorRate (5xx) > 1% → alert (application issue)
    - LatencyP99 > 500ms → alert (slow API)
    - 4xxRate > 5% → alert (client errors, possible bugs)
```

### 15.2 CloudWatch Logs

```
Log Groups:
  /ecs/ordo-api-prod:
    - Stream: ordo-api/ordo-api/{task-id}
    - Format: JSON (structured logging)
    - Log level: info (production), debug (staging)
    - Retention: 30 days (prod), 7 days (staging)
  
  /aws/rds/instance/ordo-prod:
    - PostgreSQL logs (error, query, slow query)
    - Retention: 7 days
  
  /aws/elasticache/ordo-redis-prod:
    - Redis logs (errors, evictions)
    - Retention: 3 days

Log Insights Queries:
  
  # Find all errors in last 1 hour
  fields @timestamp, @message, @logStream
  | filter @message like /ERROR/
  | stats count() as error_count by @logStream
  
  # API latency percentiles
  fields @duration
  | stats pct(@duration, 50) as p50, pct(@duration, 95) as p95, pct(@duration, 99) as p99
  
  # Database slow queries (> 1 second)
  fields @timestamp, @message
  | filter @message like /duration: [0-9]{4,}/
  | stats count() as slow_query_count
```

### 15.3 CloudWatch Dashboard

```
Main Dashboard: ordo-api-health

Widgets:
  1. ECS Service Health (top-left)
     - Running tasks vs desired
     - CPU utilization (line chart)
     - Memory utilization (line chart)
  
  2. RDS Performance (top-right)
     - Active connections
     - CPU & memory
     - Read/write latency
  
  3. Cache Performance (middle-left)
     - Hit rate %
     - Memory usage
     - Evictions
  
  4. API Metrics (middle-right)
     - Request rate (req/sec)
     - Error rate (%)
     - Latency (p50, p95, p99)
  
  5. S3 Activity (bottom-left)
     - Upload rate (bytes/sec)
     - Request count
     - Error rate
  
  6. Network (bottom-right)
     - Data in/out (bytes/sec)
     - ALB target health
```

### 15.4 Alarms & Notifications

```
Alarm Configuration:

Critical Alarms (page on-call):
  1. ECS tasks < desired count for > 2 minutes
  2. RDS CPU > 85% for > 5 minutes
  3. API error rate (5xx) > 5% for > 2 minutes
  4. API latency p99 > 1000ms for > 5 minutes
  5. ElastiCache memory > 95% for > 2 minutes
  6. Database connections > 180 (of 200) for > 5 minutes

Warning Alarms (alert, don't page):
  1. RDS CPU > 70% for > 10 minutes (scaling soon)
  2. API error rate (4xx) > 10% for > 5 minutes (client errors)
  3. API latency p99 > 500ms for > 10 minutes
  4. ElastiCache memory > 80% for > 10 minutes

Info Alarms (dashboard only):
  1. RDS backup completed
  2. S3 lifecycle transitioned objects to Glacier

Notification Channels:
  Critical → PagerDuty (SMS + phone)
            → Slack #incidents (post to on-call channel)
            → Email (team-on-call@ordocreator.com)
  
  Warning → Slack #alerts (all alerts channel)
  
  Info → CloudWatch Logs (for history)

Example SNS Topic (for critical alarms):
  SNS Topic: ordo-critical-alerts
  Subscribers:
    - PagerDuty integration (auto-creates incident)
    - Slack webhook (posts to #incidents)
    - Email (fallback)
```

---

## 16. Security & Compliance

### 16.1 Network Security

```
VPC Architecture:
  Public Subnets (NAT Gateways):
    - ALB (Application Load Balancer)
    - CloudFlare DDoS protection
  
  Private Subnets (Application):
    - ECS Fargate tasks (ordo-api)
    - No direct internet access
    - Outbound through NAT Gateway (for external APIs)
  
  Private Subnets (Database):
    - RDS PostgreSQL (multi-AZ)
    - ElastiCache Redis (no direct access)
    - Only accessible from application private subnet

Security Groups:
  ALB Security Group (ordo-alb-sg):
    Inbound:
      - HTTP 80 from 0.0.0.0/0 (CloudFlare IPs)
      - HTTPS 443 from 0.0.0.0/0 (CloudFlare IPs)
    Outbound:
      - All to 0.0.0.0/0 (all traffic)
  
  ECS Task Security Group (ordo-app-sg):
    Inbound:
      - 8080 (HTTP) from ALB security group
    Outbound:
      - 5432 (PostgreSQL) to RDS security group
      - 6379 (Redis) to ElastiCache security group
      - 443 to 0.0.0.0/0 (external APIs: OpenAI, etc.)
  
  RDS Security Group (ordo-rds-sg):
    Inbound:
      - 5432 (PostgreSQL) from ECS task security group
    Outbound:
      - None (database doesn't initiate connections)
  
  ElastiCache Security Group (ordo-redis-sg):
    Inbound:
      - 6379 (Redis) from ECS task security group
    Outbound:
      - None
```

### 16.2 Data Protection

```
At Rest:
  RDS: AWS-managed encryption (AES-256)
  ElastiCache: AWS-managed encryption
  S3: AES-256 (default), or KMS for sensitive buckets
  Backups: KMS customer-managed key (audit trail)
  
In Transit:
  ALB → ECS: HTTP (private AWS network, no TLS needed)
  Client → ALB: HTTPS/TLS 1.2+ (CloudFlare + ACM)
  ECS → RDS: RDS IAM authentication (no password in connection string)
  ECS → Redis: AUTH command (password from Secrets Manager)
  ECS → S3: SigV4 (AWS SDK handles signing)

Key Management:
  Application secrets: AWS Secrets Manager (rotation every 90 days)
  Database encryption key: AWS KMS (customer-managed)
  TLS certificates: ACM (auto-renewed)
```

### 16.3 Access Control

```
IAM Roles:

ECS Task Execution Role (ordo-ecs-task-execution-role):
  Permissions:
    - ecr:GetAuthorizationToken (pull image from ECR)
    - logs:CreateLogGroup, CreateLogStream, PutLogEvents (CloudWatch Logs)
    - secretsmanager:GetSecretValue (read Secrets Manager)

ECS Task Role (ordo-ecs-task-role):
  Permissions:
    - s3:GetObject, PutObject, DeleteObject (S3 access)
    - secretsmanager:GetSecretValue (read secrets at runtime)
    - logs:PutLogEvents (if logging directly)

RDS Access:
  IAM Database Authentication:
    - App doesn't store DB password
    - Generates temporary token via IAM role
    - Token valid for 15 minutes
    - Requires RDS parameter: rds_iam_auth = 1

Root Account:
  - MFA required (hardware key)
  - No long-lived access keys
  - Only for billing + account setup
  - Users should use assumed roles, not root
```

### 16.4 Compliance & Auditing

```
CloudTrail (API Logging):
  Enabled: yes
  Logs to S3: ordo-cloudtrail-logs-prod
  Retention: 7 years (compliance requirement)
  Monitored events:
    - IAM role assumption
    - RDS modifications
    - S3 bucket policy changes
    - Secrets Manager access
    - VPC network changes

VPC Flow Logs:
  Enabled: yes (troubleshooting network issues)
  Destination: CloudWatch Logs
  Retention: 30 days

Compliance Checklist:
  ✓ GDPR: data encryption, right to delete, data portability
  ✓ CCPA: do-not-sell mechanisms, data inventory
  ✓ SOC 2: audit logs, access controls, encryption
  ✓ PCI-DSS (if accepting payments): see Stripe compliance

Security Assessment:
  - Quarterly: penetration testing (3rd party)
  - Monthly: vulnerability scanning (AWS Inspector, Trivy)
  - Ongoing: security patches (OS, dependencies)
```

---

## 17. Summary & Checklist

### 17.1 Pre-Production Deployment

```
Infrastructure:
  ☐ AWS account created (production AWS org)
  ☐ Billing alerts set up (Budget alerts)
  ☐ VPC created with public/private subnets
  ☐ RDS PostgreSQL 16 instance launched (Multi-AZ)
  ☐ ElastiCache Redis 7 cluster created (with replica)
  ☐ S3 buckets created (uploads, media, exports, backups)
  ☐ ALB created with health check + target group
  ☐ ECS cluster + task definition created
  ☐ CloudFront distribution configured
  ☐ Route53 DNS records configured
  ☐ ACM certificate created (*.ordocreator.com)

Security:
  ☐ IAM roles created (task execution, task, RDS)
  ☐ Security groups configured (ALB, ECS, RDS, Redis)
  ☐ Secrets Manager secrets created (all keys/passwords)
  ☐ VPC Flow Logs enabled
  ☐ CloudTrail enabled
  ☐ S3 bucket encryption enabled (KMS)
  ☐ MFA enabled on root account

Application:
  ☐ Dockerfile built and tested locally
  ☐ ECR repository created
  ☐ Migrations tested (up + down)
  ☐ Environment variables documented
  ☐ Health check endpoint implemented (/health)
  ☐ Graceful shutdown handler implemented (SIGTERM)
  ☐ Structured logging configured (JSON format)

CI/CD:
  ☐ GitHub repository created
  ☐ Branch protection rules enabled (main)
  ☐ GitHub Actions workflows configured
  ☐ AWS credentials configured (OIDC role)
  ☐ ECR login configured
  ☐ Slack notifications configured

Monitoring:
  ☐ CloudWatch log group created
  ☐ CloudWatch alarms created (critical paths)
  ☐ CloudWatch dashboard created
  ☐ SNS topics created (for alerts)
  ☐ On-call rotation configured

Backups & DR:
  ☐ RDS automated backups enabled (7-day retention)
  ☐ RDS Multi-AZ enabled
  ☐ ElastiCache snapshots enabled
  ☐ S3 cross-region replication enabled
  ☐ PITR tested (restore test in staging)
  ☐ Disaster recovery runbook documented
```

### 17.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION STACK                         │
├─────────────────────────────────────────────────────────────┤
│  Compute:   ECS Fargate (2-10 tasks, 1vCPU, 2GB RAM)       │
│  Database:  RDS PostgreSQL 16 (db.r6g.large, Multi-AZ)    │
│  Cache:     ElastiCache Redis 7 (cache.r6g.large, +replica)│
│  Storage:   S3 (4 buckets: uploads, media, exports, backups)│
│  CDN:       CloudFront (S3 origin, +S3 origin shield)      │
│  Gateway:   ALB (us-east-1, health check /health)          │
│  DNS:       Route53 + CloudFlare (global)                  │
│  Secrets:   AWS Secrets Manager (auto-rotation 90d)        │
│  Logs:      CloudWatch Logs (30d retention, JSON format)   │
│  Monitoring: CloudWatch Metrics + Alarms + Dashboard       │
│  CI/CD:     GitHub Actions (PR checks, auto-staging, manual prod)│
│  Backups:   RDS (7d), ElastiCache (5d), S3 cross-region   │
└─────────────────────────────────────────────────────────────┘

Scaling:
  Phase 1 (0-1K users):     $85-150/mo
  Phase 2 (1K-10K users):   $400-600/mo
  Phase 3 (10K-100K users): $2,500-4,000/mo

Resilience:
  RTO: 1-2 min (tasks), 2-5 min (DB), 15-30 min (corruption)
  RPO: < 1 min (PITR), < 15 min (cross-region S3)
  HA: Multi-AZ RDS, replicated Redis, multi-region S3
```

---

**Next Steps:**
1. Review this spec with DevOps team
2. Begin AWS account setup (Phase 1)
3. Configure CI/CD pipelines
4. Deploy to staging environment
5. Run load tests & chaos engineering
6. Document runbooks & on-call procedures
7. Schedule disaster recovery drill
