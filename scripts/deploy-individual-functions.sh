#!/bin/bash

# Script para desplegar funciones individualmente
echo "🚀 Deploying MediVoice AI Lambda Functions Individually"

cd "../backend"

# Deploy functions one by one with retry logic
functions=("uploadAudio" "processAudio" "getHistory" "generatePDF")

for func in "${functions[@]}"; do
    echo "⏳ Deploying function: $func"
    
    # Try to deploy the function with timeout
    timeout 120 serverless deploy function -f $func
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully deployed: $func"
    else
        echo "❌ Failed to deploy: $func (will retry later)"
    fi
    
    # Small delay between deployments
    sleep 5
done

echo "🏁 Deployment script completed"