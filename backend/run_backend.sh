#!/bin/bash

# Navigate to backend directory if not already there
cd "$(dirname "$0")"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment 'venv' not found in $(pwd)"
    exit 1
fi

# Activate venv and run uvicorn
echo "🚀 Launching Luminary Backend in Virtual Environment..."
source venv/bin/activate
uvicorn main:app --reload
