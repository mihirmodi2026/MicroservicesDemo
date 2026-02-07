#!/bin/bash
set -e

echo "=== MicroservicesDemo Kubernetes Deployment ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}kubectl not found. Please install kubectl first.${NC}"
    exit 1
fi

# Check if Docker Desktop Kubernetes is running
echo -e "${YELLOW}Checking Kubernetes cluster...${NC}"
kubectl cluster-info &> /dev/null || {
    echo -e "${RED}Kubernetes cluster is not running.${NC}"
    echo "Please enable Kubernetes in Docker Desktop:"
    echo "1. Open Docker Desktop"
    echo "2. Go to Settings > Kubernetes"
    echo "3. Check 'Enable Kubernetes'"
    echo "4. Click 'Apply & Restart'"
    exit 1
}

echo -e "${GREEN}Kubernetes cluster is running!${NC}"
echo ""

# Switch to docker-desktop context
echo -e "${YELLOW}Switching to docker-desktop context...${NC}"
kubectl config use-context docker-desktop || {
    echo -e "${YELLOW}docker-desktop context not found, using current context${NC}"
}

# Create namespace
echo -e "${YELLOW}Creating namespace...${NC}"
kubectl apply -f k8s/namespace.yaml
echo -e "${GREEN}Namespace created!${NC}"
echo ""

# Apply configmaps
echo -e "${YELLOW}Applying configmaps...${NC}"
kubectl apply -f k8s/configmaps/
echo -e "${GREEN}ConfigMaps applied!${NC}"
echo ""

# Apply secrets
echo -e "${YELLOW}Applying secrets...${NC}"
kubectl apply -f k8s/secrets/
echo -e "${GREEN}Secrets applied!${NC}"
echo ""

# Apply storage
echo -e "${YELLOW}Creating persistent volumes...${NC}"
kubectl apply -f k8s/storage/
echo -e "${GREEN}Storage created!${NC}"
echo ""

# Build Docker images locally
echo -e "${YELLOW}Building Docker images...${NC}"
echo "Building API Gateway..."
docker build -t microservices-demo/apigateway:latest -f src/ApiGateway/Dockerfile .
echo "Building User Service..."
docker build -t microservices-demo/userservice:latest -f src/Services/UserService/Dockerfile .
echo "Building Product Service..."
docker build -t microservices-demo/productservice:latest -f src/Services/ProductService/Dockerfile .
echo -e "${GREEN}Docker images built!${NC}"
echo ""

# Deploy PostgreSQL first
echo -e "${YELLOW}Deploying PostgreSQL...${NC}"
kubectl apply -f k8s/deployments/postgres-deployment.yaml
kubectl apply -f k8s/services/postgres-service.yaml
echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n microservices-demo --timeout=120s || {
    echo -e "${YELLOW}PostgreSQL taking longer than expected, continuing...${NC}"
}
echo -e "${GREEN}PostgreSQL deployed!${NC}"
echo ""

# Deploy microservices
echo -e "${YELLOW}Deploying microservices...${NC}"
kubectl apply -f k8s/deployments/userservice-deployment.yaml
kubectl apply -f k8s/services/userservice-service.yaml

kubectl apply -f k8s/deployments/productservice-deployment.yaml
kubectl apply -f k8s/services/productservice-service.yaml

kubectl apply -f k8s/deployments/apigateway-deployment.yaml
kubectl apply -f k8s/services/apigateway-service.yaml
echo -e "${GREEN}Microservices deployed!${NC}"
echo ""

# Wait for all deployments
echo -e "${YELLOW}Waiting for all pods to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=userservice -n microservices-demo --timeout=120s || true
kubectl wait --for=condition=ready pod -l app=productservice -n microservices-demo --timeout=120s || true
kubectl wait --for=condition=ready pod -l app=apigateway -n microservices-demo --timeout=120s || true
echo ""

# Apply ingress (optional - requires NGINX Ingress Controller)
echo -e "${YELLOW}Applying ingress...${NC}"
kubectl apply -f k8s/ingress/ || {
    echo -e "${YELLOW}Ingress not applied (NGINX Ingress Controller may not be installed)${NC}"
    echo "To install: kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml"
}
echo ""

# Show status
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Pods:"
kubectl get pods -n microservices-demo
echo ""
echo "Services:"
kubectl get services -n microservices-demo
echo ""
echo -e "${GREEN}Access the application at:${NC}"
echo "  - NodePort: http://localhost:30000"
echo ""
echo -e "${YELLOW}Optional: Add to hosts file for ingress:${NC}"
echo "  127.0.0.1 microservices.local"
echo ""
