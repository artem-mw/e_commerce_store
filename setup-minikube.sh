#!/bin/bash
set -e

echo "Checking Minikube status..."
if [[ $(minikube status --format='{{.Host}}') != "Running" ]]; then
    echo "Minikube is not running. Starting minikube..."
    minikube start
fi

echo "Connecting to Minikube Docker env..."
if ! eval "$(minikube docker-env)"; then
    echo "Error: Failed to connect to Minikube Docker environment."
    echo "Make sure minikube is running: 'minikube start'"
    exit 1
fi

FRONTEND_ENV="./frontend/.env"

APP_NAME=$(grep VITE_APP_NAME $FRONTEND_ENV | cut -d '=' -f2 | tr -d '"')
if [ -z "$APP_NAME" ]; then
    echo "Error: VITE_APP_NAME not found in $FRONTEND_ENV"
    exit 1
fi

STRIPE_KEY=$(grep VITE_STRIPE_PUBLISHABLE_KEY $FRONTEND_ENV | cut -d '=' -f2 | tr -d '"')
if [ -z "$STRIPE_KEY" ]; then
    echo "Error: VITE_STRIPE_PUBLISHABLE_KEY not found in $FRONTEND_ENV"
    exit 1
fi

MINIKUBE_IP=$(minikube ip)
FRONTEND_URL="http://$MINIKUBE_IP:30000"
API_URL="http://$MINIKUBE_IP:30001/api"

echo "Building Backend Image..."
docker build -t e-commerce-backend:latest --target production ./backend

echo "Building Frontend Image..."
docker build -t e-commerce-frontend:latest \
  --build-arg VITE_APP_NAME="$APP_NAME" \
  --build-arg VITE_APP_API_URL="$API_URL" \
  --build-arg VITE_STRIPE_PUBLISHABLE_KEY="$STRIPE_KEY" \
  ./frontend

echo "Preparing environment for Kustomize..."
cp ./backend/.env k8s/overlays/local/backend.env
trap 'rm -f k8s/overlays/local/backend.env' EXIT

echo "Deploying via Kustomize (Local)..."
kubectl apply -k k8s/overlays/local/

echo "Waiting for deployment to be created..."
until kubectl get deployment/backend-deployment >/dev/null 2>&1; do
  echo "Still waiting for backend-deployment..."
  sleep 1
done

echo "Forcing production overrides..."
kubectl set env deployment/backend-deployment \
  PRODUCTION_CLIENT_URL="$FRONTEND_URL"

kubectl rollout restart deployment/backend-deployment
kubectl rollout restart deployment/frontend-deployment

kubectl rollout status deployment/backend-deployment
kubectl rollout status deployment/frontend-deployment

echo "Deployment Complete!"
echo "-------------------------------------------------------"
echo "Frontend: http://$MINIKUBE_IP:30000"
echo "Backend:  $API_URL"
echo "-------------------------------------------------------"
echo "Check pods status:    kubectl get pods"
echo "Check backend logs:   kubectl logs -l app=backend -f"
echo "-------------------------------------------------------"