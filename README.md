# Microservices Demo

.NET 8 microservices architecture with separated UI, API Gateway, Kubernetes, Jenkins CI/CD, Cypress E2E testing, and Cloudflare deployment.

**Live Site:** https://api.microservicedemo.org

## Architecture

```
Browser → API Gateway (YARP, port 5000)
             ├── /api/auth/*      → User Service (port 5001)  → PostgreSQL (userdb)
             ├── /api/users/*     → User Service (port 5001)  → PostgreSQL (userdb)
             ├── /api/products/*  → Product Service (port 5002) → PostgreSQL (productdb)
             └── /* (catch-all)   → UI / Nginx (port 8080)
```

Each service is an **independent solution** that can be built and deployed separately.

## Tech Stack (All Free)

| Technology | Purpose |
|-----------|---------|
| .NET 8 | Microservices framework |
| YARP | Reverse proxy / API Gateway |
| Nginx | UI static file server |
| Entity Framework Core 8 | ORM |
| PostgreSQL 16 | Database |
| Docker & Docker Compose | Containerization |
| Kubernetes (Docker Desktop) | Container orchestration |
| Jenkins | CI/CD pipelines |
| Cypress 14 | E2E testing (29 tests) |
| Cloudflare Tunnel + CDN | Public deployment |

## Quick Start

### Prerequisites
- Docker Desktop (with Kubernetes enabled)
- .NET 8 SDK (for local development)

### Option 1: Docker Compose

```bash
# Start all services (API Gateway, User Service, Product Service, UI, PostgreSQL)
docker-compose up --build -d

# Access at http://localhost:5000
```

### Option 2: Kubernetes

```bash
# Deploy to K8s
./scripts/deploy-k8s.sh

# Access at http://localhost:30000
```

### Start/Stop Scripts (Windows)

```bash
start-site.bat    # Start K8s port-forward + Cloudflare tunnel
stop-site.bat     # Stop public access
```

## Services

| Service | Description | Local (Docker) | K8s NodePort | Live |
|---------|-------------|---------------|--------------|------|
| UI | Static HTML/JS/CSS (Nginx) | http://localhost:8080 | ClusterIP only | via Gateway |
| API Gateway | YARP reverse proxy | http://localhost:5000 | http://localhost:30000 | https://api.microservicedemo.org |
| User Service | Auth + Users + Email | http://localhost:5001 | ClusterIP only | via Gateway |
| Product Service | Products CRUD | http://localhost:5002 | ClusterIP only | via Gateway |
| PostgreSQL | Database | localhost:5432 | ClusterIP only | Internal |
| pgAdmin | DB management UI | http://localhost:5050 | - | - |
| Jenkins | CI/CD | http://localhost:8080 | - | - |

## Independent Solutions

Each service has its own `.sln` file and can be built independently:

```bash
# Build individual services
dotnet build src/ApiGateway/ApiGateway.sln
dotnet build src/Services/UserService/UserService.sln
dotnet build src/Services/ProductService/ProductService.sln

# Build all at once
dotnet build MicroservicesDemo.sln

# Build UI Docker image
docker build -f src/UI/Dockerfile src/UI
```

## API Endpoints

### Authentication
```
POST   /api/auth/register              # Register new user (first user becomes Admin)
POST   /api/auth/login                 # Login
POST   /api/auth/verify-email          # Verify email with token
POST   /api/auth/resend-verification
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Users (requires permissions)
```
GET    /api/users                      # List all users (Admin)
GET    /api/users/{id}                 # Get user by ID
PUT    /api/users/{id}                 # Update user
PUT    /api/users/{id}/permissions     # Update permissions (Admin)
DELETE /api/users/{id}                 # Delete user
```

### Products (requires permissions)
```
GET    /api/products                   # List all products
GET    /api/products/{id}              # Get product by ID
GET    /api/products/sku/{sku}         # Get product by SKU
POST   /api/products                   # Create product
PUT    /api/products/{id}              # Update product
DELETE /api/products/{id}              # Delete product
PATCH  /api/products/{id}/stock        # Update stock quantity
```

## CI/CD Pipelines (Jenkins)

### Dev + Test Pipeline (`Jenkinsfile.dev`)
```
Checkout → Build Solutions (parallel) → Unit Tests → Docker Build (parallel: 4 images) → Deploy to Dev → Cypress E2E
```
- Builds each solution independently in parallel
- Builds 4 Docker images: apigateway, userservice, productservice, ui
- Deploys to `microservices-dev` namespace (NodePort 30100)
- Runs all 29 Cypress E2E tests

### Production Pipeline (`Jenkinsfile.prod`)
```
Validate → Tag Images → Manual Approval → Deploy to Prod → Smoke Test
```
- Promotes a tested dev build to production
- Deploys all 4 services to `microservices-prod` namespace (NodePort 30200)
- Health check smoke test

### Start Jenkins
```bash
cd jenkins
docker-compose -f docker-compose.jenkins.yml up -d
# Access at http://localhost:8080
```

## Cypress E2E Tests (29 tests)

| Spec File | Tests | Description |
|-----------|-------|-------------|
| auth/registration.cy.js | 4 | User registration, first user admin, duplicates, validation |
| auth/login.cy.js | 3 | Login with unverified email, invalid credentials |
| auth/email-verification.cy.js | 3 | Invalid token, resend verification |
| auth/password-reset.cy.js | 3 | Forgot password flow, invalid reset token |
| auth/permissions.cy.js | 4 | Admin view users, regular user denied, update permissions |
| products/crud-operations.cy.js | 9 | Full CRUD, SKU lookup, duplicate SKU, stock update |
| products/product-search.cy.js | 3 | Search, filter by category, empty results |

Test emails are sent to real Gmail addresses using the + alias feature during CI/CD.

## Kubernetes Architecture

```
Namespace: microservices-demo (live, port 30000)
├── ConfigMaps (apigateway-config, userservice-config, productservice-config)
├── Secrets (postgres-secret, smtp-secret)
├── PersistentVolume (5Gi for PostgreSQL)
├── Deployments
│   ├── postgres (1 replica)
│   ├── apigateway (1 replica, YARP reverse proxy)
│   ├── userservice (1 replica)
│   ├── productservice (1 replica)
│   └── ui (1 replica, Nginx)
├── Services
│   ├── postgres-service (ClusterIP)
│   ├── apigateway-service (NodePort 30000)
│   ├── userservice-service (ClusterIP)
│   ├── productservice-service (ClusterIP)
│   └── ui-service (ClusterIP)
└── Ingress (nginx, microservices.local)

Namespace: microservices-dev (test, port 30100) — created by Jenkins Dev pipeline
Namespace: microservices-prod (prod, port 30200) — created by Jenkins Prod pipeline
```

## Project Structure

```
MicroservicesDemo/
├── MicroservicesDemo.sln              # Build-all convenience solution
├── src/
│   ├── ApiGateway/                    # YARP reverse proxy (routes to services + UI)
│   │   ├── ApiGateway.sln            # Independent solution
│   │   ├── Program.cs
│   │   ├── appsettings.json           # YARP route config
│   │   └── Dockerfile
│   ├── Services/
│   │   ├── UserService/               # User CRUD + Auth + Email verification
│   │   │   ├── UserService.sln        # Independent solution (+ Shared)
│   │   │   ├── Controllers/
│   │   │   ├── Models/
│   │   │   ├── Services/
│   │   │   └── Dockerfile
│   │   └── ProductService/            # Product CRUD API
│   │       ├── ProductService.sln     # Independent solution (+ Shared)
│   │       ├── Controllers/
│   │       ├── Models/
│   │       └── Dockerfile
│   ├── Shared/                        # Common DTOs (ApiResponse<T>)
│   └── UI/                            # Frontend (static HTML/JS/CSS)
│       ├── index.html                 # Single-page dashboard
│       ├── css/style.css
│       ├── js/app.js
│       ├── nginx.conf
│       └── Dockerfile                 # Nginx:alpine
├── k8s/                               # Kubernetes manifests
│   ├── configmaps/
│   ├── secrets/
│   ├── storage/
│   ├── deployments/                   # apigateway, userservice, productservice, ui, postgres
│   ├── services/
│   └── ingress/
├── jenkins/                           # Jenkins Docker setup
│   ├── Dockerfile                     # Jenkins + Docker CLI + kubectl + .NET 8 + Node.js 20 + Cypress deps
│   ├── plugins.txt
│   └── docker-compose.jenkins.yml
├── cypress/                           # Cypress E2E tests
│   ├── e2e/
│   │   ├── auth/                      # Authentication tests (17 tests)
│   │   └── products/                  # Product CRUD tests (12 tests)
│   ├── fixtures/
│   ├── support/
│   └── cypress.config.js
├── Jenkinsfile.dev                    # Dev + Test pipeline (build → test → deploy)
├── Jenkinsfile.prod                   # Production pipeline (promote → approve → deploy)
├── docker-compose.yml                 # Docker Compose (5 services + pgAdmin + Cloudflare)
├── start-site.bat                     # Start site script (Windows)
└── stop-site.bat                      # Stop site script (Windows)
```

## Cloudflare Deployment

The live site uses a Cloudflare Tunnel to expose the K8s API Gateway to the internet.

```bash
# Start Cloudflare tunnel
set CLOUDFLARE_TUNNEL_TOKEN=<your-token>
docker-compose --profile cloudflare up -d cloudflared

# Stop public access (local services keep running)
docker stop cloudflared
```

## Local Development

```bash
# Build individual service
dotnet build src/Services/UserService/UserService.sln

# Run individual services
cd src/Services/UserService && dotnet run
cd src/Services/ProductService && dotnet run
cd src/ApiGateway && dotnet run
```

## Database Access (pgAdmin)

```bash
# Start pgAdmin
docker-compose up -d pgadmin

# Access at http://localhost:5050
# Email: admin@admin.com | Password: admin123
# Database password: postgres123
```
