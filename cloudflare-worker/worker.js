const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const VERSION = 'tai-39-workers-ai-1';
const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
  });
}

function extractWorkersAiText(data) {
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (typeof data?.response === 'string' && data.response.trim()) return data.response.trim();
  if (typeof data?.result?.response === 'string' && data.result.response.trim()) return data.result.response.trim();
  if (typeof data?.text === 'string' && data.text.trim()) return data.text.trim();
  return '';
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json({
        ok: true,
        service: 'moallem-ai',
        version: VERSION,
        provider: 'cloudflare-workers-ai',
        model: env.AI_MODEL || DEFAULT_MODEL,
        ai_binding_configured: Boolean(env.AI),
      });
    }

    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (url.pathname !== '/api/ai' && url.pathname !== '/') return json({ error: 'Not found' }, 404);

    if (!env.AI || typeof env.AI.run !== 'function') {
      return json({
        error: 'خدمة الذكاء غير مرتبطة بالخادم بعد.',
        code: 'missing_workers_ai_binding',
        version: VERSION,
      }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'طلب غير صالح.' }, 400);
    }

    const prompt = String(body?.prompt || '').trim();
    const context = body?.context || {};

    if (!prompt) return json({ error: 'اكتب طلبًا أولًا.' }, 400);
    if (prompt.length > 6000) return json({ error: 'الطلب طويل جدًا.' }, 413);

    const grade = String(context.grade || 'غير محدد');
    const section = String(context.section || 'غير محدد');
    const subject = String(context.subject || 'غير محدد');

    const systemPrompt = `أنت مساعد تربوي عربي داخل تطبيق «معلّم». ساعد المدرس بإجابات عملية ومنظمة ومناسبة للمدرسة.\nالصف: ${grade}\nالشعبة: ${section}\nالمادة: ${subject}\nاكتب بالعربية الواضحة. عند طلب تحضير درس استخدم: الأهداف، التمهيد، الأفكار الأساسية، نشاط صفي، تقويم سريع، واجب/مراجعة. إذا لم تكن واثقًا من معلومة منهجية دقيقة فاذكر ذلك بوضوح ولا تخترعها.`;

    try {
      const model = env.AI_MODEL || DEFAULT_MODEL;
      const result = await env.AI.run(model, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1400,
      });

      const text = extractWorkersAiText(result);
      if (!text) {
        return json({
          error: 'لم تصل إجابة نصية صالحة من خدمة الذكاء.',
          code: 'empty_ai_response',
          provider: 'cloudflare-workers-ai',
          model,
          version: VERSION,
        }, 502);
      }

      return json({
        text,
        provider: 'cloudflare-workers-ai',
        model,
        version: VERSION,
      });
    } catch (error) {
      return json({
        error: 'تعذر تنفيذ الطلب عبر خدمة الذكاء حاليًا.',
        code: 'workers_ai_request_failed',
        detail: String(error?.message || 'unknown_error').slice(0, 240),
        provider: 'cloudflare-workers-ai',
        version: VERSION,
      }, 502);
    }
  },
};
