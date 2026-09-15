VeriPlace — Smart Placement Registration & Eligibility Verification System

A full-stack, institutional-grade placement management platform designed to eliminate fraudulent academic claims (such as inflated CGPA or concealed backlogs) during campus recruitment drives.



1. Architecture & Security Guarantees

Deterministic Eligibility Engine (eligibilityEngine.js):

Company eligibility criteria (Min CGPA, 10th %, 12th %, Max Backlogs, Backlog History Allowed, Branches, Graduation Year, Gap Months) are dynamically configured.

Eligibility is evaluated deterministically using only certified institutional records from the registrar database.

Student-submitted academic metrics NEVER determine eligibility.

Zero-Trust Backend Validation:

Even if a malicious student tampers with frontend payloads or script requests (e.g. passing { cgpa: 8.20, active_backlogs: 0 }), the backend strictly queries the student's institutional record (academic_records table), computes eligibility server-side, detects tampering attempts, rejects the application with HTTP 403 Forbidden, flags the student, and logs the incident.

Google Forms & External Import Reconciliation (mismatchDetector.js):

External Google Form submissions or CSV responses can be imported into the system.

The engine automatically cross-references all submitted fields against the verified master database.

Any discrepancy (e.g. self-reporting CGPA 8.20 when verified is 6.80) triggers a DATA MISMATCH DETECTED event, marks the student record FLAGGED, alerts placement officers, and writes an audit entry.

Immutable Audit Trail (auditService.js):

Every security event (login, application submission, eligibility rejection, administrative record modification, student block/unblock, company drive creation) is written with actor identity, role, timestamp, entity diffs, and IP address.

2. User Roles & Evaluation Credentials

The application includes a 1-Click Quick Role Switcher at the top of the interface for instantaneous testing across all roles:

Role

Name / Identifier

Password

Key Characteristics

Placement Officer (Admin)

admin@placement.edu (or admin)

Admin@123

Full administrative control, dynamic drive creator, student master DB, fraud & discrepancy center, Google Form reconciliation, audit trail.

Student (Eligible)

USN 1MS21CS001 (Aarav Patel)

Student@123

Verified CGPA: 8.65, Active Backlogs: 0, Branch: CSE, 2027 batch. Eligible for all tier-1 companies (ABC Tech, FinTech, Cloud).

Student (Ineligible / Fraud Test)

USN 1MS21CS042 (Rahul Sharma)

Student@123

Verified CGPA: 6.80, Active Backlogs: 1, Branch: CSE, 2027 batch. Ineligible for ABC Technologies (Min 7.50 CGPA). Use Google Form Sim to test submitting fake 8.20 CGPA!

Recruiter

recruiter@abc-tech.com

Recruiter@123

Recruiter partner portal for ABC Technologies. View certified eligible applicants, download resumes, and advance recruitment stages.

3. Project Structure

c:\Users\HP\OneDrive\Desktop\PV\
├── backend/
│   ├── src/
│   │   ├── config/database.js               # Relational SQLite schema (node:sqlite)
│   │   ├── controllers/
│   │   │   ├── authController.js            # Login, demo switch, JWT issuance
│   │   │   ├── studentController.js         # Student profile, locked fields, resume upload
│   │   │   ├── companyController.js         # Drives catalog & live eligibility calculation
│   │   │   ├── applicationController.js     # Server-side verified Apply endpoint
│   │   │   ├── mismatchController.js        # Discrepancies investigation & student blocking
│   │   │   ├── importController.js          # Google Form reconciliation & master DB import
│   │   │   ├── adminStatsController.js      # KPI metrics & analytics
│   │   │   ├── adminStudentsController.js   # Student master DB & audit-tracked edits
│   │   │   └── auditController.js           # Immutable audit query API
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js            # JWT role verification & block checks
│   │   │   └── uploadMiddleware.js          # Resume file upload validation
│   │   ├── services/
│   │   │   ├── eligibilityEngine.js         # Pure deterministic eligibility checker
│   │   │   ├── mismatchDetector.js          # Cross-reference engine & fraud flagger
│   │   │   ├── auditService.js              # Audit logger
│   │   │   └── seedData.js                  # Institutional demo seed data
│   │   ├── routes/
│   │   │   └── api.js                       # Central REST API routes
│   │   └── server.js                        # Express server entry point
│   ├── uploads/                             # Secure resume storage
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx                   # Branding, user pill, and 1-Click Role Switcher
│   │   │   ├── Sidebar.jsx                  # Role-aware navigation menu
│   │   │   └── EligibilityModal.jsx         # Detailed criteria checklist modal (✓ / ❌)
│   │   ├── context/
│   │   │   └── AuthContext.jsx              # Global authentication & role management
│   │   ├── api/
│   │   │   └── client.js                    # Fetch client with JWT interceptor
│   │   ├── pages/
│   │   │   ├── Login.jsx                    # Login + 1-Click evaluation persona cards
│   │   │   ├── StudentDashboard.jsx         # Drives catalog with live eligibility badges
│   │   │   ├── StudentProfile.jsx           # Institutional locked data + editable portfolio
│   │   │   ├── StudentApplications.jsx      # Live recruitment stage progress tracker
│   │   │   ├── GoogleFormSimulator.jsx      # Interactive Google Form fraud testing tool
│   │   │   ├── AdminDashboard.jsx           # High-level KPIs & mismatch alerts
│   │   │   ├── AdminCompanies.jsx           # Dynamic company & criteria manager
│   │   │   ├── AdminStudents.jsx            # Student master DB with audit-tracked edits
│   │   │   ├── AdminMismatches.jsx          # Fraud & discrepancy investigation center
│   │   │   ├── AdminImport.jsx              # Google Forms & master DB reconciliation
│   │   │   ├── AdminApplications.jsx        # Applications pipeline & CSV export
│   │   │   ├── AdminAuditLogs.jsx           # Searchable immutable audit trail
│   │   │   └── RecruiterDashboard.jsx       # Recruiter candidate review & stage updates
│   │   ├── index.css                        # Modern enterprise design system tokens
│   │   ├── App.jsx                          # Main app controller
│   │   └── main.jsx
│   ├── vite.config.js                       # Dev server with proxy to backend
│   └── package.json
├── test-critical-scenario.js                # Automated verification script for Requirement #25
└── README.md

4. Database Setup & Management

The platform features a clean relational database architecture, configured via schema.mysql.sql and managed through dedicated CLI scripts:

Database Commands (inside backend/ directory)

cd backend

# Initialize clean database schema and primary Admin account (Zero dummy records)
npm run db:setup

# Completely reset the database to a fresh clean state
npm run db:reset

# (Optional) Seed demo test students and companies for evaluation
npm run db:seed

Database Schema

The database DDL is centralized in backend/src/config/schema.mysql.sql, defining all 11 relational tables, foreign key cascades, and query performance indexes:

users, students, academic_records, companies, placement_drives, drive_requirements, applications, student_profiles, data_mismatches, audit_logs, notifications.

5. Cloning & Setting Up the Project in a New System

Follow these comprehensive steps to set up and run the platform on a fresh machine or developer workstation.

Step 1: System Prerequisites

Ensure the following tools are installed on your system:

Node.js: v20+ LTS recommended (tested on Node v20.x & v22.14.0)

Verify: node -v

npm: v10+ (bundled with Node.js)

Verify: npm -v

Git:

Verify: git --version

Database Option (choose one):

Option A (Recommended for Production / MySQL): MySQL Server 8.0+ running locally or in cloud.

Option B (Zero-dependency Local SQLite): Native Node.js SQLite (node:sqlite). Requires no external database installation.

Step 2: Clone the Repository

Open a terminal and clone the repository:

git clone <repository-url>
cd PV

Step 3: Backend Setup & Configuration

Navigate to the backend directory and install dependencies:

   cd backend
   npm install

Configure Environment Variables:
Create your .env file by copying the provided template:

Linux / macOS:

     cp .env.example .env

Windows (PowerShell):

     Copy-Item .env.example .env

Windows (Command Prompt):

     copy .env.example .env

Configure Database Connection in backend/.env:
Open backend/.env in your editor:

For MySQL Server (Default):

     PORT=5000
     JWT_SECRET=placement-secret-key-2026-institutional-grade
     DB_TYPE=mysql
     MYSQL_HOST=localhost
     MYSQL_PORT=3306
     MYSQL_USER=root
     MYSQL_PASSWORD=your_mysql_password
     MYSQL_DATABASE=placement_verification
     ADMIN_USERNAME=admin
     ADMIN_EMAIL=admin@placement.edu
     ADMIN_PASSWORD=Admin@123
     SEED_DUMMY_DATA=false

 > *Note*: If using MySQL, create the database first if not auto-created:
 > `CREATE DATABASE placement_verification CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`

For Zero-dependency SQLite Fallback:

     PORT=5000
     JWT_SECRET=placement-secret-key-2026-institutional-grade
     DB_TYPE=sqlite
     DATABASE_PATH=./data/placement.db
     ADMIN_USERNAME=admin
     ADMIN_EMAIL=admin@placement.edu
     ADMIN_PASSWORD=Admin@123
     SEED_DUMMY_DATA=false

Initialize Database Schema & Create Administrator:

   npm run db:setup

This will automatically:

Execute table creation DDL (all 11 relational tables, foreign key constraints, indexes).

Seed the initial system Administrator account (admin@placement.edu / Admin@123).

(Optional) Import Student Academic Master Spreadsheet:
If you have institutional registrar records or want to preload student academic profiles:

   npm run db:import

Step 4: Frontend Setup

Navigate to the frontend directory and install dependencies:

   cd ../frontend
   npm install

Step 5: Starting the Development Servers

Open two separate terminal windows:

Terminal 1 (Backend API Server):

  cd backend
  npm start
  # or for hot-reload during development:
  npm run dev

Backend starts at: http://localhost:5000

Terminal 2 (Frontend Client):

  cd frontend
  npm run dev

Frontend starts at: http://localhost:3000

Step 6: Access & Evaluation

Open your browser and navigate to http://localhost:3000.

Sign in using any of the evaluation credentials:

Admin / Placement Officer: admin@placement.edu | Password: Admin@123

Eligible Student: USN 1MS21CS001 | Password: Student@123

Ineligible Student: USN 1MS21CS042 | Password: Student@123

Corporate Recruiter: recruiter@abc-tech.com | Password: Recruiter@123

6. Automated Verification of Critical Scenario

Run the self-contained verification script from the workspace root:

node test-critical-scenario.js

This verifies:

Primary Administrator authenticates.

Verified student 1MS21CS042 has certified CGPA = 6.80 and 1 backlog.

Live eligibility engine identifies student as ineligible for ABC Technologies (Min 7.50).

Student submits fake CGPA = 8.20 and backlogs = 0 via Google Form simulation.

Mismatch engine detects discrepancy and records entry in data_mismatches.

Malicious client attempts to apply with spoofed payload { cgpa: 8.20 }.

Backend intercepts, ignores payload, uses certified 6.80, and rejects with HTTP 403 Forbidden.

Discrepancy is recorded in audit logs and visible on the admin dashboard.

7. Moving to Production — Production Deployment Guide

Deploying VeriPlace to an institutional production environment requires high availability, security hardening, robust database management, and optimized asset delivery. Follow this guide to transition from development to a secure, enterprise-grade production deployment.

7.1 Production Architecture Overview

                      ┌───────────────────────────────────────────────┐
                      │              Internet / Clients               │
                      └───────────────────────┬───────────────────────┘
                                              │ HTTPS (Port 443)
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │          Nginx Reverse Proxy & SSL            │
                      │  - Let's Encrypt / Institutional TLS Cert     │
                      │  - Gzip / Brotli compression & caching       │
                      │  - Rate limiting & DDoS protection            │
                      └───────────────┬───────────────┬───────────────┘
                                      │               │
            Static Files (/dist)      │               │ Reverse Proxy (/api, /uploads)
                                      ▼               ▼
           ┌────────────────────────────┐    ┌───────────────────────────────┐
           │      Static Frontend       │    │      Node.js Express API      │
           │  (Vite Production Bundle)  │    │  (PM2 Cluster / Docker App)   │
           └────────────────────────────┘    │  Listening on 127.0.0.1:5000  │
                                             └───────────────┬───────────────┘
                                                             │ Connection Pool (SSL)
                                                             ▼
                                             ┌───────────────────────────────┐
                                             │      Production Database      │
                                             │  - MySQL 8.0+ / AWS RDS /     │
                                             │    Cloud SQL (utf8mb4)        │
                                             │  - Automated Daily Backups    │
                                             └───────────────────────────────┘

7.2 Step 1: Production Database Provisioning

For production workloads, use an enterprise-grade relational database such as AWS RDS MySQL, DigitalOcean Managed MySQL, Google Cloud SQL, or a hardened self-hosted MySQL 8.0+ instance.

Create Production Database & Restricted User:

   CREATE DATABASE veriplace_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

   CREATE USER 'veriplace_app'@'%' IDENTIFIED BY 'REPLACE_WITH_STRONG_RANDOM_PASSWORD_32_CHARS';
   GRANT SELECT, INSERT, UPDATE, DELETE ON veriplace_prod.* TO 'veriplace_app'@'%';
   FLUSH PRIVILEGES;

Execute Production Schema:
Run the production MySQL DDL script located at backend/src/config/schema.mysql.sql:

   mysql -h your-db-host.internal -u veriplace_app -p veriplace_prod < backend/src/config/schema.mysql.sql

Or initialize directly through backend configuration:

   cd backend
   npm run db:setup

Database Maintenance & Automated Backups:

Schedule daily automated logical dumps via cron:

     0 2 * * * mysqldump -h your-db-host -u veriplace_app -p'PASSWORD' --single-transaction --quick veriplace_prod | gzip > /var/backups/veriplace_$(date +%F).sql.gz

Retain database snapshots for at least 30–90 days for audit compliance.

7.3 Step 2: Backend Hardening & Configuration

Create Production Environment File (backend/.env):

   NODE_ENV=production
   PORT=5000

   # Generate a 64+ char random key: node -e "console.log(crypto.randomBytes(48).toString('hex'))"
   JWT_SECRET=f9a84b01e23f98c...PROD_STRONG_SECRET_KEY...9821a

   # Production MySQL Configuration
   DB_TYPE=mysql
   MYSQL_HOST=your-db-host.internal
   MYSQL_PORT=3306
   MYSQL_USER=veriplace_app
   MYSQL_PASSWORD=REPLACE_WITH_STRONG_RANDOM_PASSWORD_32_CHARS
   MYSQL_DATABASE=veriplace_prod

   # Institutional Administrator Credentials
   ADMIN_USERNAME=institution_admin
   ADMIN_EMAIL=placement-director@institution.edu
   ADMIN_PASSWORD=REPLACE_WITH_STRONG_ADMIN_PASSWORD

   # Disable demo seed data in production
   SEED_DUMMY_DATA=false

Install Process Manager (PM2):
PM2 ensures zero-downtime reloads, automatic restarts on unexpected crashes, and multi-core clustering:

   npm install -g pm2
   cd backend

   # Start in cluster mode using available CPU cores
   pm2 start src/server.js --name "veriplace-backend" -i max --env production

   # Save process list and generate systemd startup script
   pm2 save
   pm2 startup

7.4 Step 3: Frontend Production Build

Compile the React frontend into minified, hash-versioned static bundles:

cd ../frontend
npm install
npm run build

This generates an optimized production distribution in frontend/dist/:

Bundles are minified and tree-shaken.

Static assets (JS, CSS, SVGs) receive content-hash filenames for immutable long-term browser caching (Cache-Control: max-age=31536000, immutable).

7.5 Step 4: Web Server & Reverse Proxy Setup (Nginx)

Install Nginx on your production server to serve frontend static assets and reverse-proxy API requests to Express on port 5000:

Install Nginx & Certbot:

   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx

Configure Nginx Site (/etc/nginx/sites-available/veriplace):

   server {
       listen 80;
       server_name placement.yourinstitution.edu;

       # Redirect HTTP to HTTPS
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name placement.yourinstitution.edu;

       # SSL Certificates (managed by Certbot)
       ssl_certificate /etc/letsencrypt/live/placement.yourinstitution.edu/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/placement.yourinstitution.edu/privkey.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;

       # Security Headers
       add_header X-Frame-Options "DENY" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy "strict-origin-when-cross-origin" always;
       add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;" always;

       # 1. Frontend Static Files
       root /var/www/veriplace/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Cache static assets with content hashes
       location /assets/ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }

       # 2. Backend REST API Proxy
       location /api/ {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;

           # Timeout settings
           proxy_connect_timeout 60s;
           proxy_send_timeout 60s;
           proxy_read_timeout 60s;
       }

       # 3. Secure File Uploads (Resumes & Documents)
       location /uploads/ {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           client_max_body_size 10M;
       }
   }

Enable Site & Obtain SSL Certificate:

   sudo ln -s /etc/nginx/sites-available/veriplace /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   sudo certbot --nginx -d placement.yourinstitution.edu

7.6 Step 5: Containerized Deployment with Docker (Alternative)

For teams utilizing container orchestration (Docker Swarm, Kubernetes, AWS ECS), you can deploy using the following multi-container setup:

docker-compose.prod.yml:

   version: '3.8'

   services:
     db:
       image: mysql:8.0
       restart: always
       environment:
         MYSQL_ROOT_PASSWORD: RootPasswordSecure2026!
         MYSQL_DATABASE: veriplace_prod
         MYSQL_USER: veriplace_app
         MYSQL_PASSWORD: AppPasswordSecure2026!
       volumes:
         - mysql_data:/var/lib/mysql
         - ./backend/src/config/schema.mysql.sql:/docker-entrypoint-initdb.d/init.sql
       networks:
         - internal_net

     backend:
       build:
         context: ./backend
         dockerfile: Dockerfile
       restart: always
       environment:
         NODE_ENV: production
         PORT: 5000
         DB_TYPE: mysql
         MYSQL_HOST: db
         MYSQL_USER: veriplace_app
         MYSQL_PASSWORD: AppPasswordSecure2026!
         MYSQL_DATABASE: veriplace_prod
         JWT_SECRET: ${JWT_SECRET}
       volumes:
         - uploads_volume:/app/uploads
       depends_on:
         - db
       networks:
         - internal_net

     frontend:
       build:
         context: ./frontend
         dockerfile: Dockerfile
       ports:
         - "80:80"
         - "443:443"
       depends_on:
         - backend
       networks:
         - internal_net

   volumes:
     mysql_data:
     uploads_volume:

   networks:
     internal_net:
       driver: bridge

Launch Production Stack:

   docker compose -f docker-compose.prod.yml up -d --build

7.7 Step 6: Production Security & Compliance Checklist

Before taking the platform live for campus recruitment drives, verify each item:

SSL / TLS Termination: Valid SSL certificate with automatic renewal enabled (certbot renew --dry-run).

Cryptographic Secrets: Strong, non-default JWT_SECRET configured in environment variables.

Administrator Passwords: Default admin credentials replaced with high-entropy institutional passwords.

Database Access Controls: Database port (3306) restricted to internal VPC / localhost and NOT exposed to the public internet.

Audit Trail Storage: Immutable audit log entries in audit_logs table verified; regular backups configured.

Input Sanitization & Rate Limiting: Reverse proxy configured with rate limits on /api/auth/login to prevent credential brute-forcing.

CORS Restriction: Backend CORS origin restricted exclusively to your institutional domain (https://placement.yourinstitution.edu).

File Upload Isolation: File uploads (/uploads) restricted to validated PDF MIME types and maximum size limits (5 MB).

Health Check Monitoring: Setup an uptime monitor pinging https://placement.yourinstitution.edu/api/auth/demo-accounts or root health check.



8. Security Notes

Never commit .env, database credentials, JWT secrets, CA certificates, or production passwords to version control.

Replace all demo credentials before deploying to a real institutional environment.

Use HTTPS in production and enforce TLS for database connections.

Restrict database access to trusted networks and application identities.
