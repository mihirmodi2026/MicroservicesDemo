# Microservices Demo

.NET 8 microservices architecture with API Gateway, Kubernetes, Jenkins CI/CD, Cypress E2E testing, and Cloudflare deployment.

**Live Site:** https://api.microservicedemo.org

## Architecture

```
Internet → Cloudflare Tunnel → API Gateway (YARP) → User Service    → PostgreSQL (userdb)
                                                   → Product Service → PostgreSQL (productdb)
```

## Tech Stack (All Free)

| Technology | Purpose |
|-----------|---------|
| .NET 8 | Microservices framework |
| YARP | Reverse proxy / API Gateway |
| Entity Framework Core 8 | ORM |
| PostgreSQL 16 | Database |
| Docker & Docker Compose | Containerization |
| Kubernetes (Docker Desktop) | Container orchestration |
| Jenkins | CI/CD pipelines |
| Cypress 14 | E2E testing (29 tests) |
| Cloudflare Tunnel + CDN | Public deployment |
| GitHub Actions | Backup CI |

## Quick Start

### Prerequisites
- Docker Desktop (with Kubernetes enabled)
- .NET 8 SDK (for local development)

### Option 1: Docker Compose

```bash
# Start all services
docker-compose up --build -d

# Access at http://localhost:5000
```

### Option 2: Kubernetes

```bash
# Deploy to K8s
./scripts/deploy-k8s.sh

# Access at http://localhost:30000
```

## Services

| Service | Local (Docker) | K8s NodePort | Live |
|---------|---------------|--------------|------|
| API Gateway | http://localhost:5000 | http://localhost:30000 | https://api.microservicedemo.org |
| User Service | http://localhost:5001 | ClusterIP only | via Gateway |
| Product Service | http://localhost:5002 | ClusterIP only | via Gateway |
| PostgreSQL | localhost:5432 | ClusterIP only | Internal |
| pgAdmin | http://localhost:5050 | - | - |
| Jenkins | http://localhost:8080 | - | - |

## API Endpoints

### Authentication
```
POST   /api/users/register          # Register new user (first user becomes Admin)
POST   /api/users/login             # Login
POST   /api/users/verify-email      # Verify email with token
POST   /api/users/resend-verification
POST   /api/users/forgot-password
POST   /api/users/reset-password
```

### Users (requires permissions)
```
GET    /api/users                   # List all users (Admin)
GET    /api/users/{id}              # Get user by ID
PUT    /api/users/{id}              # Update user
PUT    /api/users/{id}/permissions  # Update permissions (Admin)
DELETE /api/users/{id}              # Delete user
```

### Products (requires permissions)
```
GET    /api/products                # List all products
GET    /api/products/{id}           # Get product by ID
GET    /api/products/sku/{sku}      # Get product by SKU
POST   /api/products                # Create product
PUT    /api/products/{id}           # Update product
DELETE /api/products/{id}           # Delete product
PATCH  /api/products/{id}/stock     # Update stock quantity
```

## CI/CD Pipelines (Jenkins)

### Dev + Test Pipeline (`Jenkinsfile.dev`)
```
Checkout → Build .NET → Unit Tests → Docker Build (parallel) → Deploy to K8s Dev → Cypress E2E Tests
```
- Deploys to `microservices-dev` namespace (NodePort 30100)
- Runs all 29 Cypress E2E tests automatically

### Production Pipeline (`Jenkinsfile.prod`)
```
Validate → Tag Images → Manual Approval → Deploy to K8s Prod → Smoke Test
```
- Promotes a dev build to production
- Requires manual approval before deployment
- Deploys to `microservices-prod` namespace (NodePort 30200)
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

### Run Cypress
```bash
# Run in Docker (recommended - Windows 11 24H2 compatibility)
docker run --rm -v "%cd%/cypress:/e2e" --workdir //e2e --network host cypress/included:14.3.3

# Videos saved to cypress/videos/
```

## Kubernetes Architecture

```
Namespace: microservices-demo
├── ConfigMaps (postgres-config, userservice-config, productservice-config)
├── Secrets (postgres-secret, smtp-secret)
├── PersistentVolume (5Gi for PostgreSQL)
├── Deployments
│   ├── postgres (1 replica)
│   ├── apigateway (1 replica)
│   ├── userservice (1 replica)
│   └── productservice (1 replica)
├── Services
│   ├── postgres-service (ClusterIP)
│   ├── apigateway-service (NodePort 30000)
│   ├── userservice-service (ClusterIP)
│   └── productservice-service (ClusterIP)
└── Ingress (nginx, microservices.local)
```

## Project Structure

```
MicroservicesDemo/
├── src/
│   ├── ApiGateway/              # YARP reverse proxy
│   ├── Services/
│   │   ├── UserService/         # User CRUD + Auth + Email verification
│   │   └── ProductService/      # Product CRUD API
│   └── Shared/                  # Common DTOs
├── k8s/                         # Kubernetes manifests
│   ├── configmaps/
│   ├── secrets/
│   ├── storage/
│   ├── deployments/
│   ├── services/
│   └── ingress/
├── jenkins/                     # Jenkins Docker setup
│   ├── Dockerfile               # Jenkins + Docker CLI + kubectl + .NET 8 + Node.js 20
│   ├── plugins.txt
│   └── docker-compose.jenkins.yml
├── cypress/                     # Cypress E2E tests
│   ├── e2e/
│   │   ├── auth/                # Authentication tests
│   │   └── products/            # Product CRUD tests
│   ├── fixtures/
│   ├── support/
│   └── cypress.config.js
├── cloudflare/                  # Tunnel config
├── scripts/                     # Deployment scripts
├── Jenkinsfile.dev              # Dev + Test pipeline
├── Jenkinsfile.prod             # Production pipeline
├── docker-compose.yml           # Docker Compose orchestration
└── MicroservicesDemo.sln        # .NET solution
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
# Restore packages
dotnet restore

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
