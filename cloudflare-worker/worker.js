const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
  });
}

function extractText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const parts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string' && content.text.trim()) parts.push(content.text.trim());
    }
  }
  return parts.join('\n').trim();
}

function safeUpstreamError(data, status) {
  return {
    error: data?.error?.message || 'فشل خادم الذكاء في تنفيذ الطلب.',
    code: data?.error?.code || null,
    type: data?.error?.type || null,
    upstream_status: status,
  };
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
        version: 'tai-39-fix-1',
        model: env.OPENAI_MODEL || 'gpt-5.6-luna',
        api_key_configured: Boolean(env.OPENAI_API_KEY),
      });
    }

    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (url.pathname !== '/api/ai' && url.pathname !== '/') return json({ error: 'Not found' }, 404);
    if (!env.OPENAI_API_KEY) {
      return json({ error: 'الخادم غير مهيأ بعد: مفتاح خدمة الذكاء غير موجود.', code: 'missing_api_key' }, 500);
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

    const instructions = `أنت مساعد تربوي عربي لتطبيق «معلّم». ساعد المدرس بإجابات عملية ومنظمة ومناسبة للمدرسة.\nالصف: ${grade}\nالشعبة: ${section}\nالمادة: ${subject}\nاكتب بالعربية الواضحة. عند طلب تحضير درس، استخدم: الأهداف، التمهيد، الأفكار الأساسية، نشاط صفي، تقويم سريع، واجب/مراجعة. لا تخترع معلومات دراسية دقيقة إن لم تكن واثقًا؛ صرّح بذلك.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      let apiResponse;
      try {
        apiResponse = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: env.OPENAI_MODEL || 'gpt-5.6-luna',
            instructions,
            input: prompt,
            reasoning: { effort: 'none' },
            max_output_tokens: 1400,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      const raw = await apiResponse.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }

      if (!apiResponse.ok) {
        const payload = safeUpstreamError(data, apiResponse.status);
        return json(payload, apiResponse.status >= 500 ? 502 : apiResponse.status);
      }

      const text = extractText(data);
      if (!text) {
        return json({
          error: 'لم تصل إجابة نصية صالحة من خدمة الذكاء.',
          code: 'empty_ai_response',
          upstream_status: apiResponse.status,
        }, 502);
      }

      return json({ text });
    } catch (error) {
      return json({
        error: error?.name === 'AbortError'
          ? 'انتهت مهلة الاتصال بخدمة الذكاء. حاول مرة أخرى.'
          : 'تعذر الاتصال بخدمة الذكاء حاليًا. حاول بعد قليل.',
        code: error?.name === 'AbortError' ? 'upstream_timeout' : 'upstream_network_error',
      }, 502);
    }
  },
};
