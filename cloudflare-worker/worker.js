const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
  });
}

function extractText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content?.text === 'string') parts.push(content.text);
      else if (typeof content?.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const url = new URL(request.url);
    if (url.pathname !== '/api/ai' && url.pathname !== '/') return json({ error: 'Not found' }, 404);
    if (!env.OPENAI_API_KEY) return json({ error: 'الخادم غير مهيأ بعد: مفتاح خدمة الذكاء غير موجود.' }, 500);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'طلب غير صالح.' }, 400); }

    const prompt = String(body?.prompt || '').trim();
    const context = body?.context || {};
    if (!prompt) return json({ error: 'اكتب طلبًا أولًا.' }, 400);
    if (prompt.length > 6000) return json({ error: 'الطلب طويل جدًا.' }, 413);

    const grade = String(context.grade || 'غير محدد');
    const section = String(context.section || 'غير محدد');
    const subject = String(context.subject || 'غير محدد');

    const instructions = `أنت مساعد تربوي عربي لتطبيق «معلّم». ساعد المدرس بإجابات عملية ومنظمة ومناسبة للمدرسة.\nالصف: ${grade}\nالشعبة: ${section}\nالمادة: ${subject}\nاكتب بالعربية الواضحة. عند طلب تحضير درس، استخدم: الأهداف، التمهيد، الأفكار الأساسية، نشاط صفي، تقويم سريع، واجب/مراجعة. لا تخترع معلومات دراسية دقيقة إن لم تكن واثقًا؛ صرّح بذلك.`;

    try {
      const apiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-5.6-luna',
          instructions,
          input: prompt,
          max_output_tokens: 1400,
        }),
      });

      const data = await apiResponse.json().catch(() => ({}));
      if (!apiResponse.ok) {
        const message = data?.error?.message || 'فشل خادم الذكاء في تنفيذ الطلب.';
        return json({ error: message }, apiResponse.status >= 500 ? 502 : 400);
      }

      const text = extractText(data);
      if (!text) return json({ error: 'لم تصل إجابة نصية صالحة من خدمة الذكاء.' }, 502);
      return json({ text });
    } catch (error) {
      return json({ error: 'تعذر الاتصال بخدمة الذكاء حاليًا. حاول بعد قليل.' }, 502);
    }
  },
};
