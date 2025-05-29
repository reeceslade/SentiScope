#!/bin/bash
set -e

echo "Starting SentiScope setup process..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
python3 -c "
import psycopg2
import os
import time
import sys
from urllib.parse import urlparse

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    sys.exit('DATABASE_URL is not set in environment')

parsed_url = urlparse(DATABASE_URL)
DB_USER = parsed_url.username
DB_PASS = parsed_url.password
DB_HOST = parsed_url.hostname
DB_PORT = parsed_url.port or 5432

max_retries = 60
retry_interval = 2
retries = 0

while retries < max_retries:
    try:
        print(f'Attempting to connect to PostgreSQL (attempt {retries+1}/{max_retries})...')
        conn = psycopg2.connect(
            dbname='postgres',
            user=DB_USER,
            password=DB_PASS,
            host=DB_HOST,
            port=DB_PORT,
            connect_timeout=5
        )
        conn.close()
        print('Successfully connected to PostgreSQL!')
        sys.exit(0)
    except psycopg2.OperationalError as e:
        retries += 1
        if retries >= max_retries:
            sys.exit(f'Failed to connect to PostgreSQL after {max_retries} attempts: {e}')
        print(f'Connection failed. Retrying in {retry_interval} seconds...')
        time.sleep(retry_interval)
"

# Wait for Ollama to be ready
echo "Waiting for Ollama to be ready..."
max_retries=30
retry_interval=5
for i in $(seq 1 $max_retries); do
    if curl -s http://ollama:11434/api/tags >/dev/null 2>&1; then
        echo "Ollama is ready!"
        break
    fi
    echo "Ollama not ready yet (attempt $i/$max_retries). Waiting ${retry_interval}s..."
    sleep $retry_interval
    if [ $i -eq $max_retries ]; then
        echo "Warning: Ollama may not be ready, but continuing anyway..."
    fi
done

# Check for and pull Ollama models
echo "Checking for Ollama models..."
MODELS=("gemma3:2b" "qwen2.5:1.5b" "deepseek-r1:1.5b")
for model in "${MODELS[@]}"; do
    echo "Checking for model: $model"
    if ! curl -s "http://ollama:11434/api/show" -d "{\"name\":\"$model\"}" | grep -q "model"; then
        echo "Model $model not found. Pulling..."
        curl -s "http://ollama:11434/api/pull" -d "{\"name\":\"$model\"}" &
    else
        echo "Model $model already exists"
    fi
done

# Wait for any background model pulls to complete
wait

# Start Flask application
echo "Starting Flask application..."
cd /app
python3 backend/app.py