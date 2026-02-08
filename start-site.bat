@echo off
echo ==========================================
echo   Microservices Demo - Start Live Site
echo ==========================================
echo.

echo Checking Kubernetes pods...
kubectl get pods -n microservices-demo
echo.

echo Starting Cloudflare tunnel...
docker start cloudflared 2>nul
echo.

echo Starting port-forward (5000 → API Gateway)...
echo Keep this window open! Closing it will stop the live site.
echo.
echo Site will be live at: https://api.microservicedemo.org
echo Press Ctrl+C to stop.
echo ==========================================
kubectl port-forward svc/apigateway-service 5000:5000 -n microservices-demo --address 0.0.0.0
