pipeline {
    agent any

    environment {
        DOTNET_VERSION = '8.0'
        DOCKER_REGISTRY = 'microservices-demo'
        K8S_NAMESPACE = 'microservices-demo'
        CYPRESS_CACHE_FOLDER = "${WORKSPACE}/.cypress-cache"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        ansiColor('xterm')
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log --oneline -5'
            }
        }

        stage('Restore & Build') {
            steps {
                sh '''
                    echo "=== Restoring Dependencies ==="
                    dotnet restore MicroservicesDemo.sln

                    echo "=== Building Solution ==="
                    dotnet build MicroservicesDemo.sln --configuration Release --no-restore
                '''
            }
        }

        stage('Unit Tests') {
            steps {
                sh '''
                    echo "=== Running Unit Tests ==="
                    dotnet test MicroservicesDemo.sln \
                        --configuration Release \
                        --no-build \
                        --logger "trx;LogFileName=test-results.trx" \
                        --results-directory ./TestResults \
                        || true
                '''
            }
            post {
                always {
                    junit testResults: '**/TestResults/*.trx', allowEmptyResults: true
                }
            }
        }

        stage('Docker Build') {
            parallel {
                stage('Build API Gateway') {
                    steps {
                        sh '''
                            docker build \
                                -t ${DOCKER_REGISTRY}/apigateway:${BUILD_NUMBER} \
                                -t ${DOCKER_REGISTRY}/apigateway:latest \
                                -f src/ApiGateway/Dockerfile .
                        '''
                    }
                }
                stage('Build User Service') {
                    steps {
                        sh '''
                            docker build \
                                -t ${DOCKER_REGISTRY}/userservice:${BUILD_NUMBER} \
                                -t ${DOCKER_REGISTRY}/userservice:latest \
                                -f src/Services/UserService/Dockerfile .
                        '''
                    }
                }
                stage('Build Product Service') {
                    steps {
                        sh '''
                            docker build \
                                -t ${DOCKER_REGISTRY}/productservice:${BUILD_NUMBER} \
                                -t ${DOCKER_REGISTRY}/productservice:latest \
                                -f src/Services/ProductService/Dockerfile .
                        '''
                    }
                }
            }
        }

        stage('Deploy to Test Environment') {
            steps {
                sh '''
                    echo "=== Deploying to Test K8s Namespace ==="

                    # Create/update test namespace
                    kubectl create namespace ${K8S_NAMESPACE}-test --dry-run=client -o yaml | kubectl apply -f -

                    # Apply K8s manifests to test namespace
                    kubectl apply -f k8s/configmaps/ -n ${K8S_NAMESPACE}-test
                    kubectl apply -f k8s/secrets/ -n ${K8S_NAMESPACE}-test
                    kubectl apply -f k8s/storage/ -n ${K8S_NAMESPACE}-test || true

                    # Update deployment images to use build number
                    for service in apigateway userservice productservice; do
                        sed "s|image: microservices-demo/${service}:latest|image: microservices-demo/${service}:${BUILD_NUMBER}|g" \
                            k8s/deployments/${service}-deployment.yaml | kubectl apply -n ${K8S_NAMESPACE}-test -f -
                    done

                    kubectl apply -f k8s/deployments/postgres-deployment.yaml -n ${K8S_NAMESPACE}-test
                    kubectl apply -f k8s/services/ -n ${K8S_NAMESPACE}-test

                    # Wait for deployments to be ready
                    echo "Waiting for PostgreSQL..."
                    kubectl rollout status deployment/postgres -n ${K8S_NAMESPACE}-test --timeout=120s || true

                    echo "Waiting for services..."
                    kubectl rollout status deployment/userservice -n ${K8S_NAMESPACE}-test --timeout=120s || true
                    kubectl rollout status deployment/productservice -n ${K8S_NAMESPACE}-test --timeout=120s || true
                    kubectl rollout status deployment/apigateway -n ${K8S_NAMESPACE}-test --timeout=120s || true
                '''
            }
        }

        stage('E2E Tests (Cypress)') {
            steps {
                dir('cypress') {
                    sh '''
                        echo "=== Installing Cypress Dependencies ==="
                        npm ci

                        echo "=== Running Cypress E2E Tests ==="

                        # Get the API Gateway service URL
                        API_URL="http://$(kubectl get svc apigateway-service -n ${K8S_NAMESPACE}-test -o jsonpath='{.spec.clusterIP}'):5000"

                        npx cypress run \
                            --config baseUrl=${API_URL} \
                            --reporter junit \
                            --reporter-options "mochaFile=results/cypress-results-[hash].xml" \
                            || true
                    '''
                }
            }
            post {
                always {
                    junit testResults: 'cypress/results/*.xml', allowEmptyResults: true
                    archiveArtifacts artifacts: 'cypress/screenshots/**/*', allowEmptyArchive: true
                    archiveArtifacts artifacts: 'cypress/videos/**/*', allowEmptyArchive: true
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to Production?', ok: 'Deploy'
                sh '''
                    echo "=== Deploying to Production K8s Namespace ==="

                    # Apply K8s manifests to production namespace
                    kubectl apply -f k8s/namespace.yaml
                    kubectl apply -f k8s/configmaps/ -n ${K8S_NAMESPACE}
                    kubectl apply -f k8s/secrets/ -n ${K8S_NAMESPACE}
                    kubectl apply -f k8s/storage/ -n ${K8S_NAMESPACE} || true
                    kubectl apply -f k8s/deployments/ -n ${K8S_NAMESPACE}
                    kubectl apply -f k8s/services/ -n ${K8S_NAMESPACE}
                    kubectl apply -f k8s/ingress/ -n ${K8S_NAMESPACE}

                    # Wait for deployments
                    kubectl rollout status deployment/apigateway -n ${K8S_NAMESPACE} --timeout=180s
                    kubectl rollout status deployment/userservice -n ${K8S_NAMESPACE} --timeout=180s
                    kubectl rollout status deployment/productservice -n ${K8S_NAMESPACE} --timeout=180s
                '''
            }
        }

        stage('Cleanup Test Environment') {
            steps {
                sh '''
                    echo "=== Cleaning up Test Environment ==="
                    kubectl delete namespace ${K8S_NAMESPACE}-test --ignore-not-found=true || true
                '''
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
        always {
            cleanWs()
        }
    }
}
