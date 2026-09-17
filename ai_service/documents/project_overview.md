<!-- # TrackFlow AI — Platform Overview & System Guide

TrackFlow AI is a secure, multi-tenant logistics Software-as-a-Service (SaaS) platform designed to streamline shipment management, dispatch operations, and team coordination.

---

## 1. What is TrackFlow AI?

- Purpose: An AI-powered logistics dashboard enabling companies to manage their supply chain, shipments, employees, and operations in isolated tenant environments.

- Architecture: A multi-tenant system where each tenant (company) gets its own subdomain workspace (e.g. `http://companyname.logesticgo.localhost:5173`) and isolated database partition.

- Technology: Built using a React frontend (Vite, Tailwind CSS, Redux), Django backend, and a FastAPI AI microservice powered by LangChain, FAISS, and Gemini.

---

## 2. User Roles & Duties (Access Control)

The platform supports four distinct user roles, each with specific permissions:

### A. Super Admin

- Duties:
  - Monitors global platform health and telemetry indices.
  - Reviews and approves pending tenant registration requests.
  - Manages global billing packages, workspace allocations, and database provisioning.

- Routes: `/super-admin/*`

### B. Company Admin (Tenant Administrator)

- Duties:
  - Configures company settings, uploads logos, and sets workspace addresses.
  - Onboards employees and operations personnel by sending secure email invitations.
  - Assigns roles to personnel within their company tenant.
  - Accesses company-wide logistics charts, courier leaderboards, and financial overview metrics.

- Routes: `/dashboard/*`, `/settings`, `/profile`

### C. Operations Manager

- Duties:
  - Manages the active dispatch queue.
  - Creates shipments from customer orders.
  - Assigns orders/shipments to couriers/drivers.
  - Logs delay reasons or delivery failure remarks.
  - Monitors operations metrics, delivery success index, and courier performance leaderboards.

- Routes: `/operations/*`

### D. Courier / Driver (Employee)

- Duties:
  - Views their personal list of assigned shipments.
  - Updates shipment tracking status in real-time:
    - `Out for Delivery`
    - `Completed / Delivered`
    - `Delayed` (with delay reason code)
    - `Failed` (with failure reason code)
  - Logs proof of delivery or transit notes.

- Routes: `/employee/*`

---

## 3. Platform Modules & Workflows

### A. Order Management

- Order States:
  - `Pending`: Order placed, waiting for verification.
  - `Assigned`: Courier assigned to the order.
  - `Out for Delivery`: Courier is in transit.
  - `Delivered`: Completed successfully.
  - `Delayed`: Delivery delayed due to external factor.
  - `Cancelled`: Cancelled by admin or customer.
  - `Failed`: Attempted but failed delivery.

### B. Courier Assignment Flow

- Manual Assignment: Operations Managers assign orders to specific courier partners via the dispatch dashboard.

- Bulk Assignment: Administrators select multiple shipments and bulk-assign them to a driver to optimize routing.

### C. Tenant Workspace Security & Policy

- Data Isolation: Multi-tenancy enforces absolute data separation. Companies cannot see each other's orders, drivers, or logs.

- Multi-Factor Authentication (MFA): All users are encouraged to set up MFA via TOTP Authenticator apps during setup for secure login verification.

- Session Transfer: Session tokens are transferrable securely across subdomains via encoded query parameters (`auth_transfer` / `refresh_token`) to allow seamless navigation across company subdomains.
 -->

# TrackFlow AI — Platform Overview & System Guide

TrackFlow AI is a secure, multi-tenant logistics Software-as-a-Service (SaaS)
platform designed to streamline shipment management, dispatch operations,
employee management, delivery tracking, and team coordination.

---

## 1. What is TrackFlow AI?

TrackFlow AI provides companies with an isolated logistics workspace where
they can manage their employees, customers, orders, shipments, couriers,
delivery operations, and business metrics.

### Key Characteristics

- Multi-tenant SaaS architecture
- Company-specific workspaces
- Secure tenant data isolation
- Role-Based Access Control (RBAC)
- JWT-based authentication
- Multi-Factor Authentication (MFA)
- Shipment and order management
- Courier assignment and tracking
- Real-time notifications
- Background task processing
- AI-powered project knowledge assistant

### Technology Stack

**Frontend**
- React.js
- Vite
- Tailwind CSS
- Redux

**Backend**
- Python
- Django
- Django REST Framework
- PostgreSQL

**AI Microservice**
- FastAPI
- LangChain
- Hugging Face Embeddings
- FAISS
- Gemini

**Real-Time / Background Processing**
- WebSockets
- Django Channels
- Celery
- Redis

**Cloud / Infrastructure**
- AWS services
- AWS SQS
- Nginx
- Gunicorn

---

# 2. Multi-Tenant Architecture

TrackFlow uses a multi-tenant architecture where each company operates
inside its own isolated workspace.

A tenant represents a company using the TrackFlow platform.

Each company receives its own workspace/subdomain, for example:

`companyname.logesticgo.localhost:5173`

Tenant isolation ensures that one company cannot access another company's
orders, employees, shipments, or operational information.

### Tenant Flow

Registration request

↓

Super Admin approval

↓

Company/Tenant creation

↓

Workspace provisioning

↓

Company Admin access

↓

Employee onboarding

↓

Company operations

---

# 3. User Roles & Access Control

TrackFlow uses Role-Based Access Control (RBAC) to determine what each
user is allowed to access and perform.

## A. Super Admin

The Super Admin manages the global TrackFlow platform.

### Responsibilities

- Monitor overall platform health
- Review and approve company registration requests
- Manage billing packages
- Manage workspace allocation
- Manage tenant provisioning
- Access global platform-level information

### Routes

`/super-admin/*`

---

## B. Company Admin

The Company Admin manages a specific company tenant.

### Responsibilities

- Configure company settings
- Manage company profile and workspace information
- Upload company logos
- Onboard employees
- Send employee invitations
- Assign roles to employees
- Manage company-level operations
- View company analytics and performance metrics

### Routes

`/dashboard/*`

`/settings`

`/profile`

---

## C. Operations Manager

The Operations Manager handles day-to-day logistics operations.

### Responsibilities

- Manage the dispatch queue
- Create shipments from orders
- Assign shipments to couriers
- Perform bulk courier assignment
- Monitor shipment progress
- Record delivery delays
- Record delivery failures
- Monitor courier performance
- View operational metrics

### Routes

`/operations/*`

---

## D. Courier / Driver

The Courier or Driver handles assigned deliveries.

### Responsibilities

- View assigned shipments
- Update shipment status
- Record delivery information
- Add transit notes
- Submit proof of delivery
- Report delivery delays
- Report delivery failures

### Shipment statuses may include

- Out for Delivery
- Delivered / Completed
- Delayed
- Failed

### Routes

`/employee/*`

---

# 4. Authentication & Security

TrackFlow uses secure authentication and authorization mechanisms.

## JWT Authentication

Users authenticate using JWT-based authentication.

The authenticated user is associated with their tenant and role.

The backend uses this information to determine:

- Who the user is
- Which tenant they belong to
- Which operations they can perform

---

## Role-Based Access Control

RBAC prevents users from performing operations outside their assigned
responsibilities.

For example:

- Super Admin → platform-level management
- Company Admin → company-level management
- Operations Manager → logistics operations
- Courier → assigned delivery operations

---

## Multi-Factor Authentication

TrackFlow supports MFA using TOTP-based authenticator applications.

MFA provides an additional verification step during authentication.

---

# 5. Employee Management

Company Admins can onboard employees into their company.

### Employee Onboarding Flow

Company Admin

↓

Enter employee information

↓

Create employee account

↓

Assign employee role

↓

Generate activation information

↓

Send secure invitation

↓

Employee activates account

↓

Employee can access the appropriate dashboard

The employee's role determines the permissions available after activation.

---

# 6. Order Management

Orders represent customer delivery requests that move through the logistics
workflow.

### Order States

- `Pending` — Order is waiting for processing or verification.
- `Assigned` — A courier has been assigned.
- `Out for Delivery` — Courier is currently handling the delivery.
- `Delivered` — Delivery has been completed successfully.
- `Delayed` — Delivery has been delayed.
- `Cancelled` — Order has been cancelled.
- `Failed` — Delivery attempt was unsuccessful.

---

# 7. Shipment Management

Shipments represent the operational delivery process associated with orders.

Operations Managers can create shipments and manage their dispatch lifecycle.

### Shipment Lifecycle

Order

↓

Shipment Created

↓

Courier Assigned

↓

Out for Delivery

↓

Delivered

OR

Delayed

OR

Failed

---

# 8. Courier Assignment

Operations Managers can assign shipments to couriers through the dispatch
workflow.

## Manual Assignment

A manager selects a shipment and assigns it to a specific courier.


# 9. Real-Time Notifications

TrackFlow supports real-time notifications for important operational events.

For example, when a shipment is assigned:

Shipment

↓

Courier Assigned

↓

Real-Time Event

↓

WebSocket / Notification Layer

↓

Courier receives notification

Example notification:

"A new shipment has been assigned to you."

This allows couriers to receive operational updates without manually
refreshing the dashboard.

---

# 10. Shipment Journey Timeline

TrackFlow maintains shipment progress through its lifecycle.

A shipment can move through events such as:

- Shipment created
- Courier assigned
- Out for delivery
- Delayed
- Delivered
- Failed

These events provide a chronological view of the shipment journey.

The timeline can be used to understand how and when the shipment status
changed during its lifecycle.

---

# 11. Background Processing

TrackFlow uses background task processing for operations that should not
block the main API request.

Celery can be used to execute asynchronous/background tasks.

### General Flow

Django API

↓

Task submitted

↓

Celery

↓

Message Broker / Queue

↓

Celery Worker

↓

Background task execution

This architecture allows time-consuming operations to be processed
independently from the user's request.

---

# 12. AWS SQS

AWS SQS can be used as a reliable message queue for asynchronous
communication between application components.

Instead of requiring one service to wait for another service to finish
processing, a message can be placed into a queue and processed
asynchronously.

### General Flow

Application

↓

SQS Queue

↓

Consumer / Worker

↓

Process Message

↓

Complete Task

---

# 13. AI Chatbot

TrackFlow includes an AI-powered chatbot designed to answer questions using
TrackFlow project knowledge.

The AI service is implemented as a separate FastAPI microservice.

### Architecture

React

↓

Django API

↓

FastAPI AI Microservice

↓

RAG Retrieval

↓

FAISS

↓

Relevant Knowledge

↓

Gemini

↓

Generated Answer

↓

Django

↓

React

---

# 14. Retrieval-Augmented Generation (RAG)

The TrackFlow AI chatbot uses Retrieval-Augmented Generation.

RAG combines information retrieval with an LLM.

### RAG Flow

User Question

↓

Convert question into embedding

↓

Search FAISS vector index

↓

Retrieve relevant project knowledge

↓

Add retrieved knowledge to the prompt

↓

Send prompt to Gemini

↓

Generate grounded answer

---

# 15. Knowledge Base Creation

The AI knowledge base is created through an indexing pipeline.

### Indexing Flow

TrackFlow Project Files

↓

Document Loader

↓

Read supported files

↓

Chunk Documents

↓

Generate Embeddings

↓

Create FAISS Vector Index

↓

Save FAISS Index

The stored FAISS index is loaded by the AI service during runtime.

---

# 16. Document Chunking

Large documents are divided into smaller chunks before generating embeddings.

This allows the retrieval system to find only the relevant portions of
large documents.

### Example

Large Project File

↓

Chunk 1

Chunk 2

Chunk 3

Chunk 4

↓

Embeddings

↓

FAISS

---

# 17. Vector Search

FAISS is used for semantic similarity search.

When a user asks a question:

Question

↓

Embedding

↓

FAISS similarity search

↓

Most relevant chunks

↓

LLM context

This allows the chatbot to retrieve information based on meaning rather
than only exact keyword matching.

---

# 18. Knowledge Visibility

TrackFlow AI separates knowledge into public and internal content.

### Public Knowledge

Public/business chatbot users can receive information such as:

- Platform overview
- General capabilities
- User roles
- Onboarding information
- General business workflows

### Internal Knowledge

Internal project users can access additional project-specific technical
knowledge when it is available in the indexed knowledge base.

Internal content can include:

- Source code
- Technical implementation
- Internal architecture
- Project configuration information

Internal-only content is filtered during retrieval when the chatbot operates
in public mode.

---

# 19. AI Response Grounding

The chatbot is instructed to answer using the retrieved TrackFlow knowledge.

If the required information is not available in the retrieved knowledge,
the chatbot should not invent an answer.

Instead, it returns an appropriate fallback response such as:

"I don't have enough information about that in the current project knowledge."

This reduces hallucination and keeps responses grounded in project
information.

---

# 20. Public vs Internal AI Assistant

TrackFlow AI supports different response modes.

## Public Mode

The assistant acts as a business/onboarding guide.

It should not expose:

- Source code
- Database schemas
- Internal APIs
- Internal class names
- Method names
- Credentials
- Environment variables
- Internal implementation details

## Internal Mode

The assistant can explain project-specific technical information when that
information exists in the retrieved knowledge base.

---

# 21. AI Service Error Handling

The FastAPI AI service handles failures from the LLM service.

Examples include:

- Rate limiting
- Temporary service unavailability
- Unexpected AI service errors

Instead of exposing raw exceptions to users, the service returns a friendly
error message.

For example:

"Please try again shortly."

---

# 22. Service Separation

The AI functionality is separated from the main Django application.

### Django

Responsible for:

- Authentication
- Authorization
- Tenant identification
- Main business logic
- Application APIs

### FastAPI AI Microservice

Responsible for:

- RAG retrieval
- Vector search
- Prompt construction
- LLM communication
- AI response generation

This separation allows the AI service to evolve independently from the
main business application.

---

# 23. Complete Platform Architecture

```text
                         TrackFlow
                             |
        +--------------------+--------------------+
        |                                         |
        v                                         v
   React Frontend                          Django Backend
        |                                         |
        |                              +----------+----------+
        |                              |          |          |
        |                              v          v          v
        |                            Auth       RBAC       Tenant
        |                              |          |          |
        |                              +----------+----------+
        |                                         |
        |                              +----------+----------+
        |                              |          |          |
        |                              v          v          v
        |                           Orders    Shipments   Employees
        |                                         |
        |                                         v
        |                                  Courier Assignment
        |                                         |
        |                              +----------+----------+
        |                              |                     |
        |                              v                     v
        |                       Real-Time Events       Background Tasks
        |                              |                     |
        |                              v                     v
        |                         WebSockets             Celery / Queue
        |
        |
        +----------------------> Django AI API
                                      |
                                      v
                              FastAPI AI Service
                                      |
                           +----------+----------+
                           |                     |
                           v                     v
                         RAG                  Gemini
                           |
                           v
                         FAISS
                           |
                           v
                    Project Knowledge