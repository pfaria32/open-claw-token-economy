#!/bin/bash
# Deploy Custom OpenClaw with Token Economy Hooks
# Run this from the HOST machine (not inside container)

set -e

echo "🚀 Custom OpenClaw Deployment Script"
echo "===================================="
echo ""

# Configuration
OPENCLAW_DIR="/home/pedro/openclaw"
FORK_DIR="${HOME}/openclaw/workspace/projects/openclaw"
WORKSPACE_DIR="${HOME}/openclaw/workspace"

# Step 1: Prepare plugins directory
echo "📦 Step 1: Preparing plugins..."
mkdir -p "${WORKSPACE_DIR}/plugins"
cp "${WORKSPACE_DIR}/projects/token-economy/plugins/model-routing-plugin.js" "${WORKSPACE_DIR}/plugins/"
cp "${WORKSPACE_DIR}/projects/token-economy/plugins/context-bundling-plugin.js" "${WORKSPACE_DIR}/plugins/"
echo "✓ Plugins copied to ${WORKSPACE_DIR}/plugins/"
echo ""

# Step 2: Build Docker image
echo "🐳 Step 2: Building custom Docker image..."
echo "This will take 5-10 minutes..."
cd "${FORK_DIR}"
docker build -f Dockerfile.custom -t openclaw-custom:token-economy .
echo "✓ Docker image built: openclaw-custom:token-economy"
echo ""

# Step 3: Deploy (side-by-side mode)
echo "🎯 Step 3: Deploying custom OpenClaw..."
echo "Deploying on port 3334 (parallel to existing OpenClaw on 3333)"
docker compose -f docker-compose.custom.yml up -d
echo "✓ Custom OpenClaw deployed"
echo ""

# Step 4: Wait for startup
echo "⏳ Step 4: Waiting for OpenClaw to start..."
sleep 10
echo ""

# Step 5: Check status
echo "📊 Step 5: Checking status..."
docker compose -f docker-compose.custom.yml ps
echo ""

# Step 6: Show next steps
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Install plugins:"
echo "   docker exec openclaw-custom node /app/dist/cli.js plugins install /home/node/.openclaw/workspace/plugins/model-routing-plugin.js"
echo "   docker exec openclaw-custom node /app/dist/cli.js plugins install /home/node/.openclaw/workspace/plugins/context-bundling-plugin.js"
echo ""
echo "2. Configure plugins (see DEPLOYMENT_GUIDE.md)"
echo ""
echo "3. Test heartbeat zero-token skip"
echo ""
echo "4. Monitor logs:"
echo "   docker compose -f ${FORK_DIR}/docker-compose.custom.yml logs -f"
echo ""
echo "📖 Full guide: ${WORKSPACE_DIR}/projects/token-economy/DEPLOYMENT_GUIDE.md"
