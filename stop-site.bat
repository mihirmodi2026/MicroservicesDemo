@echo off
echo ==========================================
echo   Microservices Demo - Stop Live Site
echo ==========================================
echo.

echo Stopping Cloudflare tunnel...
docker stop cloudflared 2>nul
echo Cloudflare tunnel stopped.
echo.

echo Site is now offline.
echo Kubernetes services are still running locally at http://localhost:30000
echo.
echo To restart, double-click start-site.bat
echo ==========================================
pause
