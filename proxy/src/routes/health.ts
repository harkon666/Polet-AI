import { Hono } from 'hono';

export const healthRouter = new Hono();

healthRouter.get('/', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    }
  });
});