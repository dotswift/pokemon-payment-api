import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import healthRoutes from './routes/health.routes';
import apiRoutes from './routes/index';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // Health check (no auth required)
  app.use('/health', healthRoutes);

  // API routes (auth required)
  app.use('/api/v1', apiRoutes);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
