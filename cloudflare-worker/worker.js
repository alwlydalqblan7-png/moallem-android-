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

  // Cloudflare model responses may also nest text under response/result/output.
  for (const key of ["result", "output", "data"]) {
    if (result?.[key] && typeof result[key] === "object") {
      const nested = extractText(result[key]);
      if (nested) return nested;
    }
  }
  return "";
}

function isPlaceholderText(text) {
  const normalized = String(text || "").trim().replace(/[.!؟]/g, "");
  return !normalized || normalized === "رد بلا نص" || normalized === "لا يوجد نص" || normalized === "empty response";
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
        version: "tai-42-book-grounded-v2.6.4",
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
        405,
      );
    }

    if (url.pathname !== "/api/ai" && url.pathname !== "/") {
      return json(
        {
          error: "Not found",
          code: "not_found",
        },
        404,
      );
    }

    if (!env.AI) {
      return json(
        {
          error: "خدمة Workers AI غير مربوطة بالخادم.",
          code: "missing_ai_binding",
        },
        500,
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
        400,
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
        400,
      );
    }

    if (prompt.length > 12000 || referenceText.length > 50000) {
      return json(
        {
          error: "الطلب طويل جدًا.",
          code: "prompt_too_long",
        },
        413,
      );
    }

    const grade = String(context.grade || "غير محدد");
    const section = String(context.section || "غير محدد");
    const subject = String(context.subject || "غير محدد");
    const bookTitle = String(context.bookTitle || "غير محدد");
    const bookFileName = String(context.bookFileName || bookTitle || "غير محدد");
    const librarySubject = String(context.librarySubject || "غير محدد");
    const libraryBranch = String(context.libraryBranch || "");
    const lessonTitle = String(context.lessonTitle || "غير محدد");
    const pageStart = String(context.pageStart || "غير محدد");
    const pageEnd = String(context.pageEnd || "غير محدد");
    const lessonDate = String(context.lessonDate || "غير محدد");

    if (context.task === "lesson_preparation" && !referenceText) {
      return json(
        {
          error: "لم يصل نص الصفحات المرجعية من الكتاب.",
          code: "missing_reference_text",
        },
        400,
      );
    }

    const systemPrompt = `
أنت المساعد الذكي داخل تطبيق «معلّم»، وهو تطبيق عربي مخصص للمدرسين في المنهاج السوري.

السياق الحالي:
الصف: ${grade}
الشعبة: ${section}
المادة: ${subject}
الكتاب: ${bookTitle}
ملف PDF المصدر الحقيقي: ${bookFileName}
تصنيف الكتاب في المكتبة: ${librarySubject}${libraryBranch ? ` / ${libraryBranch}` : ""}
الدرس/الوحدة: ${lessonTitle}
الصفحات: ${pageStart} إلى ${pageEnd}
التاريخ: ${lessonDate}

قواعد الإجابة:
- أجب بالعربية الواضحة والسليمة.
- اجعل الإجابة عملية ومباشرة وقابلة للاستخدام داخل الصف.
- إذا أرسل التطبيق نصًا مستخرجًا من كتاب PDF، فهذا النص هو المصدر الوحيد لمحتوى التحضير والتزم به حصراً.
- اسم المادة أو تصنيف الكتاب معلومات تنظيمية فقط، ولا يجوز استخدامها كمصدر بديل عن نص ملف PDF المحدد.
- لا تدّعِ وجود معلومة أو درس في الكتاب إن لم تكن موجودة في النص المرسل.
- لا تخترع وحدات أو دروسًا أو صفحات.
- إذا كان جزء من المطلوب غير واضح في النص، اذكر ذلك صراحة.
- أكمل المهمة حتى النهاية ولا تتوقف بعد الأهداف.
- لا تستخدم عناوين إنكليزية إلا إذا كانت موجودة أصلًا في النص المرسل.

عند طلب تحضير درس التزم بنموذج 2026–2027: المعلومات العامة، نواتج قابلة للقياس، التمهيد والمفاهيم، الاستراتيجيات والأنشطة، سير الدرس ودور المعلم والمتعلم، الوسائل، تجربة أو نشاط آمن إن دعمه النص، التقويم المرحلي، التقويم النهائي المستقل، الواجب، الملاحظات، وملخص المدرس.

قواعد ملزمة:
- تعامل مع «علم الأحياء والأرض» و«الفيزياء» و«الكيمياء» كمواد تحضير مستقلة ولا تخلط بينها، حتى لو جُمعت علاماتها في الجلاء تحت «العلوم العامة».
- افصل التقويم المرحلي عن التقويم النهائي.
- صغ الأهداف بأفعال قابلة للملاحظة والقياس.
- لا تضف تجربة أو معلومة لا يدعمها نص الصفحات المحددة.
`.trim();

    try {
      const groundedPrompt = referenceText
        ? `${prompt}\n\nالنص المرجعي المستخرج من الكتاب:\n---\n${referenceText}\n---`
        : prompt;
      const result = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
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
        max_completion_tokens: 3200,
      });

      let text = extractText(result);

      // Some older/partial model responses can contain a placeholder instead of the lesson.
      // Retry once with a shorter explicit instruction while preserving the same book text.
      if (isPlaceholderText(text)) {
        const retry = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `${groundedPrompt}\n\nمهم: أعد التحضير الآن كنص عربي كامل. لا ترسل عبارة رد بلا نص ولا إجابة فارغة.`,
            },
          ],
          max_completion_tokens: 3200,
        });
        text = extractText(retry);
      }

      if (isPlaceholderText(text)) {
        return json(
          {
            error: "خدمة الذكاء لم تُرجع نص التحضير بعد محاولتين.",
            code: "empty_ai_response",
            result_keys:
              result && typeof result === "object" ? Object.keys(result) : [],
          },
          502,
        );
      }

      return json({
        text,
        provider: "cloudflare-workers-ai",
        model: "@cf/zai-org/glm-4.7-flash",
        source: {
          bookTitle,
          bookFileName,
          pageStart,
          pageEnd,
          referenceChars: referenceText.length,
        },
      });
    } catch (error) {
      return json(
        {
          error: "تعذر تنفيذ الطلب عبر Workers AI.",
          code: "workers_ai_error",
          message: String(error?.message || error || "Unknown error"),
        },
        502,
      );
    }
  },
};
