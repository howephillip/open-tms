// File: backend/src/index.ts
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/database';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

// --- IMPORT MODELS TO ENSURE REGISTRATION ---
import './models/User';
import './models/Shipment'; // Ensure this uses the LATEST version
import './models/Carrier';
import './models/Shipper';
import './models/Document';
import './models/EquipmentType'; // For DB-driven equipment types
import './models/AccessorialType';
import './models/ApplicationSettings';
import './models/LaneRate';
// Add other models here as you create them (e.g., for other lookup types)
// --- END OF MODEL IMPORTS ---

// --- IMPORT ROUTE HANDLERS ---
import { authRoutes } from './routes/auth';
import { shipmentRoutes } from './routes/shipments';
import { carrierRoutes } from './routes/carriers';
import { shipperRoutes } from './routes/shippers';
import { financialRoutes } from './routes/financials';
import { documentRoutes } from './routes/documents';
import { dashboardRoutes } from './routes/dashboard';
import { lookupRoutes } from './routes/lookupRoutes'; // For DB-driven dropdowns
import { settingsRoutes } from './routes/settings';
import { laneRateRoutes } from './routes/laneRates';
import { accessorialTypeRoutes } from './routes/accessorialTypes';
// --- END OF ROUTE IMPORTS ---


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({ // Configure CORS as needed
  origin: process.env.FRONTEND_URL || 'http://localhost:3001', // Allow your frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' })); // For parsing application/json
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // For parsing application/x-www-form-urlencoded

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/carriers', carrierRoutes);
app.use('/api/shippers', shipperRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/financials', financialRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/lookups', lookupRoutes); // API for fetching dropdown options
app.use('/api/settings', settingsRoutes);
app.use('/api/lanerates', laneRateRoutes);
app.use('/api/accessorial-types', accessorialTypeRoutes);

// Simple Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    timestamp: new Date().toISOString(),
    message: "OpenSource TMS Backend is healthy."
  });
});

// Catch-all for unhandled routes (optional, but good for clearer 404s)
app.use((req, res, next) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized Error Handling Middleware - Must be the last app.use()
app.use(errorHandler);

// Database connection
mongoose.connect(config.mongoUri)
  .then(() => {
    logger.info(`Successfully connected to MongoDB at ${config.mongoUri.split('@').pop()?.split('/')[0]}`); // Log DB host, not full URI for security
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}. Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Frontend URL allowed by CORS: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
    });
  })
  .catch((error) => {
    logger.error('FATAL: Database connection failed. Exiting.', {
        message: error.message,
        // stack: error.stack, // Stack might be too verbose here, primary message is key
        mongoHost: config.mongoUri.split('@').pop()?.split('/')[0]
    });
    process.exit(1);
  });

export default app;