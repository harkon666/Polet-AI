import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { intentRouter } from './routes/intent';
import { healthRouter } from './routes/health';
import { templateRouter } from './routes/template';
import { walletRouter } from './routes/wallet';
import { legacyIntentRouter } from './routes/legacy-intent';
import { passkeyRouter } from './routes/passkey';
import { ikaLifecycleRouter } from './routes/ika-lifecycle';

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
app.route('/legacy/intent', legacyIntentRouter);
app.route('/legacy/template', templateRouter);
app.route('/wallet', walletRouter);
app.route('/passkey', passkeyRouter);
app.route('/ika', ikaLifecycleRouter);

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
  port: parseInt(process.env.PORT || '3001'),
  fetch: app.fetch,
};
