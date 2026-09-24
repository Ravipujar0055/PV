import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { initDatabase } from './config/database.js';
import { seedInitialData } from './services/seedData.js';
import apiRouter from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving (resumes)
app.use('/uploads', express.static(uploadDir));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    system: 'Smart Placement Registration & Eligibility Verification System',
    databaseEngine: process.env.DB_TYPE || 'mysql'
  });
});

// Mount Central API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

async function startServer() {
  // Initialize Database Schema and Admin
  await initDatabase();

  // Only seed dummy data if explicitly requested via environment variable
  if (process.env.SEED_DUMMY_DATA === 'true') {
    console.log('SEED_DUMMY_DATA is true: Seeding demo accounts and mock placement drives...');
    await seedInitialData();
  } else {
    console.log(`Database initialized in CLEAN mode (Zero dummy data, Admin account active) using [${process.env.DB_TYPE || 'mysql'}].`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`Placement Verification Backend running on port ${PORT}`);
    console.log(`Database Engine: ${process.env.DB_TYPE || 'mysql'}`);
    console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

startServer().catch(err => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
