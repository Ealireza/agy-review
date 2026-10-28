# agy-review

**مراجع مستقل عليه أن يعرض دليله.** مراجعة الكود، والمراجعة الأمنية، وتفويض المهام، والترجمة عبر Google Antigravity (`agy`)، من Claude Code أو Codex أو أي terminal. يعمل للقراءة فقط، ولا يعرض طلبات صلاحيات، ويتحقق من كل نتيجة بالرجوع إلى الكود الفعلي قبل أن تراها.

> ## جديد: توقّف عن إنفاق tokens الخاصة بـ Claude وCodex لتحديث graphify graph
>
> **تُشغَّل تحديثات graphify الآن على Antigravity، في الخلفية، مع كل commit وmerge وcheckout وrebase. ينفق Agent ‏0 tokens عليها، ولا تحتاج إلى API key.**
>
> يعيد أمر واحد، `agy-review --graphify setup`، تسجيل git hooks الخاصة بـ graphify، بحيث **يُنجَز الجزء المكلف من كل تحديث للرسم (قراءة مستنداتك وتسمية المجموعات باستخدام language model) بواسطة model رخيص على Antigravity بدلًا من جلسة Opus أو Fable.** يعود `git commit` خلال جزء من الثانية، ويلحق الرسم بالتحديث تلقائيًا.
>
> في تشغيل فعلي على Windows، حدّث commit غيّر الكود وأحد المستندات الرسم خلال **22 seconds باستدعاء واحد لـ Antigravity و0 من tokens الخاصة بـ Claude أو Codex.** لا يستطيع model المستخدم سوى قراءة النص والرد بنص؛ فلا أدوات لديه ولا صلاحيات كتابة أو exec. التفاصيل والإعداد: القسم 7g.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · **العربية** · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

الموقع: https://ealireza.github.io/agy-review/ · شروحات معمّقة (بالإنجليزية): [docs/AGENTS.md](AGENTS.md) حول Agents والحلقات، و[docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md) حول منهج المراجعة الأمنية.

---

## المحتويات

1. ما الذي تحصل عليه
2. لماذا يمكنك الوثوق بالتقرير
3. الحالة: ما تم التحقق منه وما لم يتم
4. المتطلبات
5. التثبيت
6. التشغيل الأول: تحقّق منه على جهازك
7. الاستخدام: المراجعة، والأمان، والمهام، والترجمة، وmodels، وgraphify
8. استخدامه من Agents وsub-agents والحلقات
9. model الأمان
10. استكشاف الأخطاء وإصلاحها
11. الأسئلة الشائعة
12. التحديث (كيفية الحصول على إصدار جديد)، وإلغاء التثبيت، والتطوير

---

## 1. ما الذي تحصل عليه

| Skill (Claude Code / Codex) | الأمر (Claude Code) | ما يفعله |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | مراجعة مُصنّفة لتغييرات git أو branch أو ملف أو نطاق أسطر أو دالة واحدة أو مقتطف |
| `agy-security` / `security` | `/agy-review:security` | مراجعة أمنية: OWASP/CWE، وقابلية الاستغلال، وسيناريو الهجوم، وفحص الأسرار والأنماط السيئة، واستدعاءات الدوال في الاتجاهين كسياق |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | مرّر أي مهمة مستقلة (إعادة صياغة، أو تلخيص، أو مسودة، أو استخراج) إلى Antigravity واحصل على النتيجة |
| `agy-translate` / `translate` | `/agy-review:translate` | ترجمة تراعي النبرة والجمهور والمسرد؛ وتتحقق من بقاء الكود وعناوين URLs والعناصر النائبة والبنية كما هي |
| `agy-models` / `models` | `/agy-review:models` | اعرض models الموجودة في agy وقيم `--effort` التي يقبلها كل منها، واختر واحدًا واحفظه للمشروع أو لكل المشاريع |
| `agy-graphify` / `graphify` | `/agy-review:graphify` | **أبقِ graphify graph محدّثًا على Antigravity عبر git hooks: ‏0 من tokens الخاصة بـ Claude أو Codex، ومن دون API key** |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | افحص المتطلبات الأساسية، وثبّت حاجز القراءة فقط، وأثبت على جهازك أن الكتابة محظورة |

sub-agents الخاصة بـ Claude Code: `agy-reviewer`، و`agy-security`، و`agy-worker`. كل شيء موجود في repository واحد وscript واحد (`plugins/agy-review/scripts/agy-review.mjs`). لا يوجد server، ولا تحتاج إلى حساب سوى تسجيل دخولك إلى Antigravity.

## 2. لماذا يمكنك الوثوق بالتقرير

قد يختلق language model مشكلة أحيانًا عند مراجعة الكود. هذه الأداة لا تصدّق كلامه بلا دليل.

1. يجب على المراجع إرجاع تقرير JSON صارم (يفرضه `--json-schema`). وكل نتيجة تتضمن **الكود نفسه بالضبط** الذي تتحدث عنه.
2. يبحث script عن ذلك الاقتباس في الملف الحقيقي. **إذا لم يجده، تُرفض النتيجة** وتُدرج منفصلة. **وإذا وجده في سطر آخر، يُصحَّح رقم السطر.** تُرفض الاقتباسات الأقصر من أن تثبت شيئًا أو العامة جدًا (`return null;`، `}`). ويُرفض الاقتباس إذا طابق مواضع عدة بعيدة عن السطر المذكور لأنه ملتبس.
3. يحسب script **الحكم والأعداد وبوابة CI** من النتائج المتحقق منها فقط، ولا ينسخها أبدًا من model.
4. عدم وجود نتائج متحقق منها **ليس** موافقة: إذا رُفضت نتائج، أو اختلف model، أو لم يغطِّ الكود، أو فشل أحد models، يكون الحكم `inconclusive` ويكون exit code هو 4.
5. تُوسم النتائج الواقعة خارج الأسطر المطلوبة ولا تؤثر في البوابة. وتُعرض النتائج منخفضة الثقة من دون احتسابها.
6. الشدة (حجم الأثر) والأولوية (متى يجب إصلاح المشكلة) منفصلتان ومتسقتان: الحرج دائمًا P0، والملاحظة الطفيفة دائمًا P3، ولا تتجاوز نتائج الأسلوب درجة low.

ما يزال ممكنًا: أن يكون الاقتباس صحيحًا والاستنتاج خاطئًا. يثبت الاقتباس وجود الكود، لا صحة التحليل؛ لذلك تتضمن كل نتيجة سيناريو ملموسًا، ولذلك عليك قراءة الأسطر المشار إليها قبل اتخاذ إجراء.

مثال حقيقي، شُغّلت فيه هذه الأداة على ملف صغير يحوي خطأين مزروعين (Claude Sonnet 4.6 عبر agy): 4 نتائج متحقق منها في الأسطر الصحيحة مع CWE-89 وCWE-78 وCWE-22 وCWE-369، وتغطية 100 %، مع إسقاط نتيجة مكررة، كما أشار الفاحص بصورة مستقلة إلى السطرين نفسيهما.

## 3. الحالة: ما تم التحقق منه وما لم يتم

| الفحص | النتيجة |
|---|---|
| اختبارات الوحدة ومسار المعالجة (`npm test`): ربط النتائج بالكود، والنطاق، والحكم، وإزالة التكرار، والبحث عن الرموز، والأهداف، والإعدادات، وmodels، والمهام، والترجمة، والأمان، والتنقيح | 72 اختبارًا، نجحت كلها، باستخدام `agy` وهمي (بما في ذلك مسار Agent، واكتشاف تغيّر الشجرة، وmodel يفشل، وبوابة `verify`) |
| Guard hook (الأوامر والأدوات المسموح بها والمرفوضة، وحيل الاقتباس، ومسارات بيانات الاعتماد) | اختبارات آلية ناجحة |
| ملفات Claude Code التعريفية (`claude plugin validate`)، وAntigravity plugin (`agy plugin validate --strict`) | ناجحة |
| Codex 0.163.0: إضافة marketplace، وتثبيت plugin، واكتشاف skills | تم فحصها على Windows 11 |
| المراجعة الثابتة، والمراجعة الأمنية، والمهام باستخدام agy 1.4.8 الحقيقي (Gemini 3.8 Flash وClaude Sonnet 4.6)، مع Bun 1.3.14 | تم فحصها على Windows 11؛ وربط النتائج بالأسطر الصحيحة |
| `--effort` لكل model: model الافتراضي (low, medium, high)، وmodels التي يتضمن اسمها effort، وClaude models من دون `--effort` | تم فحصها باستخدام agy 1.4.8 الحقيقي |
| graphify على Antigravity من البداية إلى النهاية: graphify 0.9.86 الحقيقي مع agy 1.4.8 الحقيقي على Windows. حدّث git hook الرسم في الخلفية (22 s، و1 استدعاء لـ Antigravity، وعاد `git commit` خلال 0.3 s)، ولم يُرسل إلى model سوى المستند المتغير | تم فحصه يدويًا وباختبارات تستخدم graphify وهميًا وagy وهميًا |
| مراجعتان مستقلتان للتصميم والكود (Opus: ‏25 نتيجة؛ Codex: ‏28 نتيجة)، مع إصلاح النتائج المؤكدة وإضافة اختبار منع تكرار لكل منها | تم، راجع changelog |
| **مراجعات Agent (`agy --dangerously-skip-permissions` مع منع الحاجز للكتابة الفعلية)** | **لم يشغّلها المؤلف** |

لم يختبر المؤلف `--graphify setup --yes` على تثبيت graphify حقيقي عبر `uv tool` (استخدم الاختبار اليدوي graphify من pip، وكان يتضمن حزمة `openai` بالفعل). صف Agent مهم للأمان ويعتمد على إصدار agy لديك، لذا شغّل `verify` مرة بعد التثبيت وبعد كل تحديث لـ agy (القسم 6). لا تستخدم المراجعات الثابتة ولا المراجعات الأمنية لرمز/ملف/مقتطف ولا المهام ولا الترجمات هذا flag، ولا يمكنها كتابة أي شيء.

تم الاختبار باستخدام agy 1.4.8، وCodex CLI 0.163.0، وBun 1.3.14، وNode 24، وWindows 11. يُفترض أن يعمل macOS وLinux (يستخدم agy المسار `~/.gemini/config/plugins` على جميع المنصات)، لكنهما غير مختبرين.

## 4. المتطلبات

لا شيء آخر: لا plugins أخرى ولا أدوات CLI أخرى.

| المطلوب | السبب | طريقة الحصول عليه | طريقة التحقق |
|---|---|---|---|
| Antigravity CLI `agy` | ينفّذ العمل | https://antigravity.google/cli, ثم شغّل `agy` مرة وسجّل الدخول | `agy --version` |
| Bun (مستحسن) **أو** Node.js 18.18+ | يشغّل script وGuard hook | https://bun.sh أو https://nodejs.org | `bun --version` / `node --version` |
| git | أهداف git والعثور على الكود المرتبط بالنتائج | https://git-scm.com | `git --version` |
| Claude Code **أو** Codex **أو** أي terminal | المكان الذي ترسل منه طلبك | أدلة التثبيت الخاصة بها | `claude --version` / `codex --version` |

Bun هو الخيار الافتراضي في جميع التعليمات وفي Guard hook (`bun guard.mjs || node guard.mjs`)؛ ويعمل Node بالطريقة نفسها. يُحتسب استخدام Antigravity من quota الخاصة بك. وقد تستغرق المراجعة من ثوانٍ إلى عدة دقائق.

## 5. التثبيت

اختر المضيف الذي تستخدمه؛ ويمكن لعدة مضيفين مشاركة script والحاجز نفسيهما.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

يفحص `/agy-review:setup` وجود agy وgit والحاجز، ويثبّت الحاجز في `~/.gemini/config/plugins/readonly-review`. أما `/agy-review:verify` فهو إثبات الأمان الحي.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

أعد تشغيل Codex، ثم اطلب بلغة عادية: "تحقّق من إعداد مراجعة Antigravity لدي"، أو "راجع تغييراتي باستخدام Antigravity"، أو "نفّذ مراجعة أمنية للدالة saveUpload"، أو "ترجم README.md إلى الألمانية بنبرة ودودة".

1. **ثبّت الحاجز مرة واحدة من terminal عادي** (فهو يكتب في `~/.gemini/config/plugins`): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.1/scripts/agy-review.mjs --install-guard` (على Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.1\scripts\agy-review.mjs`؛ اسم المجلد هو الإصدار المثبت، لذا استخدم المجلد الموجود بعد التحديث). لا تحتاج إلى الحاجز سوى مراجعات git التي تعمل بوضع Agent.
2. **يجب أن يسمح sandbox الخاص بـ Codex لـ agy بالعمل:** اتصال صادر بالشبكة، وصلاحية كتابة إلى `~/.gemini/antigravity-cli`، واتصال localhost. عند استخدام `workspace-write` ستحتاج غالبًا إلى الآتي في `~/.codex/config.toml`:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   إذا ظل شيء محظورًا، تذكر skill الصلاحية الناقصة وتتوقف؛ ولا توسّع الصلاحيات من تلقاء نفسها. لم يتمكن المؤلف من اختبار عمل agy بصورة صحيحة داخل Codex sandbox في إعداد Codex، لذلك شغّل `verify` من داخل Codex أيضًا.

### 5c. terminal عادي

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

تلميح: `alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`.

### 5d. جانب Antigravity فقط

الحاجز هو Antigravity plugin عادي. انسخ `plugins/agy-review/antigravity-plugin/readonly-review` إلى `~/.gemini/config/plugins/readonly-review` أو شغّل `--install-guard`؛ وتحقّق باستخدام `agy plugin list`. لا يفعل شيئًا ما لم يتضمن prompt النص `AGY_READONLY_REVIEW`، لذلك لا تتغير جلسات agy العادية. ويأتي أيضًا مع skill باسم `readonly-code-review` للاستخدام التفاعلي في agy.

## 6. التشغيل الأول: تحقّق منه على جهازك

شغّله مرة بعد التثبيت وبعد كل تحديث لـ agy: ‏`/agy-review:verify`، أو skill ‏`verify` في Codex، أو `--verify`. يجري استدعاء agy حيًا وصغيرًا داخل مجلد مؤقت: قراءة ملف (يجب أن تنجح)، وكتابة ملف، وإعادة توجيه الإخراج إلى ملف، وحذف ملف (يجب حظرها جميعًا). النتيجة المتوقعة:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

أي `FAIL` ينتهي بـ `NOT VERIFIED`، وتظل مراجعات Agent معطّلة: افتح issue وأرفق الإخراج ونتيجة `agy --version`. يُسجَّل نجاح `verify` لهذا الحاجز ولهذا الإصدار من agy تحديدًا؛ **وترفض مراجعات Agent البدء من دونه**. كما يُبطل أي تحديث لـ agy أو الحاجز هذا التسجيل، لذا شغّل `verify` مجددًا بعد التحديثات. لا تحتاج الأوضاع الثابتة إليه.

## 7. الاستخدام

شغّل الأداة من جذر repository.

### 7a. المراجعة: اختر الهدف

| ما تريد مراجعته | ما تستخدمه | الوضع |
|---|---|---|
| العمل الذي لم يُحفظ في commit | لا شيء | Agent، للقراءة فقط |
| branch / التغييرات المرحّلة / commit واحد | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | Agent، للقراءة فقط |
| ملف أو نطاق أسطر | `--file src/a.kt` أو `--file src/a.kt:40-80` (قابل للتكرار) | ثابت |
| دالة أو class واحدة | `--symbol parseConfig` (+ `--file` إذا كان الاسم ملتبسًا) | ثابت |
| كود موجود في الذاكرة فقط | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | ثابت |
| أي مما سبق، مع السماح بالاطلاع على ملفات أخرى | أضف `--agentic` | Agent، للقراءة فقط |

*الثابت*: يقرأ script الكود ويرقّمه بنفسه، ولا يحصل model على أي أدوات، لذلك لا يمكن لمس شيء أو اختلاق معلومات عن ملفات لم تُعرض عليه. *Agent*: يقرأ المراجع repository بنفسه عبر Guard hook يمنع كل عمليات الكتابة.

ساعد المراجع: `--context "what this code must do"`، و`--focus "concurrency, error handling"` (أو كلمات في آخر الأمر)، و`--context-lines N`.

الإخراج: Markdown افتراضيًا؛ و`--format json` للآلات؛ و`--output file`؛ و`--fail-on high` (exit 10 عند وجود نتيجة متحقق منها بدرجة high أو critical)؛ و`--previous old.json` لتمييز النتائج الجديدة والمستمرة والمحلولة والتي لم تُذكر مجددًا.

```text
## Summary
**Verdict: request changes**. ...
Target: app.py:1-19 | mode: static | model: Claude Sonnet 4.6 | effort: model default (...)
Findings: 4 verified (2 critical, 1 high, 1 medium ...).
### Critical
- **SQL injection** - `app.py:6` [P0 | security | confidence high | CWE-89] (id 9a9fb99468)
  Evidence:
      cur.execute("SELECT * FROM users WHERE name = '" + name + "'")
  Problem: ...   Fix: ...
```

### 7b. المراجعة الأمنية

يعمل `--security` (skill ‏`agy-security`، والأمر `/agy-review:security`، وsub-agent ‏`agy-security`) على كل هدف أعلاه، ويضيف: منهج threat-model (من مصدر غير موثوق إلى وجهة خطرة، مع وسائل التحكم بينهما)، وربطًا بـ OWASP Top 10 (2021) وCWE، و`exploitability` (`demonstrated`، و`likely`، و`conditional`، و`theoretical`)، و`attack_scenario`، و`data_flow`، وفاحصًا بلا model للأسرار ولنحو 25 فئة من الأنماط السيئة، و**الكود المرتبط**: ما يستدعيه الهدف ومن يستدعيه.

- يُنقَّح السر المكتوب داخل الكود (مفتاح خاص، أو AWS، أو GitHub، أو Stripe، أو Slack، أو Google) **قبل إرسال أي شيء إلى model**، ويُبلغ عنه كناتج مطابق لنمط.
- أي `cve` في التقرير هو ادعاء من model ويُوسم دائمًا بـ `cve_verified: false`: أكّده عبر NVD أو باستخدام `osv-scanner` / `npm audit` / `pip-audit`. لا تختلق الأداة CVEs ولا تتحقق منها.
- "كتب Claude كودًا، راجعه وراجع ما حوله": انسخ القاعدة الجاهزة من `examples/` إلى `CLAUDE.md` أو `AGENTS.md`، أو ثبّت Stop hook أو pre-commit hook الاختياري. التفاصيل ووصفات السلاسل: [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. المهام: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

لا يحصل model إلا على النص الذي تمرره، ومن دون أدوات. يطبع وضع النص الإجابة فقط؛ ويعرض stderr اسم model وeffort.

### 7d. الترجمة: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

الخيارات: `--from`، و`--variant` (pt-BR, zh-TW, de-CH ...)، و`--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal)، و`--audience`، و`--glossary` (JSON ‏`{"repo":"مخزن","API":"="}` أو CSV؛ تُبقي `=` المصطلح كما هو)، و`--keep a,b`، و`--notes`، و`--strict`. تُقسَّم النصوص الطويلة عند الأسطر الفارغة (لا يحدث ذلك داخل code block) وتُترجم جزءًا جزءًا. بعد الترجمة، يتحقق script من تطابق fenced code وinline code وعناوين URLs والعناصر النائبة (`{{x}}`، و`${x}`، و`%s`) وtags والعناوين مع المصدر، ويبلغ عن كل اختلاف (`--strict` يحوّل الاختلاف إلى exit 11). تسألك skills أولًا عن النبرة والجمهور والمصطلحات، ولا تسأل إلا عما لا يمكنها استنتاجه. لا تستطيع الفحوص الآلية الحكم على سلاسة اللغة؛ اطلب من قارئ ناطق بها مراجعة النص المهم.

### 7e. Models وeffort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

لكل تشغيل: `--model <id|name>`، و`--models a,b`، و`--effort auto|low|medium|high|xhigh|max`. ترتيب الأولوية: سطر الأوامر، ثم ملف المشروع، ثم ملف المستخدم، ثم الإعداد الافتراضي لـ agy. ‏`--effort auto` (الافتراضي) خيار حتمي مع شرح السبب: يتدرج effort في المراجعات حسب مقدار الكود ضمن النطاق (ويضيف تركيز حساس للمخاطر مثل الأمان خطوة)، وفي المهام حسب صياغتها (التحويلات الميكانيكية low، والمهام التي تتطلب استدلالًا كبيرًا high) وطول الإدخال؛ ولا يُختار `max` تلقائيًا أبدًا. **يُطابق effort دائمًا مع model، ولا يُخمّن.** لكل model مفهومه الخاص عن `--effort`: يوفّر model الافتراضي في agy القيم `low | medium | high`، ولا تقبل models التي يتضمن اسمها effort (`gemini-3.8-flash-high`، و`gpt-oss-120b-medium`) أي `--effort`، ولا تدعمه Claude models. تسأل الأداة agy عن حالة model (فحص مجاني يستغرق نحو أربع ثوانٍ ولا يبدأ أي استدعاء لـ model)، وتحفظ الإجابة لكل model وإصدار agy في `~/.agy-review-cache.json`، وتقرّب effort إلى أقرب قيمة يقبلها model (مثلًا تتحول `xhigh` إلى `high`)، ويذكر التقرير ما استُخدم فعلًا. إذا تغيّرت قائمة agy، يُقرأ الخطأ وتُصحّح الذاكرة المؤقتة وتُعاد المحاولة مرة واحدة. يعرض `--list-models` ما يقبله كل model (ويعيد `--refresh` السؤال). إذا رفض مرشح المحتوى في Gemini أحد prompt ولم تحدد model، تعيد الأداة المحاولة مرة باستخدام model غير Gemini وتخبرك بذلك.

### 7f. الخيارات وexit codes

يسرد `bun agy-review.mjs --help` كل شيء. exit codes: ‏`0` نجاح · `1` خطأ أو انتهاء مهلة أو رد لا يمكن تحليله · `2` خطأ في الاستخدام أو متطلب أساسي مفقود · `3` تغيّرت شجرة العمل أثناء مراجعة Agent · `4` نتيجة غير حاسمة أو غير مكتملة (**ليست نجاحًا**) · `10` فشلت بوابة `--fail-on` (التقرير صالح) · `11` فشل فحص الترجمة مع `--strict`. إذا انطبق أكثر من واحد، يتقدم `3` على `10`، و`10` على `4`؛ ويُكتب تقرير في كل الحالات باستثناء `1` و`2`، لذا اقرأ `verdict` و`incomplete` فيه. لا تُعد شجرة العمل النظيفة خطأ: تطبع الأداة "No changes to review" وتنهي بالرمز 0 من دون استدعاء model.

### 7g. graphify على Antigravity: صفر من tokens الخاصة بـ Agent لتحديثات الرسم

**إذا كنت تستخدم [graphify](https://github.com/Graphify-Labs/graphify)، فهذا أكبر توفير في المشروع كله.** يحوّل graphify أي repository ومستنداته إلى knowledge graph. معظم العمل كود حتمي (tree-sitter، والتجميع، والتقرير، والذاكرة المؤقتة، والدمج) ولا يكلف شيئًا. تحتاج خطوتان إلى language model: **الاستخراج الدلالي للمستندات والأبحاث**، و**تسمية المجموعات**. إذا لم تثبّت backend محددًا، يختار graphify واحدًا بنفسه، وداخل coding agent يكون هذا الـ coding agent نفسه (أو اشتراكه). وهكذا تدفع ثمن كل تحديث للرسم يلمس مستندًا من tokens الخاصة بـ Opus أو Fable أو Codex.

**ينقل `--graphify` هاتين الخطوتين تحديدًا إلى Antigravity ويترك كل ما عداهما كما هو.** يبدأ script server محليًا صغيرًا على `127.0.0.1` يتحدث protocol المتوافق مع OpenAI ويرد عبر `agy`، ثم **يثبّت كل خطوة LLM في graphify عليه**، فلا يمكن لـ graphify الرجوع إلى coding agent لديك أو إلى API key مدفوع. لا تحتاج إلى Ollama أو أي مفتاح. (يسمي graphify هذا الموضع "ollama" في إعداداته؛ وهذا لا يعني إلا "أي server محلي متوافق مع OpenAI".)

```text
git commit / merge / checkout / rebase
   -> hook returns at once and starts the update in the background
      -> graphify extract: code is parsed locally, only changed docs go to the model
      -> the model is Antigravity (agy), reached through the local server
      -> graphify cluster-only: communities are named by Antigravity, report refreshed
   -> Claude / Codex tokens used: 0.  API keys needed: 0.
```

**لماذا لا حاجة إلى صلاحيات كتابة أو exec.** قد تتوقع أن الأمر يحتاج إلى Python وكتابة ملفات، لكن model لا يحتاج إلا إلى قراءة النص والرد بنص. يكتب graphify نفسه في `graphify-out/`؛ وتكتب هذه الأداة hooks وملف قفل وسجلًا. لا يملك model خلف server أي أدوات أو ملفات أو شبكة، ولا يستطيع prompt injection مخفي داخل مستند إجباره على فعل أي شيء. تُنقَّح الأسرار المعروفة في مستنداتك قبل إرسالها. وهذا يحافظ على وعد القراءة فقط في بقية المشروع.

أعدّه مرة واحدة لكل repository:

```bash
bun agy-review.mjs --graphify doctor              # graphify, agy, and graphify's own Python must be able to import openai
bun agy-review.mjs --graphify setup --yes         # installs the git hooks; --yes lets it add the openai package to graphify's environment
bun agy-review.mjs --graphify update --full       # only if there is no graph yet: the first build reads every doc, so it takes a while
bun agy-review.mjs --graphify status              # hooks, last update, tokens used on Antigravity
```

في Claude Code أو Codex، اطلب ببساطة: "أعدّ تحديثات graphify على Antigravity" (skill ‏`agy-graphify` / `graphify`، والأمر `/agy-review:graphify`). تطلب skill موافقتك قبل إضافة حزمة إلى بيئة graphify.

ما يفعله لك:

- **Hooks:** تشغّل `post-commit`، و`post-merge`، و`post-checkout` (عند تبديل branch فقط)، و`post-rewrite` (amend، وrebase) التحديث **بصورة منفصلة**، فيعود أمر git خلال جزء من الثانية. يبقى المحتوى الحالي لملفات hook كما هو. افتراضيًا **تُستبدل hooks الخاصة بـ graphify** (فهي تعيد بناء الكود فقط، بينما تفعل hooks الخاصة بنا ذلك وأكثر؛ ووجود كاتبين على رسم واحد يسبب تعارضًا). يبقي `--keep-graphify-hook` كليهما؛ ويعيد `--graphify hook-uninstall --restore-graphify` hooks الخاصة بـ graphify. تجعل نسخة من هذه الأداة تحت `~/.agy-review/runtime` هذه hooks باقية بعد تحديثات plugin. لتجاوز تشغيل واحد استخدم `AGY_GRAPHIFY_SKIP=1 git commit ...`.
- **تدريجي:** تحدد الذاكرة المؤقتة الخاصة بـ graphify ما تغيّر؛ فلا تُرسل المستندات التي لم تتغير إلى model أبدًا. كما لا يشغّل commitان متتاليان تحديثين في الوقت نفسه: يطلب الثاني جولة إضافية واحدة.
- **يتوقف Agent لديك عن حرق tokens عليه:** إذا كان في `CLAUDE.md` أو `AGENTS.md` قسم لـ graphify يطلب من Agent إعادة بناء الرسم، يضيف `--graphify rules --write-rules` قاعدة قصيرة تخبره بألا يفعل ذلك (لا يُعدّل نصك، ولا يُنشأ شيء إذا لم تكن الملفات موجودة).
- **رخيص افتراضيًا:** effort هو `low`، لأن الاستخراج عمل منظّم. في اختبار، استخدم `low` من output tokens أقل بنحو 40 مرة من `high` للمستند نفسه (685 مقابل 29,996)، وانتهى خلال 15 ثانية بدلًا من 207. غيّره باستخدام `--set graphifyEffort=...`، واختر model عبر `--set graphifyModel=<id>` (راجع `--list-models`)، واستخدم `--set graphifyConcurrency=N` للاستدعاءات المتوازية، و`--set graphifyLabels=false` لتخطي تسمية المجموعات.

الحدود بصراحة: تستخدم التحديثات **quota الخاصة بك على Antigravity** (وهذه هي الفكرة: model رخيص بدلًا من آخر مكلف، وليس "مجانيًا"). **لا تُستخرج الصور** بهذا المسار (يتخطاها graphify لهذا backend، ولا يستطيع agy رؤيتها عبره). يُحلل الكود محليًا؛ وتُرسل نصوص المستندات والأبحاث إلى model من Google. تعتمد جودة استخراج المستندات على model الذي تختاره. يجب تثبيت graphify (`uv tool install graphifyy`)، وتحتاج Python الخاصة به إلى حزمة `openai`: يضيفها `--graphify setup --yes` عبر `uv tool install --force "graphifyy[openai]"` (أو `pipx inject graphifyy openai`). التفاصيل والإعدادات واستكشاف الأخطاء: [docs/GRAPHIFY.md](GRAPHIFY.md).

## 8. استخدامه من Agents وsub-agents والحلقات

كل skill ليست إلا استدعاء CLI عاديًا مع JSON ثابت، لذا يمكن لأي Agent استخدامها: شغّل sub-agent ‏`agy-reviewer` أو `agy-security` أو `agy-worker` في Claude Code، أو استدعِ skills في Codex، أو استدعِ script من أي framework.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

لا يُخبر المراجع بما غيّرته، فتظل كل جولة مستقلة. العقد الكامل وحقول JSON ووصفات الحلقات وأنماط التوزيع: [docs/AGENTS.md](AGENTS.md).

## 9. model الأمان

تُشغّل **المراجعات الثابتة، والمراجعات الأمنية لرمز/ملف/مقتطف، والمهام والترجمات** الأمر agy من دون أي flag للصلاحيات ومن دون أدوات داخل مجلد مؤقت فارغ: لا يستطيع agy قراءة ملفاتك أو الكتابة فيها؛ والبيانات الوحيدة التي تغادر هي ما وضعه script في prompt (بعد تنقيح الأسرار المعروفة).

تبدأ **مراجعات Agent** (أهداف git، أو `--agentic`) الأمر agy مع `--dangerously-skip-permissions` حتى لا ينتظر أي prompt، وتعتمد على Guard hook من نوع `PreToolUse` (`guard.mjs`) يفحص كل استدعاء أداة و**يرفض افتراضيًا**:

- المسموح: أدوات عرض الملفات والبحث؛ وأوامر shell، المفردة أو المتسلسلة، إذا بُنيت فقط من أوامر `git` الفرعية للقراءة، و`rg`، و`grep`، و`cat`، و`ls`، و`head`، و`tail`، و`wc`، و`find` (من دون `-delete`/`-exec`)، وPowerShell ‏`Get-*`، و`Select-String`، وقليل غيرها (القائمة في `guard.mjs`)؛
- المرفوض: كل أدوات الكتابة/التحرير/notebook/الصور/الجدولة/sub-agent/browser/web/MCP وأي أداة مجهولة؛ وإعادة التوجيه، و`$(...)`، وbackticks، وscript blocks، وتراكيب شبيهة بـ `eval`؛ و`git commit/push/checkout/reset/...`؛ والمفسرات ومديرو الحزم؛ و`curl` و`ssh`؛ وقراءة مخازن بيانات الاعتماد (`.ssh`، و`.aws`، و`.gnupg`، والمفاتيح الخاصة)؛
- إذا تعطّل الحاجز فإنه يرفض؛ ويرفض script بدء تشغيل Agent ما لم يكن الحاجز مثبتًا ومطابقًا للنسخة المرفقة، **ومع تسجيل نجاح `--verify` لهذا الحاجز وهذا الإصدار من agy**؛ وقبل التشغيل وبعده يأخذ بصمة `git status` وtracked وstaged diffs ومحتوى كل ملف غير متعقب، وينهي بالرمز 3 مع تحذير عند وجود أي اختلاف.
- **لا يمكن تنقيح الأسرار في وضع Agent** قبل أن يقرأ المراجع الملفات. تكشفها الأداة وتحذّر منها وتسردها في `limitations`؛ غيّرها، أو راجع باستخدام `--file` / `--symbol` حيث تُنقَّح أولًا.

**تحديثات graphify** (`--graphify`) لا تعطي model أي أدوات إطلاقًا: يتلقى النص عبر server يستمع على `127.0.0.1` فقط، ويتطلب bearer key عشوائيًا لا يوجد إلا خلال تحديث واحد، ويرفض headers الغريبة في `Host`، ويشغّل `agy` في مجلد مؤقت فارغ من دون أي flag للصلاحيات. الأشياء التي تُكتب على القرص يكتبها graphify (`graphify-out/`) وهذه الأداة (git hooks، و`~/.agy-review/runtime`، وملف قفل، وسجل). تشغّل hooks كودًا مع كل commit: وهذه هي الثقة نفسها التي تمنحها أصلًا لـ hooks الخاصة بـ graphify، ويزيلها `--graphify hook-uninstall`.

ما ليست عليه هذه الأداة:

- **ليست OS sandbox.** يرشّح الحاجز أسماء الأدوات ونصوص الأوامر؛ ولا يتوفر sandbox الخاص بـ agy في كل مكان. وقد يبحث prompt injection متعمّد ومخفي في الكود المراجع عن صيغة أمر يقبلها المرشح. يكشف فحص ما قبل/بعد التشغيل الملفات المتعقبة المعدّلة والملفات الجديدة، لا عمليات القراءة.
- **يُرسل كودك إلى model من Google**؛ ولا قيود على القراءة سوى مسارات بيانات الاعتماد. يمكن لمراجعات Agent قراءة ملفات `.env` داخل repository. لا تراجع كودًا لا يجوز لك مشاركته.
- يستطيع git تشغيل برامج diff أو textconv خارجية مضبوطة في repository: راجع repositories التي تثق بها فقط.
- قد تكون النتائج خاطئة أو ناقصة، وعبارة "لا نتائج" لا تعني أبدًا "آمن".

## 10. استكشاف الأخطاء وإصلاحها

| العَرَض | السبب والحل |
|---|---|
| `Missing: agy CLI` | ثبّت Antigravity CLI وشغّل `agy` مرة لتسجيل الدخول؛ يجب أن يعمل `agy --version` في shell الذي يشغّل plugin |
| `Missing: read-only guard - missing/outdated` | شغّل الإعداد (`/agy-review:setup`، أو skill ‏`setup` في Codex، أو `--install-guard`)؛ ولا تحتاجه سوى مراجعات Agent |
| `Not inside a git repository` (exit 2) | نفّذ `cd` إلى جذر repository، أو راجع الكود عبر `--file` / `--symbol` / `--stdin` |
| الحكم `inconclusive`، ‏exit 4 | ليس نجاحًا: رُفضت نتائج، أو اختلف model أو لم يغطِّ الكود، أو فشل أحد models. ضيّق النطاق، أو أضف `--context`، أو جرّب `--model` آخر |
| `blocked by Gemini's filters` | رفض مرشح الأمان في Gemini الطلب (وهذا شائع مع prompts الأمنية). من دون `--model` تعيد الأداة المحاولة باستخدام model غير Gemini؛ وإلا فاختر واحدًا عبر `--model` |
| `invalid model selection ... has no "xhigh" effort (available: low, medium, high)` أو `conflicts with --effort` أو `--effort is not supported` | تم إصلاحه في 1.0.1: يُطابق effort مع model تلقائيًا ويذكر التقرير ما استُخدم. إذا استمر ظهوره، شغّل `--list-models --refresh`، وحدّث plugin (القسم 12)، وأبلغ عنه |
| graphify: `openai package ... missing` | تفتقد Python الخاصة بـ graphify حزمة `openai`. شغّل `--graphify setup --yes`، أو `uv tool install --force "graphifyy[openai]"` (pipx: ‏`pipx inject graphifyy openai`) |
| graphify: لم يتحدّث الرسم بعد commit | يعرض `--graphify status` حالة hooks وآخر نتيجة؛ اقرأ `graphify-out/.agy-update.log`؛ وشغّل `--graphify update --debug` مرة في الواجهة (يحتفظ بكل طلب ورد في `graphify-out/.agy-debug/`، وهي تتضمن مستنداتك). إذا لم يوجد رسم بعد، فلا تفعل hook شيئًا: ابنِه مرة عبر `--graphify update --full` |
| graphify: ‏`agy returned no answer` لجزء | يعيد graphify محاولة ذلك الجزء في التحديث التالي. تحقّق من تسجيل الدخول وquota عبر `agy -p "say hi"`، أو اختر model آخر باستخدام `--set graphifyModel=<id>` |
| يحذّر graphify من اختلاف إصدار skill وإصدار الحزمة | لا يضر بهذه الأداة؛ حدّث graphify باستخدام `uv tool upgrade graphifyy` |
| مراجعة فارغة، ‏exit 1 | تحقّق من تسجيل الدخول وquota عبر `agy -p "say hi"`؛ وارفع `--timeout` للأهداف الكبيرة |
| Exit 3 / تغيّرت شجرة العمل | عدّل شيء ما ملفاتك أثناء مراجعة Agent (محرر، أو build، أو تجاوز للحاجز). افحص `git status` و`git diff`؛ وإذا لم تكن أنت من غيّرها، فتعامل معها كحادث أمني |
| نتائج مرفوضة كثيرة | اقتبس model كودًا غير موجود. هذا متوقع أحيانًا؛ ولا تُحتسب تلك النتائج أبدًا. استخدم `--model` أقوى أو نطاقًا أضيق |
| `--symbol`: ‏"defined in several places" أو "not found" | مرّر `--file`، أو استخدم `--file path:A-B`. أداة البحث تقريبية (مطابقة الأقواس/المسافات البادئة)، وليست parser |
| Codex: ‏"blocked by sandbox" | راجع 5b: يجب السماح بالشبكة، والكتابة في `~/.gemini/antigravity-cli`، واتصال localhost |
| Windows: تعذّر العثور على `agy` أو `bun` داخل Claude/Codex | تستخدم أداة shell مسار `PATH` مختلفًا؛ شغّلها من shell يعمل فيه الأمر |
| يطبع `verify` ‏FAIL | لا تستخدم مراجعات Agent على كود مهم؛ افتح issue وأرفق الإخراج ونتيجة `agy --version` |

## 11. الأسئلة الشائعة

**هل تغيّر الأداة الكود؟** لا. الأوضاع الثابتة لا تستطيع؛ ويمنع وضع Agent الكتابة ويحذّر إذا اختلفت شجرتك بعد ذلك. لا تنشئ commit ولا stash ولا checkout لأي شيء أبدًا.

**هل Bun أسرع من Node هنا؟** ليس بفارق ملحوظ. على جهاز Windows الخاص بالمؤلف استغرق بدء التشغيل نحو 56 ms مع Node و64 ms مع Bun، واستغرق Guard hook نحو 60 ms مقابل 57 ms؛ وتستغرق المراجعة عشرات الثواني لأن الوقت يذهب إلى model. ‏Bun هو الخيار الافتراضي الموثق؛ ويعمل Node 18.18+ بالطريقة نفسها. ويغطي الكود نفسه كليهما.

**هل تكلف مالًا؟** plugin مجاني. تستخدم كل مراجعة ومهمة وترجمة وتحديث graphify من quota الخاصة بك على Antigravity.

**هل أحتاج إلى Ollama أو API key من أجل graphify؟** لا. لدى graphify موضع backend اسمه "ollama"، ويعني "أي server محلي متوافق مع OpenAI"؛ وهذا server هو server Antigravity الصغير الخاص بهذه الأداة. الشيء الوحيد المطلوب تثبيته هو حزمة Python ‏`openai` الخاصة بـ graphify، ويضيفها `--graphify setup --yes`.

**هل سيستمر graphify في استهلاك tokens الخاصة بـ Claude أو Codex؟** فقط إذا شغّلت أنت أو Agent الأمر `/graphify --update` أو `graphify extract` أو ما شابه بنفسك، أو إذا طلب قسم في `CLAUDE.md` / `AGENTS.md` من Agent إعادة بناء الرسم. استخدم `--graphify rules --write-rules` لإضافة القاعدة التي توقف ذلك.

**ما الملفات التي يراها Antigravity؟** الأوضاع الثابتة: الكود الذي يرسله script فقط (مع كود مرتبط ضمن حدود عند استخدام `--security`). أوضاع Agent: كل ما يقرأه داخل repository، وأي مكان على القرص عدا مسارات بيانات الاعتماد.

**هل تستطيع إصلاح النتائج؟** لا تفعل ذلك أبدًا. يصلحها Agent آخر أو أنت؛ أما المراجع فيراجع فقط، ليظل مستقلًا.

**هل تستطيع مراجعة GitHub pull request؟** اعمل checkout لـ branch محليًا واستخدم `--base`. لا يوجد وصول إلى GitHub API.

**لماذا لا نضع قائمة بالأوامر المسموح بها في إعدادات agy؟** أظهر الاختبار أن agy في الوضع headless يطابق الصلاحيات متعددة الكلمات حرفيًا (`git status` نعم، و`git status --short` لا)، وأن "allow" من hook لا يتجاوز فحص الصلاحيات. لا تستطيع hook إلا الرفض بثقة، ومن هنا جاء استخدام skip-permissions مع hook ترفض افتراضيًا في وضع Agent، وعدم وجود أدوات أصلًا في الوضع الثابت.

**هل يمكنني إضافة أوامر مسموحة أو قواعد فحص؟** عدّل `CMDS` / `GIT_OK` في `guard.mjs` أو `RULES` في `lib/security.mjs`، وشغّل `npm test`، ثم `--install-guard`.

## 12. التحديث وإلغاء التثبيت والتطوير

### كيفية التحديث إلى إصدار جديد

لا يصلك release جديد تلقائيًا: أنت تختار التحديث. أربع خطوات.

**1. تحقّق من الإصدار لديك ومن وجود إصدار أحدث**

```bash
bun agy-review.mjs --version          # for example: agy-review 1.0.1 (bun 1.3.14)
bun agy-review.mjs --update-check     # asks GitHub; prints the exact commands below if a newer version exists
```

يمكنك أيضًا قراءة قائمة release على https://github.com/Ealireza/agy-review/releases و[changelog](../CHANGELOG.md).

**2. حدّث plugin للمضيف الذي تستخدمه**

| المضيف | الأوامر (شغّلها في terminal عادي) | ثم |
|---|---|---|
| Claude Code | `claude plugin marketplace update agy-review` ثم `claude plugin update agy-review@agy-review` | أعد تشغيل Claude Code |
| Codex | `codex plugin marketplace upgrade agy-review` ثم `codex plugin remove agy-review@agy-review` ثم `codex plugin add agy-review@agy-review` | أعد تشغيل Codex |
| نسخة عادية | `git pull` داخل نسختك | لا شيء |

**3. حدّث الأجزاء الموجودة خارج مجلد plugin**

```bash
bun agy-review.mjs --install-guard         # the Antigravity guard hook is copied to ~/.gemini/config/plugins; this replaces it with the new one
bun agy-review.mjs --verify                # a guard or agy change invalidates the last check, and agentic reviews stay off until this passes
bun agy-review.mjs --graphify setup        # only if you use graphify: refreshes the hooks and the runtime copy in ~/.agy-review/runtime
```

**4. تأكّد من نجاح التحديث:** يعرض `--version` الرقم الجديد، ويقول `--check` إن كل شيء OK، ويعيد `--list-models --refresh` قراءة ما يقبله كل model لقيمة `--effort`.

إذا تعطل شيء بعد التحديث: شغّل `--check`، واقرأ جدول استكشاف الأخطاء (القسم 10)، وإذا احتجت إلى الإصدار القديم، فأزل plugin وثبّت release محددًا عبر `git clone --branch v1.0.0 https://github.com/Ealireza/agy-review`. إعداداتك (`.agy-review.json`) ملفات عادية لا تلمسها التحديثات.

### إلغاء التثبيت

```text
claude plugin uninstall agy-review@agy-review   # Claude Code
codex plugin remove agy-review@agy-review       # Codex
bun agy-review.mjs --uninstall-guard            # removes the guard from ~/.gemini/config/plugins
bun agy-review.mjs --graphify hook-uninstall --restore-graphify   # removes our git hooks and puts graphify's own back
```

احذف `~/.agy-review` (نسخة runtime) و`~/.agy-review-cache.json` (ذاكرة effort المؤقتة) إذا أردت ألا يبقى شيء.

### التطوير

```bash
npm test        # 73 tests, no agy, no network (uses a fake agy in fixtures/)
```

```text
.claude-plugin/marketplace.json  .agents/plugins/marketplace.json
plugins/agy-review/
  .claude-plugin/  .codex-plugin/        manifests
  commands/ skills/ agents/              Claude Code
  codex-skills/                          Codex
  prompts/ (rubric.md, security.md)  schema/review.schema.json
  scripts/agy-review.mjs  scripts/lib/   the wrapper (targets, grounding, merge, security, translate, config, agy)
  antigravity-plugin/readonly-review/    the Antigravity plugin: hooks.json, guard.mjs, skill
  scripts/lib/graphify.mjs, shim.mjs     graphify hooks and update; the local Antigravity server
docs/ (AGENTS.md, SECURITY-REVIEW.md, GRAPHIFY.md, README.<lang>.md, index.html = website)   examples/   test/   fixtures/
```

نرحب بـ issues وpull requests، وخصوصًا: نتائج `verify` على macOS وLinux، وإعدادات Codex sandbox التي تعمل، وطرق تجاوز الحاجز (أبلغ عنها بصورة خاصة أولًا إن استطعت)، وقواعد الفحص الجديدة. للترجمة: انسخ `README.md` إلى `docs/README.<code>.md`، وترجمه، وأضف اللغة إلى سطر تبديل اللغة في كل مكان.

## الرخصة

MIT، راجع [LICENSE](../LICENSE).
