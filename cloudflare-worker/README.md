# خادم الذكاء لتطبيق معلّم

1. أنشئ Cloudflare Worker باسم `moallem-ai`.
2. ضع محتوى `worker.js` في العامل.
3. من Settings > Variables and Secrets أضف Secret باسم `OPENAI_API_KEY`.
4. انشر العامل وخذ الرابط، مثال: `https://moallem-ai.<subdomain>.workers.dev/api/ai`.
5. عند بناء التطبيق اضبط `VITE_AI_API_URL` على رابط العامل الكامل.

لا تضع مفتاح OpenAI داخل كود التطبيق أو ملف APK.
