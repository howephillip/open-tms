"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/opensource-tms',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    emailConfig: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.EMAIL_USER || '',
            pass: process.env.EMAIL_PASS || ''
        }
    },
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    saferApiKey: process.env.SAFER_API_KEY || ''
};
//# sourceMappingURL=database.js.map