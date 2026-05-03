import { Hono } from 'hono';
import {
  getPolicyTemplates,
  getTemplateById,
  createPolicyFromTemplate,
  type TemplateId,
} from '../lib/policy-templates';
import type { Policy } from '../types/intent';

export const templateRouter = new Hono();

/**
 * GET /template/list
 * Get all available policy templates with metadata
 */
templateRouter.get('/list', async (c) => {
  try {
    const templates = getPolicyTemplates();

    return c.json({
      success: true,
      data: {
        templates: templates.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          useCase: t.useCase,
          options: t.options,
        })),
      }
    });
  } catch (e) {
    console.error('Template list error:', e);
    return c.json({
      success: false,
      error: {
        code: 'TEMPLATE_LIST_ERROR',
        message: e instanceof Error ? e.message : 'Failed to get templates',
      }
    }, 500);
  }
});

/**
 * GET /template/:id
 * Get a specific template by ID
 */
templateRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id') as TemplateId;
    const template = getTemplateById(id);

    if (!template) {
      return c.json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template '${id}' not found`,
        }
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          useCase: template.useCase,
          policy: template.policy,
          options: template.options,
        },
      }
    });
  } catch (e) {
    console.error('Template get error:', e);
    return c.json({
      success: false,
      error: {
        code: 'TEMPLATE_GET_ERROR',
        message: e instanceof Error ? e.message : 'Failed to get template',
      }
    }, 500);
  }
});

/**
 * POST /template/apply
 * Apply a template and get the resulting policy
 */
templateRouter.post('/apply', async (c) => {
  try {
    const body = await c.req.json();
    const { templateId, customAllowlist, customBlocklist, dailyLimitAmount, maxTransactionAmount } = body;

    if (!templateId) {
      return c.json({
        success: false,
        error: {
          code: 'MISSING_TEMPLATE_ID',
          message: 'templateId is required',
        }
      }, 400);
    }

    const policy = createPolicyFromTemplate(templateId as TemplateId, {
      customAllowlist,
      customBlocklist,
      dailyLimitAmount,
      maxTransactionAmount,
    });

    if (!policy) {
      return c.json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template '${templateId}' not found`,
        }
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        policy,
      }
    });
  } catch (e) {
    console.error('Template apply error:', e);
    return c.json({
      success: false,
      error: {
        code: 'TEMPLATE_APPLY_ERROR',
        message: e instanceof Error ? e.message : 'Failed to apply template',
      }
    }, 500);
  }
});