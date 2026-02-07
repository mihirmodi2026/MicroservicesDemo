// ============================================================
//  MicroservicesDemo - Main Jenkinsfile (Reference)
// ============================================================
//  This project uses TWO separate pipelines:
//
//  1. Jenkinsfile.dev  → Dev + Test Pipeline
//     - Build .NET solution & run unit tests
//     - Build Docker images (tagged dev-<BUILD>)
//     - Deploy to K8s namespace: microservices-dev
//     - Run Cypress E2E tests
//     - Dev API: http://localhost:30100
//
//  2. Jenkinsfile.prod → Production Pipeline
//     - Promote a tested dev build to production
//     - Manual approval gate
//     - Deploy to K8s namespace: microservices-prod
//     - Run smoke tests
//     - Prod API: http://localhost:30000
//
//  Jenkins Setup:
//    Create two Pipeline jobs in Jenkins:
//    - Job: "MicroservicesDemo-Dev"   → Script Path: Jenkinsfile.dev
//    - Job: "MicroservicesDemo-Prod"  → Script Path: Jenkinsfile.prod
// ============================================================

pipeline {
    agent any

    stages {
        stage('Info') {
            steps {
                echo '''
                ==========================================
                  Use the dedicated pipeline jobs:

                  1. MicroservicesDemo-Dev
                     (Jenkinsfile.dev)

                  2. MicroservicesDemo-Prod
                     (Jenkinsfile.prod)
                ==========================================
                '''
            }
        }
    }
}
