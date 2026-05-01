# MediEquip 2.0 — AI-Powered Emergency Medical Intelligence Platform

> A real-time, full-stack MERN application that uses Groq AI to triage medical emergencies, recommend hospitals intelligently, and coordinate ambulance dispatch — all with live WebSocket updates across a city-wide dashboard.

---

## What Is This?

MediEquip 2.0 is an emergency medical response platform built for three types of users:

- **Patients** describe their symptoms → Groq AI analyses them in real-time → the system recommends the best hospitals nearby → the patient can request an ambulance and track it live on a map.
- **Hospital Admins** manage their hospital's live resource inventory (beds, ICU, oxygen, blood bank, ventilators) and broadcast updates instantly to all connected users.
- **System Admins** see a city-wide intelligence dashboard with all hospitals on a map, real-time occupancy trends, KPI cards, and the ability to trigger mass casualty alerts that notify everyone instantly.

---

## Live Demo Flow

```
Patient logs in
  → Types symptoms ("severe chest pain, sweating, shortness of breath")
  → Groq AI streams a triage result token-by-token
  → Result: CRITICAL | Suspected: Cardiac Event | Facility: ICU Specialist
  → Top 3 hospitals shown on Leaflet map with color-coded availability
  → Patient clicks "Request Ambulance"
  → Ambulance dispatched, live GPS tracking begins on map

Hospital Admin logs in
  → Moves bed slider from 120 → 95
  → Clicks "Update & Broadcast"
  → Every patient dashboard instantly reflects the new bed count (WebSocket)
  → If occupancy crosses 90%, a capacity warning fires

System Admin logs in
  → Sees all staged facilities on the regional map (availability by occupancy)
  → Views 24-hour occupancy trend chart per hospital
  → Triggers a Mass Casualty Alert with radius + message
  → Alert broadcasts to every connected client instantly
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite 5 | UI framework and build tool |
| Styling | Tailwind CSS v3 | Utility-first responsive design |
| Maps | Leaflet.js + React-Leaflet | Interactive city and hospital maps |
| Charts | Recharts | Occupancy gauge, trend lines, KPI visuals |
| Real-time (client) | Socket.io-client | Receive live hospital and ambulance updates |
| HTTP client | Axios | API calls with JWT interceptor |
| Backend | Node.js + Express (ESM) | REST API server |
| Real-time (server) | Socket.io | Emit events to connected clients |
| Database | MongoDB + Mongoose | Persistent data storage |
| Cache | Redis (optional) | Hospital state cache for fast WebSocket reads |
| AI | Groq API (`llama-3.3-70b-versatile`) | Streaming medical triage analysis |
| Auth | JWT + bcryptjs | Secure role-based authentication |

---

## Project Structure

```
mediequip/
│
├── server/                         # Express API server
│   ├── src/
│   │   ├── index.js                # Entry point — Express + Socket.io + MongoDB
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT verification + role-guard middleware
│   │   ├── models/
│   │   │   ├── User.js             # name, email, password (hashed), role, hospitalId
│   │   │   ├── Hospital.js         # beds, ICU, resources, location, occupancy history
│   │   │   ├── Patient.js          # symptoms, triage result, assigned hospital/ambulance
│   │   │   ├── Ambulance.js        # vehicle, GPS location, status, assigned patient
│   │   │   └── Alert.js            # type, radius, message, affected hospitals
│   │   ├── routes/
│   │   │   ├── auth.js             # POST /register, POST /login
│   │   │   ├── hospitals.js        # GET all, GET by id, PUT resources, GET recommend
│   │   │   ├── triage.js           # POST /triage — Groq AI SSE streaming
│   │   │   ├── ambulance.js        # GET all, POST dispatch, PUT location
│   │   │   ├── alerts.js           # POST create, GET active, DELETE deactivate
│   │   │   └── seed.js             # GET /seed — non-prod staging dataset
│   │   └── socket/
│   │       ├── index.js            # All Socket.io event definitions
│   │       └── redis.js            # Redis cache helpers (graceful fallback)
│   ├── .env                        # Your environment variables (not committed)
│   ├── .env.example                # Template for environment variables
│   └── package.json
│
├── client/                         # React frontend
│   ├── src/
│   │   ├── main.jsx                # React root render
│   │   ├── App.jsx                 # BrowserRouter + role-based protected routes
│   │   ├── index.css               # Tailwind directives + global styles
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Login/register/logout state + localStorage
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Top nav with role badge + logout
│   │   │   └── ProtectedRoute.jsx  # Redirects unauthorized users by role
│   │   ├── lib/
│   │   │   ├── api.js              # Axios instance — auto-attaches JWT header
│   │   │   └── socket.js           # Socket.io singleton connection
│   │   └── pages/
│   │       ├── Login.jsx           # Auth + optional staging shortcuts (after seed)
│   │       ├── Register.jsx        # Registration with role selector
│   │       ├── PatientDashboard.jsx       # Triage + map + ambulance tracking
│   │       ├── HospitalAdminDashboard.jsx # Resource sliders + gauge + history chart
│   │       └── AdminDashboard.jsx         # City map + KPIs + trend chart + alerts
│   ├── vite.config.js              # Vite + React plugin + API proxy
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

---

## Database Models

### User
```
name        String   (required)
email       String   (unique)
password    String   (bcrypt hashed)
role        Enum     patient | hospital_admin | system_admin
hospitalId  ObjectId (ref: Hospital — for hospital admins)
```

### Hospital
```
name              String
location          { lat, lng, address }
type              Enum: general | trauma | icu_specialist
totalBeds         Number
availableBeds     Number
icuTotal          Number
icuAvailable      Number
resources         { oxygen: Bool, bloodBank: Bool, ventilators: Number }
specializations   [String]
isActive          Boolean
occupancyHistory  [{ timestamp, occupancyPercent }]  ← last 24h stored
```

### Patient
```
userId            ObjectId (ref: User)
symptoms          String
triageResult      { urgency, suspectedCondition, recommendedFacilityType, reasoning, immediateActions }
assignedHospital  ObjectId (ref: Hospital)
ambulanceId       ObjectId (ref: Ambulance)
status            Enum: triaged | dispatched | admitted | discharged
patientLocation   { lat, lng }
```

### Ambulance
```
vehicleNumber     String (unique)
driverId          ObjectId (ref: User)
currentLocation   { lat, lng }
status            Enum: available | dispatched | returning
assignedPatient   ObjectId (ref: Patient)
assignedHospital  ObjectId (ref: Hospital)
eta               Number (minutes)
```

### Alert
```
type               Enum: mass_casualty | resource_critical | system
triggeredBy        ObjectId (ref: User)
affectedRadius     Number (km)
message            String
respondedHospitals [{ hospitalId, availableCapacity }]
isActive           Boolean
```

---

## API Reference

### Authentication
```
POST   /api/auth/register     { name, email, password, role, hospitalId? }
POST   /api/auth/login        { email, password }
```
Both return `{ token, user }`. Include token as `Authorization: Bearer <token>` on protected routes.

### Hospitals
```
GET    /api/hospitals                                    All active hospitals
GET    /api/hospitals/:id                                Single hospital + occupancy history
GET    /api/hospitals/recommend?lat=&lng=&facilityType=&urgency=   Top 3 scored hospitals
PUT    /api/hospitals/:id/resources                      Update beds/resources (hospital_admin)
       Body: { availableBeds, icuAvailable, resources: { oxygen, bloodBank, ventilators } }
```

### Triage (Groq AI — Server-Sent Events)
```
POST   /api/triage
       Body: { symptoms: string, patientLocation: { lat, lng } }
       Headers: Accept: text/event-stream

SSE stream events:
  event: token           { token: "..." }           ← streamed AI tokens
  event: triage_complete { triageResult: {...} }    ← final parsed JSON
  event: recommendations { patientId, recommendations: [...] }
  event: done            {}
  event: error           { message: "..." }
```

### Ambulance
```
GET    /api/ambulance                                    All ambulances + assignments
POST   /api/ambulance/dispatch                           { ambulanceId, patientId, hospitalId }
PUT    /api/ambulance/:id/location                       { lat, lng } — triggers WebSocket
```

### Alerts
```
POST   /api/alerts           { type, affectedRadius, message }  (system_admin only)
GET    /api/alerts/active    All active alerts
DELETE /api/alerts/:id       Deactivate an alert
```

### Seed (Development Only)
```
GET    /api/seed             Wipes and repopulates DB with staging data (non-production only)
```

---

## WebSocket Events

### Server → All Clients
| Event | When | Payload |
|-------|------|---------|
| `hospital:update` | Hospital admin updates resources | `{ hospitalId, availableBeds, icuAvailable, resources }` |
| `alert:mass_casualty` | System admin triggers alert | `{ alertId, message, type, affectedHospitals }` |
| `hospital:capacity_warning` | Hospital crosses 90% occupancy | `{ hospitalId, occupancyPercent }` |

### Server → Specific Patient Room
| Event | When | Payload |
|-------|------|---------|
| `ambulance:location` | Ambulance driver updates GPS | `{ ambulanceId, lat, lng, eta, vehicleNumber }` |

### Client → Server
| Event | Purpose |
|-------|---------|
| `patient:join_room` (patientId) | Join private room to receive ambulance updates |
| `hospital:join_room` (hospitalId) | Hospital admin joins their hospital room |

---

## Hospital Scoring Algorithm

When the system recommends hospitals after triage, it scores every active hospital using:

```
score = (1 - distance / maxDistance) × 0.4      ← proximity     (40%)
      + (availableBeds / totalBeds)   × 0.4      ← bed capacity  (40%)
      + (facilityTypeMatch ? 1 : 0)   × 0.2      ← specialization match (20%)
```

The top 3 scored hospitals are returned, sorted highest score first.

---

## Setup & Running

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free tier works)
- Groq API key — get one free at [console.groq.com](https://console.groq.com)
- Redis (optional) — skip if you don't have it, the app degrades gracefully

---

### Step 1 — Configure Environment

Open `server/.env` and fill in your values:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/mediequip2
JWT_SECRET=any_random_string_min_32_chars
GROK_API_KEY=gsk_your_groq_api_key_here
REDIS_URL=redis://localhost:6379
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
```

---

### Step 2 — Install Dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

---

### Step 3 — Start the Server

```bash
cd server
npm run dev
```

You should see:
```
[DB] Connected to MongoDB
[Server] MediEquip 2.0 running on port 5000
```

---

### Step 4 — Start the Client

Open a second terminal:

```bash
cd client
npm run dev
```

You should see:
```
VITE v5.x  ready in 447ms
➜  Local: http://localhost:5173/
```

---

### Step 5 — Seed the Database

In your browser or terminal:

```bash
curl http://localhost:5000/api/seed
```

This creates:
- 10 fictitious facilities with typed capacities, inventory profiles, and 24-hour occupancy history
- 16 users: 1 system admin, 10 facility operators (one per site), 1 patient account, 4 staged responders, 1 EMS operator
- 5 ambulances ready to dispatch

---

### Step 6 — Open the App

Go to **http://localhost:5173** and log in with any of these:

| Role | Email | Password | What you'll see |
|------|-------|----------|----------------|
| Patient | `patient@mediequip.ai` | `Patient@1234` | Triage + map + ambulance |
| Hospital Admin | `admin1@manipalhospitalwhitefield.com` | `Hospital@1234` | Resource panel + gauge |
| Volunteer | `volunteer1@mediequip.ai` | `Volunteer@1234` | Field responder map |
| Paramedic | `paramedic@mediequip.ai` | `Paramedic@1234` | Ambulance vitals console |

## Key Features Explained

### Groq AI Triage (Streaming)
When a patient submits symptoms, the server calls the Groq API with a structured system prompt. The response streams token-by-token via Server-Sent Events (SSE) — you see the AI "typing" its analysis in real-time. Once complete, the JSON is parsed and the triage result (urgency level, suspected condition, recommended facility type, reasoning, and immediate actions) is displayed with colour-coded urgency badges.

### Live Hospital Updates (WebSocket)
When a hospital admin adjusts their resource sliders and clicks "Update & Broadcast", the server saves the change to MongoDB, invalidates the Redis cache, and immediately emits a `hospital:update` socket event to every connected client. Patient dashboards and the system admin table both update instantly — no page refresh needed.

### Hospital Recommendation Engine
After triage, the system scores every hospital using a weighted formula: 40% proximity, 40% bed availability, 20% facility type match. The top 3 are shown on the map with detailed cards including available beds, ICU count, specializations, and distance.

### Ambulance Tracking
When an ambulance is dispatched, the patient's browser joins a private socket room. As the ambulance driver updates their GPS position (via `PUT /api/ambulance/:id/location`), the server emits the coordinates directly to that patient's room. The ambulance marker moves in real-time on the patient's Leaflet map.

### Mass Casualty Alerts
System admins can broadcast emergency alerts with a type, affected radius, and message. The alert is saved to MongoDB and instantly pushed via `alert:mass_casualty` to all connected clients — a red banner appears at the top of every dashboard.

### Redis Caching
Hospital resource state is cached in Redis with a 5-minute TTL so the WebSocket server can read the latest state without hitting MongoDB on every event. If Redis is unavailable, the system falls back to MongoDB seamlessly — no crash, no configuration required.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens (min 32 chars) |
| `GROK_API_KEY` | Yes | Groq API key from console.groq.com |
| `REDIS_URL` | No | Redis connection URL (defaults to localhost:6379) |
| `PORT` | No | Server port (defaults to 5000) |
| `NODE_ENV` | No | `development` or `production` |
| `CLIENT_ORIGIN` | No | Frontend origin for CORS (defaults to http://localhost:5173) |

---

## Scripts

### Server
```bash
npm run dev     # Start with nodemon (hot reload)
npm start       # Start without hot reload (production)
```

### Client
```bash
npm run dev     # Vite dev server with HMR
npm run build   # Production build → dist/
npm run preview # Preview production build locally
```

---

## Staging facilities (non-production seed)

| # | Facility | Type | Total beds |
|---|----------|------|------------|
| 1 | Aurora Metropolitan Medical Center | ICU Specialist | 600 |
| 2 | Northside Trauma & Emergency Center | Trauma | 400 |
| 3 | Riverside Advanced Care Hospital | ICU Specialist | 1000 |
| 4 | Lakewood Community Hospital | General | 350 |
| 5 | Central District Emergency Hospital | Trauma | 800 |
| 6 | Harbor View Medical Pavilion | General | 1200 |
| 7 | Summit Neurosciences Institute | ICU Specialist | 300 |
| 8 | Meridian Multispecialty Hospital | Trauma | 500 |
| 9 | Cedar Grove Orthopedic & Trauma | Trauma | 200 |
| 10 | Lakeside Behavioral & Neurology Center | ICU Specialist | 700 |
