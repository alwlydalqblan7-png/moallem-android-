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
        version: "tai-42-pdf-grounding-1",
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
    const referenceText = String(body?.referenceText || "").trim();
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

    if (prompt.length > 12000 || referenceText.length > 50000) {
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
    const bookTitle = String(context.bookTitle || "غير محدد");
    const lessonTitle = String(context.lessonTitle || "غير محدد");
    const pageStart = String(context.pageStart || "غير محدد");
    const pageEnd = String(context.pageEnd || "غير محدد");

    if (context.task === "lesson_preparation" && !referenceText) {
      return json({error:"لم يصل نص الصفحات المرجعية من الكتاب.",code:"missing_reference_text"},400);
    }

    const systemPrompt = `
أنت المساعد الذكي داخل تطبيق «معلّم»، وهو تطبيق عربي مخصص للمدرسين.

السياق الحالي:
الصف: ${grade}
الشعبة: ${section}
المادة: ${subject}
الكتاب: ${bookTitle}
الدرس: ${lessonTitle}
الصفحات: ${pageStart} إلى ${pageEnd}

قواعد الإجابة:
- أجب باللغة العربية الواضحة والسليمة.
- اجعل الإجابة عملية ومباشرة ومناسبة للمدرس.
- راعِ الصف والمادة المحددين.
- عندما يوجد نص مرجعي، التزم به وحده ولا تضف حقائق تعليمية من خارج الصفحات.
- إذا كان النص لا يكفي لتغطية بند، اكتب «غير واضح في الصفحات المحددة» بدل اختراع الإجابة.
- إذا لم تكن المعلومات كافية، وضّح ذلك ولا تخترع معلومات.

إذا طلب المدرس تحضير درس، استخدم هذا الترتيب:
1. عنوان الدرس
2. الأهداف التعليمية
3. التمهيد
4. المفاهيم الأساسية
5. شرح وسير الدرس
6. نشاط صفي
7. أسئلة تقويم
8. واجب منزلي
9. ملخص سريع للمدرس
`.trim();

    try {
      const groundedPrompt = referenceText
        ? `${prompt}\n\nالنص المرجعي المستخرج من الكتاب:\n---\n${referenceText}\n---`
        : prompt;
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
              content: groundedPrompt,
            },
          ],
          max_completion_tokens: 1400,
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
