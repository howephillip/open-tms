"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, printf, colorize, align } = winston_1.default.format;
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(colorize({ all: true }), timestamp({
        format: 'YYYY-MM-DD hh:mm:ss.SSS A',
    }), align(), printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)),
    transports: [
        new winston_1.default.transports.Console(),
    ],
    exceptionHandlers: [
        new winston_1.default.transports.Console({
            format: combine(colorize({ all: true }), timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS A' }), align(), printf((info) => `[${info.timestamp}] ${info.level}: UNCAUGHT EXCEPTION: ${info.message} \n${info.stack}`))
        }),
    ],
    rejectionHandlers: [
        new winston_1.default.transports.Console({
            format: combine(colorize({ all: true }), timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS A' }), align(), printf((info) => `[${info.timestamp}] ${info.level}: UNHANDLED REJECTION: ${info.message} \n${info.stack}`))
        })
    ]
});
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: combine(colorize({ all: true }), printf((info) => `${info.level}: ${info.message}`)),
        // Explicitly set level for this console transport in dev if needed
        // level: 'debug', 
    }));
}
//# sourceMappingURL=logger.js.map