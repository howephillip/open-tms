"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// File: backend/src/index.ts
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const database_1 = require("./config/database");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
// --- IMPORT MODELS TO ENSURE REGISTRATION ---
require("./models/User");
require("./models/Shipment"); // Ensure this uses the LATEST version
require("./models/Carrier");
require("./models/Shipper");
require("./models/Document");
require("./models/EquipmentType"); // For DB-driven equipment types
require("./models/AccessorialType");
// Add other models here as you create them (e.g., for other lookup types)
// --- END OF MODEL IMPORTS ---
// --- IMPORT ROUTE HANDLERS ---
const auth_1 = require("./routes/auth");
const shipments_1 = require("./routes/shipments");
const carriers_1 = require("./routes/carriers");
const shippers_1 = require("./routes/shippers");
const financials_1 = require("./routes/financials");
const documents_1 = require("./routes/documents");
const dashboard_1 = require("./routes/dashboard");
const lookupRoutes_1 = require("./routes/lookupRoutes"); // For DB-driven dropdowns
// --- END OF ROUTE IMPORTS ---
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)()); // Security headers
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001', // Allow your frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '50mb' })); // For parsing application/json
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' })); // For parsing application/x-www-form-urlencoded
// API Routes
app.use('/api/auth', auth_1.authRoutes);
app.use('/api/shipments', shipments_1.shipmentRoutes);
app.use('/api/carriers', carriers_1.carrierRoutes);
app.use('/api/shippers', shippers_1.shipperRoutes);
app.use('/api/documents', documents_1.documentRoutes);
app.use('/api/financials', financials_1.financialRoutes);
app.use('/api/dashboard', dashboard_1.dashboardRoutes);
app.use('/api/lookups', lookupRoutes_1.lookupRoutes); // API for fetching dropdown options
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
app.use(errorHandler_1.errorHandler);
// Database connection
mongoose_1.default.connect(database_1.config.mongoUri)
    .then(() => {
    logger_1.logger.info(`Successfully connected to MongoDB at ${database_1.config.mongoUri.split('@').pop()?.split('/')[0]}`); // Log DB host, not full URI for security
    app.listen(PORT, () => {
        logger_1.logger.info(`Server running on port ${PORT}. Environment: ${process.env.NODE_ENV || 'development'}`);
        logger_1.logger.info(`Frontend URL allowed by CORS: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
    });
})
    .catch((error) => {
    logger_1.logger.error('FATAL: Database connection failed. Exiting.', {
        message: error.message,
        // stack: error.stack, // Stack might be too verbose here, primary message is key
        mongoHost: database_1.config.mongoUri.split('@').pop()?.split('/')[0]
    });
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map