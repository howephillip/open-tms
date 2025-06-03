"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger"); // We'll create this next
const errorHandler = (err, req, res, next) => {
    logger_1.logger.error(err.message, {
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body, // Be careful logging full body in production
        params: req.params,
        query: req.query
    });
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }), // Only show stack in dev
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map