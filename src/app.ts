import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import healthRoutes from './routes/health.routes';
import webhooksRoutes from './routes/webhooks.routes';
import stripeWebhookRoutes from './routes/stripeWebhook.routes';
import apiRoutes from './routes/index';

// Extend Request type to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Stripe webhook needs raw body for signature verification
  // Must be before express.json()
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), (req: Request, _res: Response, next: NextFunction) => {
    req.rawBody = req.body;
    next();
  });

  // Body parsing for all other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // Health check (no auth required)
  app.use('/health', healthRoutes);

  // Webhooks (no API key auth - uses signature verification)
  app.use('/webhooks', webhooksRoutes);
  app.use('/webhooks', stripeWebhookRoutes);

  // API routes (auth required)
  app.use('/api/v1', apiRoutes);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
