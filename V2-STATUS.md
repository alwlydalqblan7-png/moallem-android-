# معلّم V2

تم تنفيذ نواة V2: الصفوف والشعب والمواد القابلة للتعديل، إدارة الطلاب، ترتيب عربي، دفتر علامات مرن بعلامة عظمى يحددها المدرس، حضور حسب الصف والشعبة، طباعة دفتر العلامات، جلاءات تجريبية، ووضع AI Online/Offline مع الحفاظ على البيانات محلياً.

الذكاء الاصطناعي الحقيقي Online يحتاج API عبر خادم آمن، ولا ينبغي تضمين مفتاح سري داخل التطبيق.


## V2.4 — AI live endpoint
- Production AI endpoint: `https://moallem-ai.liondangerous65.workers.dev/api/ai`
- Cloudflare Worker test: HTTP 200 with JSON `text` response.
- Android build workflow now injects the production endpoint directly.
- Final acceptance still requires installing the new APK and testing AI on a real Android device.
