# TrackFlow AI

AI-Powered Multi-Tenant Logistics Operations Platform

TrackFlow AI is a production-ready multi-tenant logistics management platform
designed to help logistics companies manage orders, shipments, employees,
courier operations, analytics, and AI-powered operational insights from
a single platform.

🌐 Live Demo
https://manhargurukkal.site

---

## ✨ Features

### 🏢 Multi-Tenant Architecture
- Isolated workspace for every logistics company
- PostgreSQL schema-based tenant isolation
- Tenant-specific subdomains
- Secure tenant resolution
- Cross-tenant data protection

Example:

logesticgo.manhargurukkal.site

### 📦 Order Management
- Create and manage orders
- Assign orders to employees
- Track order lifecycle
- Delivery status updates
- Order search and filtering

### 👥 Employee Management
- Company employee management
- Role-based access control
- Employee activation workflow
- Employee status management

### 🔐 Authentication & Security
- JWT authentication
- Access & refresh tokens
- HttpOnly cookies
- MFA / TOTP
- Microsoft Authenticator support
- Twilio phone verification
- CORS / CSRF protection
- Tenant-aware authentication

### ⚡ Real-Time Communication
- Django Channels
- WebSockets
- Real-time chat
- Real-time notifications
- Live operational updates

### 🤖 AI & RAG
- AI-powered logistics assistant
- Retrieval-Augmented Generation
- Vector search
- Hugging Face embeddings
- pgvector
- FastAPI AI microservice
- Context-aware responses

### 📊 Analytics
- Operations dashboard
- Order analytics
- Employee performance
- Courier performance
- Operational insights

### ⚙️ Background Processing
- Celery
- Celery Beat
- AWS SQS
- Background task processing
- Scheduled jobs

---

## 🏗️ Architecture

```text
                         ┌──────────────────────┐
                         │      Browser         │
                         │   React + Vite       │
                         └──────────┬───────────┘
                                    │
                         HTTPS / WebSocket
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │        Caddy        │
                         │ Reverse Proxy + TLS  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │       Django Backend        │
                    │       DRF + Channels        │
                    └───────────┬──────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
        ┌──────────┐      ┌────────────┐    ┌─────────────┐
        │PostgreSQL│      │   Celery   │    │ AI Service  │
        │  +       │      │ + AWS SQS  │    │   FastAPI   │
        │ pgvector │      └────────────┘    └──────┬──────┘
        └──────────┘                               │
                                                   ▼
                                             RAG / LLM
                                             Embeddings


                                             🛠️ Tech Stack
Frontend
React
Vite
Redux Toolkit
React Router
Tailwind CSS
Axios
Backend
Python
Django
Django REST Framework
Django Channels
Django Tenants
JWT / SimpleJWT
Database
PostgreSQL
pgvector
AI
FastAPI
RAG
LLM
Hugging Face Embeddings
Vector Search
Real-Time
WebSockets
Django Channels
Background Processing
Celery
Celery Beat
AWS SQS
Infrastructure
Docker
Docker Compose
AWS EC2
AWS RDS
Amazon ECR
Caddy
HTTPS / Wildcard DNS
Authentication & Security
JWT
MFA / TOTP
Twilio
HttpOnly Cookies
RBAC
CORS / CSRF

👤 Role Hierarchy
Super Admin
     │
     ▼
Company Admin
     │
     ├── Operations Manager
     │
     └── Delivery Employee

Super Admin
Approve companies
Manage tenants
Monitor platform
Company Admin
Manage company employees
Manage operations
View company analytics
Operations Manager
Create orders
Assign orders
Monitor operations
Track delivery progress
Delivery Employee
View assigned orders
Update delivery status
Complete delivery workflow

🔄 Typical Workflow
Super Admin
     │
     ▼
Approve Company
     │
     ▼
Create Tenant Workspace
     │
     ▼
Company Admin
     │
     ▼
Create Employees
     │
     ▼
Operations Manager
     │
     ▼
Create & Assign Orders
     │
     ▼
Delivery Employee
     │
     ▼
Update Delivery Status
     │
     ▼
Analytics & AI Insights

🤖 AI Architecture

TrackFlow AI uses a separate FastAPI AI service.

User
 │
 ▼
React Frontend
 │
 ▼
Django API
 │
 ▼
AI Service
 │
 ├── Query Processing
 ├── Embeddings
 ├── Vector Search
 ├── RAG Retrieval
 └── LLM Response
 │
 ▼
Django API
 │
 ▼
User

The AI service is kept internal and is not directly exposed publicly.

🐳 Local Development
Clone

git clone https://github.com/Manharrr/trackflow.git

cd trackflow

Start services

docker compose up -d

Check containers

docker compose ps

Backend

docker compose logs backend

AI Service

docker compose logs ai_service

🔑 Environment Variables

Create the required .env files for:

Django
PostgreSQL
JWT
Twilio
MFA
AWS
ECR
SQS
AI / LLM
RAG / embeddings

Never commit production secrets to GitHub.

☁️ Production Deployment

TrackFlow AI is deployed using:

AWS EC2
    │
    ├── Django / Daphne
    ├── Celery Worker
    ├── Celery Beat
    └── AI Service

AWS RDS
    │
    └── PostgreSQL + pgvector

Amazon ECR
    │
    └── Docker Images

Caddy
    │
    ├── HTTPS
    ├── API routing
    └── Wildcard tenant subdomains

    🌐 Production URLs

Main Website:

https://manhargurukkal.site

API:

https://api.manhargurukkal.site

Tenant Example:

https://logesticgo.manhargurukkal.site

🔐 Demo Access

Public registration uses Twilio phone verification.

If you want to explore TrackFlow AI and test different roles,
contact me directly for demo access.

📚 What I Learned

This project helped me gain practical experience with:

Multi-tenant SaaS architecture
PostgreSQL schema isolation
Django REST APIs
JWT authentication
MFA
WebSockets
Celery and background jobs
RAG and vector search
FastAPI microservices
Docker
AWS EC2 and RDS
Amazon ECR
AWS SQS
DNS and HTTPS
Reverse proxies
Production debugging
Cloud deployment
🚀 Future Improvements
Advanced AI logistics predictions
Automated delay detection
Courier recommendation
Advanced analytics
More third-party courier integrations
Automated CI/CD
Improved observability and monitoring
👨‍💻 Author

Manhar Gurukkal

Full Stack Developer

GitHub:
https://github.com/Manharrr

LinkedIn:
https://www.linkedin.com/in/manharck/
