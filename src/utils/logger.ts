import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }

  if (stack) {
    log += `\n${stack}`;
  }

  return log;
});

const developmentFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  logFormat
);

const productionFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.logging.level,
  format: config.isDevelopment() ? developmentFormat : productionFormat,
  transports: [
    new winston.transports.Console(),
  ],
  exitOnError: false,
});

export default logger;
