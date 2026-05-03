import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { intentRouter } from './routes/intent.js';
import { healthRouter } from './routes/health.js';
import { templateRouter } from './routes/template.js';
import { walletRouter } from './routes/wallet.js';
import { agentRouter } from './routes/agent.js';

const app = new Hono();

// CORS middleware for AI agent SDK
app.use('/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Polet-Intent'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}));

// Routes
app.route('/health', healthRouter);
app.route('/intent', intentRouter);
app.route('/template', templateRouter);
app.route('/wallet', walletRouter);
app.route('/agent', agentRouter);

// Error handling middleware
app.onError((err, c) => {
  console.error('Proxy error:', err);
  return c.json({
    success: false,
    error: {
      code: 'PROXY_ERROR',
      message: err.message || 'Internal proxy error',
    }
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${c.req.path} not found`,
    }
  }, 404);
});

export default {
  port: parseInt(process.env.PORT || '3000'),
  fetch: app.fetch,
};