# TAI-45 Foundation

- Syrian general science structure for grades 7-9 is modeled as one parent subject: العلوم العامة.
- Branch maxima: علم الأحياء والأرض 200, الفيزياء 120, الكيمياء 80, total 400.
- Library books can carry a branch label while remaining under العلوم العامة.
- Each library book now exposes a التخطيط action.
- Planner settings: term start/end, periods per week, holidays/stoppages.
- Planner settings are persisted locally per book.
- Guardrail: no curriculum distribution is generated until real PDF index/page extraction is implemented. This prevents invented lesson names.
- Next implementation step: extract/index PDF text/pages, then generate canonical semester plan and derive monthly/weekly views.
