import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

interface ServiceStatus {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    transfi: ServiceStatus;
  };
}

async function checkTransFiHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    // Use the live-rates endpoint as a simple health check
    const auth = Buffer.from(
      `${config.transfi.username}:${config.transfi.password}`
    ).toString('base64');

    const response = await axios.get(
      `${config.transfi.baseUrl}/v2/exchange-rates/live-rates`,
      {
        params: { currency: 'USD' },
        headers: {
          Authorization: `Basic ${auth}`,
          MID: config.transfi.mid,
          Accept: 'application/json',
        },
        timeout: 10000,
      }
    );

    const latency = Date.now() - startTime;

    if (response.status === 200) {
      return { status: 'healthy', latency };
    }

    return {
      status: 'unhealthy',
      latency,
      error: `Unexpected status: ${response.status}`,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.warn('TransFi health check failed', { error: errorMessage, latency });

    return {
      status: 'unhealthy',
      latency,
      error: errorMessage,
    };
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const transfiStatus = await checkTransFiHealth();

  const overallStatus: 'ok' | 'degraded' | 'error' =
    transfiStatus.status === 'healthy' ? 'ok' : 'degraded';

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    services: {
      transfi: transfiStatus,
    },
  };

  const statusCode = overallStatus === 'ok' ? 200 : 503;
  res.status(statusCode).json(response);
});

export default router;
