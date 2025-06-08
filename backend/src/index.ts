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
import './models/Shipment';
import './models/Carrier';
import './models/Shipper';
import './models/Document';
import './models/EquipmentType';
import './models/AccessorialType';
import './models/ApplicationSettings';
import './models/LaneRate';
// --- END OF MODEL IMPORTS ---

// --- IMPORT ROUTE HANDLERS ---
import { authRoutes } from './routes/auth';
import { shipmentRoutes } from './routes/shipments';
import { carrierRoutes } from './routes/carriers';
import { shipperRoutes } from './routes/shippers';
import { financialRoutes } from './routes/financials';
import { documentRoutes } from './routes/documents';
import { dashboardRoutes } from './routes/dashboard';
import { lookupRoutes } from './routes/lookupRoutes';
import { settingsRoutes } from './routes/settings'; // Assuming this exists
import { laneRateRoutes } from './routes/laneRates'; // Assuming this exists
import { accessorialTypeRoutes } from './routes/accessorialTypes'; // Assuming this exists
// --- END OF ROUTE IMPORTS ---


const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/carriers', carrierRoutes);
app.use('/api/shippers', shipperRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/financials', financialRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/lookups', lookupRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/lanerates', laneRateRoutes);
app.use('/api/accessorial-types', accessorialTypeRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    message: "OpenSource TMS Backend is healthy."
  });
});

app.use((req, res, next) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

mongoose.connect(config.mongoUri)
  .then(() => {
    logger.info(`Successfully connected to MongoDB at ${config.mongoUri.split('@').pop()?.split('/')[0]}`);
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}. Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Frontend URL allowed by CORS: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
    });
  })
  .catch((error) => {
    logger.error('FATAL: Database connection failed. Exiting.', {
        message: error.message,
        mongoHost: config.mongoUri.split('@').pop()?.split('/')[0]
    });
    process.exit(1);
  });

export default app;