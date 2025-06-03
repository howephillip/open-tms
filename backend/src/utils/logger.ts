import winston from 'winston';

const { combine, timestamp, printf, colorize, align } = winston.format;

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    colorize({ all: true }),
    timestamp({
      format: 'YYYY-MM-DD hh:mm:ss.SSS A',
    }),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console(),
  ],
  exceptionHandlers: [
    new winston.transports.Console({
        format: combine(
            colorize({ all: true }),
            timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS A' }),
            align(),
            printf((info) => `[${info.timestamp}] ${info.level}: UNCAUGHT EXCEPTION: ${info.message} \n${info.stack}`)
        )
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
         format: combine(
            colorize({ all: true }),
            timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS A' }),
            align(),
            printf((info) => `[${info.timestamp}] ${info.level}: UNHANDLED REJECTION: ${info.message} \n${info.stack}`)
        )
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
        colorize({ all: true }),
        printf((info) => `${info.level}: ${info.message}`)
    ),
    // Explicitly set level for this console transport in dev if needed
    // level: 'debug', 
  }));
}