# Busly - School Transport Management System

Busly is a comprehensive school transport management platform that automates school bus operations, provides live GPS tracking, improves student safety, and reduces manual work through AI-powered route optimization and real-time communication.

## Features

- **Company Registration** - Super Admin creates and activates company accounts
- **Admin Dashboard** - Complete web-based admin panel for managing all operations
- **Driver Management** - Manage driver profiles, licenses, assignments, and performance
- **Vehicle Management** - Track fleet vehicles, maintenance, and GPS devices
- **Route Management** - Create and optimize bus routes with AI
- **Passenger Management** - Manage student profiles and transport assignments
- **Stop Management** - Configure bus stops with geolocation
- **GPS Tracking** - Real-time bus location tracking with WebSockets
- **Pickup & Drop Status** - Track student boarding and deboarding
- **Attendance** - Automated attendance marking and history
- **Push Notifications** - Real-time alerts for parents and staff
- **Reports** - Automated report generation and analytics
- **Role Based Access** - Super Admin, Company Admin, Driver, Parent roles
- **Driver Checklist** - Pre-trip vehicle inspection checklists
- **AI Chatbot** - Intelligent assistant for queries and support

## Tech Stack

### Backend
- Python 3.11+
- FastAPI (Async API Framework)
- PostgreSQL with PostGIS (Geospatial Database)
- Redis (Caching & Session Management)
- Celery (Background Task Processing)
- RabbitMQ (Message Broker)
- WebSockets (Real-time Communication)

### Frontend (Admin Dashboard)
- Next.js 14 (React Framework)
- TypeScript
- Tailwind CSS
- Recharts (Data Visualization)
- Axios (HTTP Client)

### Mobile Apps
- React Native with Expo
- React Navigation
- React Native Maps
- Expo Location (GPS Tracking)

## Project Structure

```
busly/
├── backend/
│   ├── services/
│   │   ├── auth/          # Authentication & Authorization
│   │   ├── tenant/        # Company/Tenant Management
│   │   ├── fleet/         # Vehicle & Driver Management
│   │   ├── routing/       # Route & Stop Management
│   │   ├── geo/           # GPS Tracking & Geofencing
│   │   ├── students/      # Student & Attendance Management
│   │   ├── notifications/ # Push Notifications & Alerts
│   │   ├── gateway/       # API Gateway
│   │   └── ai/            # AI Chatbot & Route Optimization
│   ├── libs/shared/       # Shared utilities
│   └── workers/           # Celery background workers
├── admin/                 # Next.js Admin Dashboard
├── driver-app/            # React Native Driver App
├── parent-app/            # React Native Parent App
└── docker-compose.yml     # Docker orchestration
```

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+ with PostGIS
- Redis 7+

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/your-org/busly.git
cd busly

# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec auth-service python -m backend.scripts.migrate
```

### Manual Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Admin Dashboard
cd admin
npm install
npm run dev

# Driver App
cd driver-app
npm install
npm start

# Parent App
cd parent-app
npm install
npm start
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/v1/auth/*` | Authentication (login, register, refresh) |
| `/api/v1/vehicles/*` | Vehicle CRUD operations |
| `/api/v1/drivers/*` | Driver management |
| `/api/v1/routes/*` | Route management & optimization |
| `/api/v1/stops/*` | Bus stop management |
| `/api/v1/students/*` | Student management |
| `/api/v1/attendance/*` | Attendance tracking |
| `/api/v1/gps/*` | GPS tracking & history |
| `/api/v1/trips/*` | Trip management |
| `/api/v1/notifications/*` | Push notifications |
| `/api/v1/alerts/*` | Alert management |
| `/api/v1/ai/*` | AI chatbot & insights |
| `/api/v1/reports/*` | Report generation |

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| Super Admin | Company registration, tenant management |
| Company Admin | Full access to company data |
| Driver | Route view, checklist, attendance marking |
| Parent | Live tracking, attendance history, notifications |

## License

MIT License
