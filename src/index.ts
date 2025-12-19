import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const app = createApp();

app.listen(config.port, () => {
  logger.info(`Server started`, {
    port: config.port,
    environment: config.nodeEnv,
  });
  logger.info(`Health check available at http://localhost:${config.port}/health`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', { reason });
  process.exit(1);
});
