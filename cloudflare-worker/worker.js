const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

function extractText(result) {
  if (!result) return "";

  const choiceText = result?.choices?.[0]?.message?.content;

  if (typeof choiceText === "string" && choiceText.trim()) {
    return choiceText.trim();
  }

  if (Array.isArray(choiceText)) {
    const joined = choiceText
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item?.text === "string") return item.text;
        if (typeof item?.content === "string") return item.content;
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();

    if (joined) return joined;
  }

  if (typeof result.response === "string" && result.response.trim()) {
    return result.response.trim();
  }

  if (typeof result.text === "string" && result.text.trim()) {
    return result.text.trim();
  }

  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  return "";
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);

    if (
      request.method === "GET" &&
      (url.pathname === "/" || url.pathname === "/health")
    ) {
      return json({
        ok: true,
        service: "moallem-ai",
        version: "tai-42-full-lesson-3200",
        provider: "cloudflare-workers-ai",
        model: "@cf/zai-org/glm-4.7-flash",
        ai_binding_configured: Boolean(env.AI),
      });
    }

    if (request.method !== "POST") {
      return json(
        {
          error: "Method not allowed",
          code: "method_not_allowed",
        },
        405
      );
    }

    if (url.pathname !== "/api/ai" && url.pathname !== "/") {
      return json(
        {
          error: "Not found",
          code: "not_found",
        },
        404
      );
    }

    if (!env.AI) {
      return json(
        {
          error: "خدمة Workers AI غير مربوطة بالخادم.",
          code: "missing_ai_binding",
        },
        500
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json(
        {
          error: "الطلب غير صالح.",
          code: "invalid_json",
        },
        400
      );
    }

    const prompt = String(body?.prompt || "").trim();
    const context = body?.context || {};

    if (!prompt) {
      return json(
        {
          error: "اكتب طلبًا أولًا.",
          code: "missing_prompt",
        },
        400
      );
    }

    if (prompt.length > 24000) {
      return json(
        {
          error: "الطلب طويل جدًا.",
          code: "prompt_too_long",
        },
        413
      );
    }

    const grade = String(context.grade || "غير محدد");
    const section = String(context.section || "غير محدد");
    const subject = String(context.subject || "غير محدد");

    const systemPrompt = `
أنت المساعد الذكي داخل تطبيق «معلّم»، وهو تطبيق عربي مخصص للمدرسين في المنهاج السوري.

السياق الحالي:
الصف: ${grade}
الشعبة: ${section}
المادة: ${subject}

قواعد الإجابة:
- أجب بالعربية الواضحة والسليمة.
- اجعل الإجابة عملية ومباشرة وقابلة للاستخدام داخل الصف.
- إذا أرسل التطبيق نصًا مستخرجًا من كتاب PDF، اعتبر هذا النص المصدر الأساسي والتزم به.
- لا تدّعِ وجود معلومة أو درس في الكتاب إن لم تكن موجودة في النص المرسل.
- لا تخترع وحدات أو دروسًا أو صفحات.
- إذا كان جزء من المطلوب غير واضح في النص، اذكر ذلك صراحة.
- أكمل المهمة حتى النهاية ولا تتوقف بعد الأهداف.
- لا تستخدم عناوين إنكليزية إلا إذا كانت موجودة أصلًا في النص المرسل.

عند طلب تحضير درس، يجب أن تحتوي الإجابة كاملة على الأقسام الآتية:
1. بيانات الدرس.
2. عنوان الدرس.
3. الأهداف التعليمية.
4. الوسائل والأدوات.
5. التمهيد.
6. المفاهيم والمصطلحات الأساسية.
7. شرح وسير الدرس خطوة بخطوة.
8. توزيع الحصة أو الحصص.
9. نشاط صفي أو تطبيقي.
10. أسئلة الدرس — قسم إلزامي:
   - 5 أسئلة شفهية مباشرة مع الإجابات النموذجية.
   - 5 أسئلة اختيار من متعدد، 4 خيارات لكل سؤال، مع تحديد الإجابة الصحيحة.
   - 3 أسئلة صح أو خطأ مع تصحيح العبارة الخاطئة.
   - 3 أسئلة تفكير وفهم واستنتاج مع الإجابات النموذجية.
11. التقويم النهائي مع الإجابات النموذجية.
12. الواجب المنزلي.
13. ملاحظات للمعلم.
14. ملخص سريع للدرس.

يجب عدم حذف قسم الأسئلة أو الإجابات النموذجية حتى لو كانت الإجابة طويلة.
`.trim();

    try {
      const result = await env.AI.run(
        "@cf/zai-org/glm-4.7-flash",
        {
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_completion_tokens: 3200,
        }
      );

      const text = extractText(result);

      if (!text) {
        return json(
          {
            error: "وصل رد من خدمة الذكاء لكن بدون نص صالح.",
            code: "empty_ai_response",
            result_keys:
              result && typeof result === "object"
                ? Object.keys(result)
                : [],
          },
          502
        );
      }

      return json({
        text,
        provider: "cloudflare-workers-ai",
        model: "@cf/zai-org/glm-4.7-flash",
      });
    } catch (error) {
      return json(
        {
          error: "تعذر تنفيذ الطلب عبر Workers AI.",
          code: "workers_ai_error",
          message: String(
            error?.message || error || "Unknown error"
          ),
        },
        502
      );
    }
  },
};
