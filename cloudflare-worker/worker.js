const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...corsHeaders,
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname !== "/api/ai") {
      return json({ ok: true, service: "moallem-ai" });
    }

    if (request.method !== "POST") {
      return json({ error: "طريقة الطلب غير مدعومة" }, 405);
    }

    try {
      if (!env.AI) {
        return json({ error: "Workers AI binding غير مضاف" }, 500);
      }

      const body = await request.json();
      const prompt = String(body?.prompt || "").trim();
      const context = body?.context || {};

      if (!prompt) {
        return json({ error: "الطلب فارغ" }, 400);
      }

      const systemPrompt =
        "أنت مساعد ذكي للمعلم السوري. اكتب بالعربية الواضحة والمنظمة. " +
        "ساعد في تحضير الدروس والأسئلة والأنشطة الصفية. " +
        "راعِ عمر الطلاب ومستوى الصف، ولا تخترع معلومات غير مؤكدة.";

      const userPrompt = `
الصف: ${context.grade || "غير محدد"}
الشعبة: ${context.section || "غير محددة"}
المادة: ${context.subject || "غير محددة"}

طلب المعلم:
${prompt}
`;

      const result = await env.AI.run(
        "@cf/zai-org/glm-4.7-flash",
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        }
      );

      const text =
        result?.choices?.[0]?.message?.content ||
        result?.response ||
        "";

      if (!text) {
        return json({
          error: "تم الاتصال بالنموذج لكن لم يصل نص",
          debug: result
        }, 502);
      }

      return json({ text });
    } catch (error) {
      return json({
        error: "حدث خطأ أثناء تشغيل المساعد الذكي",
        details: String(error?.message || error)
      }, 500);
    }
  }
};
