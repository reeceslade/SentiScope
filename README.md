# 🌐 SentiScope 🔭

**SentiScope** is a web-based application developed by **Reece Slade**, a final-year Software Engineering student at **Bournemouth University**, as part of his undergraduate dissertation.

In an era of overwhelming digital content, SentiScope helps users critically evaluate media by leveraging **Large Language Models (LLMs)** to detect **sentiment** and potential **political bias** in online news and video content.

Through a mix of **natural language processing**, **data visualization**, and **ethical technology**, SentiScope promotes **media literacy** and **critical thinking**.

## 🚀 Setup Options

SentiScope can be set up in two ways:
1. **Docker Setup** - Recommended for production or consistent development environments
2. **Local Development Setup** - For direct development without containers

## 📦 Docker Setup (Recommended)

### Prerequisites
- Docker and Docker Compose installed on your system
- Git (to clone the repository)
- Ensure Docker Desktop is running (run as administrator is recommended)

### Step-by-Step Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/reeceslade/SentiScope.git
cd SentiScope
```

#### 2. Create Environment File
```bash
# Copy the docker example file
cp .env.docker.example .env.docker
```

Edit `.env.docker` and insert your API keys:
- NEWS_API_KEY
- YOUTUBE_API_KEY
- Any other required environment variables

#### 3. Start the Application
```bash
# Ensure Docker and PostgreSQL are running
docker-compose up --build -d
```

#### 4. Pull Required AI Models
After the containers are running, pull any of the follwing Ollama models:
```bash
# Pull the working models (start with smaller ones first)
docker-compose exec ollama ollama pull gemma3:1b          # Gemma 3 (1B)
docker-compose exec ollama ollama pull gemma3:4b          # Gemma 3 (4B)
docker-compose exec ollama ollama pull gemma3:12b         # Gemma 3 (12B)
docker-compose exec ollama ollama pull deepseek-r1:7b     # DeepSeek R1 (7B)
docker-compose exec ollama ollama pull deepseek-r1:14b    # DeepSeek R1 (14B)
docker-compose exec ollama ollama pull qwen2.5:1.5b       # Qwen 2.5 (1.5B)
docker-compose exec ollama ollama pull qwen2.5:7b         # Qwen 2.5 (7B)
docker-compose exec ollama ollama pull qwen2.5:14b        # Qwen 2.5 (14B)

```

#### 5. Access the Application
- Open your browser and go to [http://localhost:5000](http://localhost:5000)
- Everything should be working!

#### 6. Check Container Status (Optional)
```bash
# Check if all containers are running properly
docker-compose ps
```

You should see something like:
```
SentiScope-db-1       postgres:14            Up (healthy)     0.0.0.0:5433->5432/tcp
SentiScope-ollama-1   ollama/ollama:latest   Up               0.0.0.0:11434->11434/tcp
SentiScope-web-1      SentiScope-web         Up               0.0.0.0:5000->5000/tcp
```

## 💻 Local Development Setup

### Prerequisites
- Python 3.10+
- PostgreSQL (ensure it's installed and running locally)
- Git
- Ollama

### Setup Instructions

#### 1. Install Required Software

- Download and install **Python 3.10+**:  
  https://www.python.org/downloads/

- Download and install **PostgreSQL**:  
  https://www.postgresql.org/download/

- Download and Install **Ollama**:
  https://ollama.com

#### 2. Clone the Repository
```bash
git clone https://github.com/reeceslade/SentiScope.git
cd SentiScope
```

#### 3. Set Up Python Virtual Environment

- **Windows (PowerShell):**
```bash
python -m venv venv
venv\Scripts\Activate.ps1
```

- **macOS/Linux:**
```bash
python -m venv venv
source venv/bin/activate
```

- **Windows (CMD):**
```bash
python -m venv venv
venv\Scripts\activate.bat
```

#### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 5. Set Up Environment Variables
```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your actual API credentials:
- NEWS_API_KEY
- YOUTUBE_API_KEY
- Database connection details if different from defaults

> ⚠️ You must use your own API and secret keys. For temporary access to mine for testing, email: **reecesladey@outlook.com**

#### 6. Configure PostgreSQL Database

1. Start your PostgreSQL server
2. Create a PostgreSQL user and password if you don't have one
3. The app expects a database called `sentiment_analysis_db` and will create it automatically on first run
4. Default connection: `localhost:5433` (make sure PostgreSQL is running on this port)

#### 7. Pull Required Ollama Models

Pull the model(s) for sentiment analysis:
```bash
ollama pull gemma3:1b     # Recommended starter model
ollama pull gemma3:4b     # Better accuracy
ollama pull gemma3:12b    # Best accuracy but slower
```

> **Note:** Start with `gemma3:1b` (~815MB) for faster testing. Larger models provide better accuracy but require more resources and time.

#### 8. Run the Application

**Important:** Run from the `backend/` directory:
```bash
cd backend
python app.py
```

The application will:
- Attempt to connect to PostgreSQL (with retry logic)
- Create the database if it doesn't exist
- Initialize database tables
- Start the Flask development server

You should see output like:
```
INFO:__main__:Database 'sentiment_analysis_db' created successfully.
INFO:__main__:Database tables created successfully
* Running on http://127.0.0.1:5000
```

## 🧪 Verify Setup

Visit [http://127.0.0.1:5000](http://127.0.0.1:5000) or [http://localhost:5000](http://localhost:5000) in your browser.

You should be able to:
- Enter a politically focused search query
- Select filters and search YouTube and news sources
- View results dynamically rendered with LLM-assigned sentiment
- Agree or disagree with the model's predictions
- Submit optional feedback
- View stats and feedback dashboards

## 🔧 Troubleshooting

### Database Connection Issues
If you see `connection to server at "localhost" failed`:
1. Ensure PostgreSQL is running
2. Check that PostgreSQL is listening on port 5433 (or update your `.env` file)
3. Verify your database credentials in the `.env` file

### Docker Issues
- Make sure Docker Desktop is running and has sufficient resources
- Try running Docker Desktop as administrator
- If containers fail to start, check logs: `docker-compose logs`

### Ollama Model Issues
- Ensure Ollama service is running: `ollama serve`
- Verify models are pulled: `ollama list`
- Check model names match exactly in the application

### Ollama SSH Key Error (Windows)
If you encounter this error when pulling models:
```
Error: pull model manifest: open C:\Users\[USERNAME]\.ollama\id_ed25519: The system cannot find the file specified.
```

Fix it by creating the required SSH key:
```powershell
# Create the .ollama directory if it doesn't exist
New-Item -Path "$env:USERPROFILE\.ollama" -ItemType Directory -Force

# Generate the required SSH key
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ollama\id_ed25519" -N '""'
```

Then retry pulling your models:
```bash
ollama pull gemma3:1b
```

## 🚀 Recommended Model Usage

- **gemma3:1b** (~815MB) - Start here for development and testing
- **gemma3:4b** - Good balance of speed and accuracy  
- **gemma3:12b** - Best accuracy but requires more resources

Additional models can be used by:
1. Pulling them with `ollama pull <model-name>`
2. Adding them to the model dropdown in `backend/templates/index.html`

## ✍️ Author

**Reece Slade**  
Software Engineering Student @ Bournemouth University

## 📝 License

**MIT** — free to use, fork, and modify.
