# Use Python 3.10 slim image as base
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Create a startup script directly in the container
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "Starting SentiScope setup process..."\n\
\n\
# Wait for PostgreSQL to be ready\n\
echo "Waiting for PostgreSQL to be ready..."\n\
python3 -c "\n\
import psycopg2\n\
import os\n\
import time\n\
import sys\n\
from urllib.parse import urlparse\n\
\n\
DATABASE_URL = os.getenv('\''DATABASE_URL'\'')\n\
if not DATABASE_URL:\n\
    sys.exit('\''DATABASE_URL is not set in environment'\'')\n\
\n\
parsed_url = urlparse(DATABASE_URL)\n\
DB_USER = parsed_url.username\n\
DB_PASS = parsed_url.password\n\
DB_HOST = parsed_url.hostname\n\
DB_PORT = parsed_url.port or 5432\n\
\n\
max_retries = 60\n\
retry_interval = 2\n\
retries = 0\n\
\n\
while retries < max_retries:\n\
    try:\n\
        print(f'\''Attempting to connect to PostgreSQL (attempt {retries+1}/{max_retries})...'\'')\n\
        conn = psycopg2.connect(\n\
            dbname='\''postgres'\'',\n\
            user=DB_USER,\n\
            password=DB_PASS,\n\
            host=DB_HOST,\n\
            port=DB_PORT,\n\
            connect_timeout=5\n\
        )\n\
        conn.close()\n\
        print('\''Successfully connected to PostgreSQL!'\'')\n\
        sys.exit(0)\n\
    except psycopg2.OperationalError as e:\n\
        retries += 1\n\
        if retries >= max_retries:\n\
            sys.exit(f'\''Failed to connect to PostgreSQL after {max_retries} attempts: {e}'\'')\n\
        print(f'\''Connection failed. Retrying in {retry_interval} seconds...'\'')\n\
        time.sleep(retry_interval)\n\
"\n\
\n\
# Wait for Ollama to be ready\n\
echo "Waiting for Ollama to be ready..."\n\
max_retries=30\n\
retry_interval=5\n\
for i in $(seq 1 $max_retries); do\n\
    if curl -s http://ollama:11434/api/tags >/dev/null 2>&1; then\n\
        echo "Ollama is ready!"\n\
        break\n\
    fi\n\
    echo "Ollama not ready yet (attempt $i/$max_retries). Waiting ${retry_interval}s..."\n\
    sleep $retry_interval\n\
    if [ $i -eq $max_retries ]; then\n\
        echo "Warning: Ollama may not be ready, but continuing anyway..."\n\
    fi\n\
done\n\
\n\
# Start Flask application\n\
echo "Starting Flask application..."\n\
cd /app\n\
python3 backend/app.py\n\
' > /usr/local/bin/start.sh && chmod +x /usr/local/bin/start.sh

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables
ENV FLASK_APP=backend/app.py
ENV PYTHONPATH=/app

# Use the start script as the entrypoint
CMD ["/usr/local/bin/start.sh"]