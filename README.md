# Microservices Demo

.NET 8 microservices architecture with API Gateway, PostgreSQL, Docker, and Cloudflare deployment.

## Architecture

```
Cloudflare Tunnel → API Gateway (YARP) → User Service
                                      → Product Service
                                      ↓
                                   PostgreSQL
```

## Quick Start

### Prerequisites
- Docker Desktop
- .NET 8 SDK (for local development)

### Run with Docker

```bash
# Start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### Access Services

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:5000 |
| User Service | http://localhost:5001 |
| Product Service | http://localhost:5002 |
| PostgreSQL | localhost:5432 |

### API Endpoints

**Users** (via Gateway)
```bash
GET    http://localhost:5000/api/users
GET    http://localhost:5000/api/users/{id}
POST   http://localhost:5000/api/users
PUT    http://localhost:5000/api/users/{id}
DELETE http://localhost:5000/api/users/{id}
```

**Products** (via Gateway)
```bash
GET    http://localhost:5000/api/products
GET    http://localhost:5000/api/products/{id}
GET    http://localhost:5000/api/products/sku/{sku}
POST   http://localhost:5000/api/products
PUT    http://localhost:5000/api/products/{id}
DELETE http://localhost:5000/api/products/{id}
PATCH  http://localhost:5000/api/products/{id}/stock
```

## Example Requests

### Create a User
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","firstName":"John","lastName":"Doe"}'
```

### Create a Product
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget","description":"A useful widget","price":29.99,"sku":"WDG-001","stockQuantity":100,"category":"Electronics"}'
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

## Deploy to Production

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/microservices-demo.git
git push -u origin main
```

### 2. Configure GitHub Secrets
- `DEPLOY_HOST`: Your server IP
- `DEPLOY_USER`: SSH username
- `DEPLOY_SSH_KEY`: Private SSH key

### 3. Setup Cloudflare Tunnel
See [cloudflare/SETUP.md](cloudflare/SETUP.md)

## Project Structure

```
MicroservicesDemo/
├── src/
│   ├── ApiGateway/          # YARP reverse proxy
│   ├── Services/
│   │   ├── UserService/     # User CRUD API
│   │   └── ProductService/  # Product CRUD API
│   └── Shared/              # Common DTOs
├── cloudflare/              # Tunnel config
├── .github/workflows/       # CI/CD pipelines
└── docker-compose.yml       # Container orchestration
```

## Tech Stack (All Free)

- .NET 8 (MIT License)
- YARP Reverse Proxy
- Entity Framework Core 8
- PostgreSQL 16
- Docker
- GitHub Actions
- Cloudflare Tunnel
