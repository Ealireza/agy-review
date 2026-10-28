# agy-review

**مراجِع مستقل عليه أن يُثبت صحة عمله.** مراجعة الشيفرة، ومراجعة الأمان، وتفويض المهام، والترجمة عبر Google Antigravity (`agy`)، من Claude Code أو Codex أو أي طرفية. للقراءة فقط، بلا طلبات أذونات، ويُفحص كل استنتاج مقابل شيفرتك الفعلية قبل أن تراه.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · **العربية** · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

الموقع: https://ealireza.github.io/agy-review/ · شروحات معمّقة (بالإنجليزية): [AGENTS.md](AGENTS.md) للوكلاء والحلقات، و[SECURITY-REVIEW.md](SECURITY-REVIEW.md) لمنهج الأمان.

---

## المحتويات

1. ما الذي تحصل عليه
2. لماذا يمكنك الوثوق بالتقرير
3. الحالة: ما الذي جرى التحقق منه وما الذي لم يُتحقق منه
4. المتطلبات
5. التثبيت
6. التشغيل الأول: تحقق منه على جهازك
7. الاستخدام: المراجعة، الأمان، المهام، الترجمة، النماذج
8. الاستخدام من الوكلاء والوكلاء الفرعيين والحلقات
9. نموذج الأمان
10. استكشاف الأخطاء وإصلاحها
11. الأسئلة الشائعة
12. التحديث والإزالة والتطوير

---

## 1. ما الذي تحصل عليه

| المهارة (Claude Code / Codex) | الأمر (Claude Code) | ما تفعله |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | مراجعة مُدرَّجة لتغييرات git أو فرع أو ملف أو نطاق أسطر أو دالة واحدة أو مقطع شيفرة |
| `agy-security` / `security` | `/agy-review:security` | مراجعة أمان: OWASP/CWE، وقابلية الاستغلال، وسيناريو الهجوم، وماسح للأسرار والأنماط السيئة، مع المستدعِين والمستدعَيْن كسياق |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | سلّم أي مهمة مستقلة بذاتها (إعادة صياغة، تلخيص، كتابة مسودة، استخراج) إلى Antigravity واستلم النتيجة |
| `agy-translate` / `translate` | `/agy-review:translate` | ترجمة بنبرة وجمهور ومسرد مصطلحات، مع التحقق من بقاء الشيفرة وعناوين URL والعناصر النائبة والبنية سليمة |
| `agy-models` / `models` | `/agy-review:models` | عرض النماذج المتاحة في agy لديك، واختيار واحد منها، وحفظه للمشروع أو عموميًا، وضبط مستوى الجهد |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | فحص المتطلبات الأساسية، وتثبيت حارس القراءة فقط، وإثبات حجب عمليات الكتابة على جهازك |

وكلاء فرعيون لـ Claude Code: `agy-reviewer` و`agy-security` و`agy-worker`. كل شيء في مستودع واحد وسكربت واحد (`plugins/agy-review/scripts/agy-review.mjs`). لا يوجد خادم، ولا حساب سوى تسجيل دخولك إلى Antigravity.

## 2. لماذا يمكنك الوثوق بالتقرير

قد يختلق نموذج لغوي يراجع الشيفرة مشكلةً أحيانًا. هذه الأداة لا تأخذ بكلامه في أي شيء.

1. يجب على المراجِع أن يعيد تقرير JSON صارمًا (يُفرض عبر `--json-schema`). ويحمل كل استنتاج **الشيفرة الدقيقة** التي يتعلق بها.
2. يبحث السكربت عن هذا الاقتباس في الملف الحقيقي. **إن لم يوجد: يُرفض الاستنتاج** ويُدرج منفصلًا. **وإن وُجد في سطر آخر: يُصحَّح رقم السطر.** تُرفض الاقتباسات القصيرة أو العامة جدًا بحيث لا تثبت شيئًا (`return null;`، `}`). ويُرفض الاقتباس الذي يطابق عدة مواضع بعيدة عن السطر المذكور باعتباره غامضًا.
3. **يحسب السكربت** الحكم والأعداد وبوابة CI من الاستنتاجات المتحقق منها فقط، ولا تُنسخ أبدًا من النموذج.
4. غياب الاستنتاجات المتحقق منها **ليس** موافقة: إذا رُفضت استنتاجات، أو خالف النموذج، أو لم يغطِّ الشيفرة، أو فشل أحد عدة نماذج، فإن الحكم يكون `inconclusive` ورمز الخروج 4.
5. الاستنتاجات الواقعة خارج الأسطر المطلوبة توسَم ولا تؤثر أبدًا في البوابة. أما الاستنتاجات منخفضة الثقة فتُدرج دون أن تُحتسب.
6. الخطورة (الأثر) والأولوية (متى يُصلَح) منفصلتان ومتسقتان: critical هي دائمًا P0، وnit هي دائمًا P3، واستنتاجات الأسلوب لا تتجاوز مستوى low أبدًا.

ما يظل ممكنًا: اقتباس صحيح مع استنتاج خاطئ. الاقتباس يثبت وجود الشيفرة، لا صحة الاستدلال؛ ولذلك يحمل كل استنتاج سيناريو ملموسًا، وعليك قراءة الأسطر المذكورة قبل أن تتصرف.

مثال حقيقي: هذه الأداة على ملف صغير فيه خطآن مزروعان (Claude Sonnet 4.6 عبر agy): 4 استنتاجات متحقق منها في الأسطر الصحيحة مع CWE-89 وCWE-78 وCWE-22 وCWE-369، وتغطية 100 %، وإسقاط استنتاج مكرر واحد، وقد أشار الماسح بشكل مستقل إلى السطرين نفسيهما.

## 3. الحالة: ما الذي جرى التحقق منه وما الذي لم يُتحقق منه

| الفحص | النتيجة |
|---|---|
| اختبارات الوحدة وخط المعالجة (`npm test`): الإسناد إلى الشيفرة، والنطاق، والحكم، وإزالة التكرار، وباحث الرموز، والأهداف، والإعداد، والنماذج، والمهام، والترجمة، والأمان، وحجب الأسرار | 50 اختبارًا، كلها ناجحة، باستخدام `agy` مزيّف (بما في ذلك خط المعالجة الوكيلي، وكشف تغيّر الشجرة، ونموذج فاشل، وبوابة `verify`) |
| خطّاف الحارس (الأوامر والأدوات المسموحة والمرفوضة، وحيل علامات الاقتباس، ومسارات بيانات الاعتماد) | اختبارات آلية، ناجحة |
| بيانات Claude Code (`claude plugin validate`)، وإضافة Antigravity (`agy plugin validate --strict`) | ناجحة |
| Codex 0.163.0: إضافة marketplace، وتثبيت الإضافة، واكتشاف المهارات | جرى فحصه على Windows 11 |
| المراجعة الثابتة ومراجعة الأمان والمهام مقابل agy 1.4.8 الحقيقي (Gemini 3.8 Flash وClaude Sonnet 4.6)، بتشغيلها مع Bun 1.3.14 | جرى فحصها على Windows 11؛ الاستنتاجات مسندة إلى الأسطر الصحيحة |
| مراجعتان مستقلتان للتصميم والشيفرة (Opus: 25 استنتاجًا؛ Codex: 28 استنتاجًا)، وأُصلحت المؤكَّدة منها مع اختبار انحدار لكل منها | تم، راجع سجل التغييرات |
| **المراجعات الوكيلية (`agy --dangerously-skip-permissions` مع الحارس الذي يحجب عمليات الكتابة الفعلية)** | **لم يشغّلها المؤلف** |

الصف الأخير مهم للسلامة ويعتمد على إصدار agy لديك، لذا شغّل `verify` مرة بعد التثبيت وبعد كل تحديث لـ agy (القسم 6). أما المراجعات الثابتة، ومراجعات الأمان لرمز/ملف/مقطع، والمهام، والترجمات فلا تستخدم هذا الخيار أبدًا ولا تستطيع كتابة أي شيء.

اختُبر مع agy 1.4.8 وCodex CLI 0.163.0 وBun 1.3.14 وNode 24 على Windows 11. يُفترض أن يعمل على macOS وLinux (يستخدم agy المسار `~/.gemini/config/plugins` على كل المنصات) لكنه لم يُختبر.

## 4. المتطلبات

لا شيء آخر: لا إضافات أخرى ولا أدوات سطر أوامر أخرى.

| المطلوب | السبب | كيف تحصل عليه | كيف تتحقق |
|---|---|---|---|
| Antigravity CLI `agy` | ينفّذ العمل | https://antigravity.google/cli، ثم شغّل `agy` مرة واحدة وسجّل الدخول | `agy --version` |
| Bun (موصى به) **أو** Node.js 18.18+ | يشغّل السكربت وخطّاف الحارس | https://bun.sh أو https://nodejs.org | `bun --version` / `node --version` |
| git | أهداف git وإيجاد الشيفرة ذات الصلة | https://git-scm.com | `git --version` |
| Claude Code **أو** Codex **أو** أي طرفية | المكان الذي تطلب منه | أدلة التثبيت الخاصة بها | `claude --version` / `codex --version` |

Bun هو الخيار الافتراضي في كل التعليمات وفي خطّاف الحارس (`bun guard.mjs || node guard.mjs`)؛ ويعمل Node بالطريقة نفسها. يُحتسب استخدام Antigravity من حصتك الخاصة. قد تستغرق المراجعة من ثوانٍ إلى عدة دقائق.

## 5. التثبيت

اختر المضيف الذي تستخدمه؛ ويمكن لعدة مضيفين مشاركة السكربت والحارس نفسيهما.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

يفحص `/agy-review:setup` كلًّا من agy وgit والحارس، ويثبّت الحارس في `~/.gemini/config/plugins/readonly-review`. أما `/agy-review:verify` فهو الإثبات الحي للسلامة.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

أعد تشغيل Codex، ثم اطلب بلغة عادية: "Check my Antigravity review setup" و"Review my changes with Antigravity" و"Security-review the function saveUpload" و"Translate README.md to German, friendly tone".

1. **ثبّت الحارس مرة واحدة من طرفية عادية** (فهو يكتب في `~/.gemini/config/plugins`): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.0/scripts/agy-review.mjs --install-guard` (على Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.0\scripts\agy-review.mjs`). المراجعات الوكيلية لـ git وحدها تحتاج إلى الحارس.
2. **يجب أن تسمح بيئة Codex المعزولة (sandbox) لـ agy بالعمل:** اتصال شبكة صادر، وصلاحية كتابة في `~/.gemini/antigravity-cli`، ومقبس localhost. مع `workspace-write` ستحتاج غالبًا إلى ما يلي في `~/.codex/config.toml`:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   إذا ظل شيء ما محجوبًا، فإن المهارة تسمّي الصلاحية الناقصة وتتوقف؛ ولا توسّع الأذونات من تلقاء نفسها أبدًا. أما هل يعمل agy بشكل صحيح داخل بيئة Codex المعزولة لديك فهو الجزء من إعداد Codex الذي لم يستطع المؤلف اختباره، لذا شغّل `verify` من داخل Codex أيضًا.

### 5c. طرفية عادية

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

نصيحة: `alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`.

### 5d. جانب Antigravity فقط

الحارس إضافة Antigravity عادية. انسخ `plugins/agy-review/antigravity-plugin/readonly-review` إلى `~/.gemini/config/plugins/readonly-review` أو شغّل `--install-guard`؛ وتحقق بـ `agy plugin list`. وهو لا يفعل شيئًا ما لم يحتوِ الطلب على `AGY_READONLY_REVIEW`، فتبقى جلسات agy العادية لديك دون تغيير. ويأتي أيضًا بمهارة `readonly-code-review` لاستخدام agy التفاعلي.

## 6. التشغيل الأول: تحقق منه على جهازك

شغّله مرة واحدة بعد التثبيت وبعد كل تحديث لـ agy: `/agy-review:verify` أو مهارة `verify` في Codex أو `--verify`. يجري استدعاءً حيًا صغيرًا واحدًا لـ agy في مجلد مؤقت: قراءة ملف (يجب أن تنجح)، وكتابة ملف، وإعادة توجيه إلى ملف، وحذف ملف (يجب أن تُحجب جميعًا). المتوقع:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

أي `FAIL` ينتهي بـ `NOT VERIFIED` وتبقى المراجعات الوكيلية معطّلة: افتح issue مع المخرجات ومع ناتج `agy --version`. يُسجَّل نجاح `verify` لهذا الحارس تحديدًا ولهذا الإصدار من agy؛ **وترفض المراجعات الوكيلية البدء من دونه**، ويبطله أي تحديث لـ agy أو للحارس، لذا أعد تشغيل `verify` بعد التحديثات. الأوضاع الثابتة لا تحتاج إليه.

## 7. الاستخدام

شغّل الأوامر من جذر المستودع.

### 7a. المراجعة: اختر الهدف

| ما تريد مراجعته | الاستخدام | الوضع |
|---|---|---|
| عمل غير مُودَع (uncommitted) | لا شيء | وكيلي، للقراءة فقط |
| فرع / تغييرات في منطقة التجهيز (staged) / إيداع واحد | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | وكيلي، للقراءة فقط |
| ملف أو نطاق | `--file src/a.kt` أو `--file src/a.kt:40-80` (قابل للتكرار) | ثابت |
| دالة أو صنف واحد | `--symbol parseConfig` (+ `--file` إذا كان الاسم ملتبسًا) | ثابت |
| شيفرة موجودة في الذاكرة فقط | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | ثابت |
| أي مما سبق مع إذن بالاطلاع على ملفات أخرى | أضف `--agentic` | وكيلي، للقراءة فقط |

*الثابت*: يقرأ السكربت الشيفرة بنفسه ويرقّم أسطرها ولا يحصل النموذج على أي أدوات، فلا يمكن لمس أي شيء ولا يمكن اختلاق شيء عن ملفات لم تُعرض عليه. *الوكيلي*: يقرأ المراجِع المستودع بنفسه عبر خطّاف الحارس الذي يحجب كل عملية كتابة.

ساعد المراجِع: `--context "ما الذي يجب أن تفعله هذه الشيفرة"`، `--focus "concurrency, error handling"` (أو كلمات في نهاية الأمر)، `--context-lines N`.

المخرجات: Markdown افتراضيًا؛ `--format json` للآلات؛ `--output file`؛ `--fail-on high` (رمز الخروج 10 إذا وُجد استنتاج متحقق منه بدرجة high أو critical)؛ `--previous old.json` يوسم الاستنتاجات بأنها جديدة أو مستمرة أو محلولة أو لم يُبلَّغ عنها مجددًا.

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

### 7b. مراجعة الأمان

يعمل `--security` (المهارة `agy-security`، والأمر `/agy-review:security`، والوكيل الفرعي `agy-security`) مع كل الأهداف أعلاه ويضيف: منهج نمذجة التهديدات (من مصدر غير موثوق إلى وجهة خطرة، مع الضوابط الواقعة بينهما)، وربطًا بـ OWASP Top 10 (2021) وCWE، و`exploitability` (`demonstrated` و`likely` و`conditional` و`theoretical`)، و`attack_scenario`، و`data_flow`، وماسحًا لا يستخدم أي نموذج للأسرار ولنحو 25 فئة من الأنماط السيئة، و**الشيفرة ذات الصلة**: ما يستدعيه الهدف ومن يستدعيه.

- السر المضمَّن في الشيفرة (مفتاح خاص، AWS، GitHub، Stripe، Slack، Google) **يُحجب قبل إرسال أي شيء إلى نموذج** ويُبلَّغ عنه كاستنتاج بحسب النمط.
- قيمة `cve` في التقرير هي ادعاء من النموذج وتوسَم دائمًا بـ `cve_verified: false`: تأكد منها على NVD أو بواسطة `osv-scanner` / `npm audit` / `pip-audit`. الأداة لا تختلق CVE ولا تتحقق منها أبدًا.
- "Claude كتب الشيفرة، راجعها وراجع ما يجاورها": انسخ القاعدة الجاهزة من `examples/` إلى `CLAUDE.md` أو `AGENTS.md` لديك، أو ثبّت خطّاف Stop الاختياري أو خطّاف pre-commit. التفاصيل ووصفات التسلسل: [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. المهام: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

لا يحصل النموذج إلا على النص الذي تمرره ولا أدوات له. يطبع وضع النص الإجابة فقط؛ ويبلّغ stderr عن النموذج ومستوى الجهد.

### 7d. الترجمة: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

الخيارات: `--from`، `--variant` (pt-BR وzh-TW وde-CH ...)، `--tone` (formal وneutral وfriendly وcasual وtechnical وmarketing وliterary وlegal)، `--audience`، `--glossary` (JSON على شكل `{"repo":"مخزن","API":"="}` أو CSV؛ والعلامة `=` تُبقي المصطلح كما هو)، `--keep a,b`، `--notes`، `--strict`. تُقسَّم النصوص الطويلة عند الأسطر الفارغة (ولا تُقسَّم أبدًا داخل كتلة شيفرة) وتُترجم قطعةً قطعة. بعد الترجمة يتحقق السكربت من تطابق الشيفرة المسوَّرة والشيفرة المضمَّنة وعناوين URL والعناصر النائبة (`{{x}}` و`${x}` و`%s`) والوسوم والعناوين مع المصدر، ويبلّغ عن كل فرق (و`--strict` يحوّل أي فرق إلى رمز الخروج 11). تجري المهارات معك حوارًا أولًا حول النبرة والجمهور والمصطلحات، ولا تسأل إلا عما لا تستطيع استنتاجه. الفحوص الآلية لا تحكم على سلاسة النص؛ فاطلب من قارئ أصلي مراجعة النصوص المهمة.

### 7e. النماذج ومستوى الجهد

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

لكل تشغيل: `--model <id|name>` و`--models a,b` و`--effort auto|low|medium|high|xhigh|max`. ترتيب الأولوية: سطر الأوامر، ثم ملف المشروع، ثم ملف المستخدم، ثم الافتراضي في agy. الخيار `--effort auto` (الافتراضي) اختيار حتمي مع شرح سببه: تتدرج المراجعات بحسب حجم الشيفرة ضمن النطاق (والتركيز الحساس للمخاطر مثل الأمان يضيف درجة واحدة)، وتتدرج المهام بحسب الصياغة (التحويلات الآلية low، والمهام الثقيلة في الاستدلال high) وطول المدخلات؛ ولا يُختار `max` تلقائيًا أبدًا. بعض النماذج لا تقبل `--effort`؛ فتستخدم الأداة الافتراضي للنموذج وتذكر ذلك. وإذا رفض مرشّح المحتوى في Gemini طلبًا ولم تحدد نموذجًا، فإن الأداة تعيد المحاولة مرة واحدة بنموذج غير Gemini وتذكر ذلك.

### 7f. الخيارات ورموز الخروج

يعرض `bun agy-review.mjs --help` كل شيء. رموز الخروج: `0` نجاح · `1` خطأ أو انتهاء مهلة أو رد تعذّر تحليله · `2` خطأ في الاستخدام أو متطلب أساسي ناقص · `3` تغيّرت شجرة العمل أثناء مراجعة وكيلية · `4` غير حاسم أو ناقص (**ليس موافقة**) · `10` فشلت بوابة `--fail-on` (التقرير صالح) · `11` فشل فحص الترجمة مع `--strict`. إذا انطبق أكثر من رمز، فإن `3` يتقدم على `10`، و`10` على `4`؛ ويُكتب تقرير في كل الحالات عدا `1` و`2`، فاقرأ `verdict` و`incomplete` فيه. شجرة العمل النظيفة ليست خطأ: تطبع الأداة "No changes to review" وتخرج بالرمز 0 دون استدعاء أي نموذج.

## 8. الاستخدام من الوكلاء والوكلاء الفرعيين والحلقات

كل مهارة هي استدعاء سطر أوامر بسيط بمخرجات JSON مستقرة، فيمكن لأي وكيل استخدامها: شغّل الوكيل الفرعي `agy-reviewer` أو `agy-security` أو `agy-worker` في Claude Code، أو استدعِ المهارات في Codex، أو استدعِ السكربت من أي إطار عمل.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

لا يُخبَر المراجِع أبدًا بما غيّرتَه، فتبقى كل جولة مستقلة. العقد الكامل وحقول JSON ووصفات الحلقات وأنماط التوزيع (fan-out): [AGENTS.md](AGENTS.md).

## 9. نموذج الأمان

**المراجعات الثابتة، ومراجعات الأمان لرمز/ملف/مقطع، والمهام، والترجمات** تشغّل agy دون أي خيار أذونات ودون أدوات في مجلد مؤقت فارغ: لا يستطيع agy قراءة ملفاتك ولا الكتابة فيها؛ والبيانات الوحيدة التي تغادر هي ما وضعه السكربت في الطلب (مع حجب الأسرار المعروفة).

**المراجعات الوكيلية** (أهداف git، أو `--agentic`) تبدأ agy بالخيار `--dangerously-skip-permissions` كي لا ينتظر شيء موافقة، وتعتمد على خطّاف حارس `PreToolUse` (`guard.mjs`) يفحص كل استدعاء أداة و**يرفض افتراضيًا**:

- المسموح: أدوات عرض الملفات والبحث؛ وأوامر الصدفة، المفردة أو المتسلسلة، المبنية فقط من أوامر `git` الفرعية للقراءة فقط، و`rg` و`grep` و`cat` و`ls` و`head` و`tail` و`wc` و`find` (دون `-delete`/`-exec`)، وأوامر PowerShell من نوع `Get-*`، و`Select-String` وبضعة أوامر أخرى (القائمة في `guard.mjs`)؛
- المرفوض: كل أداة كتابة/تحرير/دفتر ملاحظات/صور/جدولة/وكيل فرعي/متصفح/ويب/MCP وأي أداة غير معروفة؛ وإعادة التوجيه، و`$(...)`، وعلامات الاقتباس العكسية، وكتل السكربت، والتراكيب الشبيهة بـ `eval`؛ و`git commit/push/checkout/reset/...`؛ والمفسّرات ومديرو الحزم؛ و`curl` و`ssh`؛ وقراءة مخازن بيانات الاعتماد (`.ssh` و`.aws` و`.gnupg` والمفاتيح الخاصة)؛
- إذا انهار الحارس فإنه يرفض؛ ويرفض السكربت بدء تشغيل وكيلي ما لم يكن الحارس مثبتًا ومطابقًا للحارس المرفق، **وما لم يكن قد سُجّل نجاح `--verify` لهذا الحارس ولهذا الإصدار من agy**؛ وقبل التشغيل وبعده يأخذ بصمة لـ `git status` ولفروق الملفات المتتبَّعة والمجهّزة (staged) ولمحتوى كل ملف غير متتبَّع، ويخرج بالرمز 3 مع تحذير إذا اختلف أي شيء.
- **لا يمكن حجب الأسرار في الوضع الوكيلي** قبل أن يقرأ المراجِع الملفات. تكتشفها الأداة وتحذّر منها وتدرجها في `limitations`؛ فقم بتدويرها (rotate)، أو راجع بـ `--file` / `--symbol` حيث تُحجب أولًا.

ما ليس عليه هذا النموذج:

- **ليس عزلًا على مستوى نظام التشغيل.** الحارس يرشّح أسماء الأدوات ونص الأوامر؛ وعزل agy نفسه غير متاح في كل مكان. قد يبحث حقن طلبات (prompt injection) متعمّد مخبّأ في الشيفرة قيد المراجعة عن صيغة أمر يقبلها المرشّح. وفحص ما قبل التشغيل وبعده يكشف الملفات المتتبَّعة المعدّلة والملفات الجديدة، لا القراءات.
- **شيفرتك تُرسل إلى نموذج Google**؛ والقراءة غير مقيّدة عدا مسارات بيانات الاعتماد. ملفات `.env` في المستودع قابلة للقراءة من المراجعات الوكيلية. لا تراجع شيفرة لا يحق لك مشاركتها.
- يمكن لـ git تشغيل برامج diff أو textconv خارجية مُعدّة في المستودع: راجع المستودعات التي تثق بها فقط.
- قد تكون الاستنتاجات خاطئة أو ناقصة، و"لا استنتاجات" لا تعني أبدًا "آمن".

## 10. استكشاف الأخطاء وإصلاحها

| العَرَض | السبب والحل |
|---|---|
| `Missing: agy CLI` | ثبّت Antigravity CLI وشغّل `agy` مرة واحدة لتسجيل الدخول؛ ويجب أن يعمل `agy --version` في الصدفة التي تشغّل الإضافة |
| `Missing: read-only guard - missing/outdated` | شغّل الإعداد (`/agy-review:setup` أو مهارة `setup` في Codex أو `--install-guard`)؛ المراجعات الوكيلية وحدها تحتاج إليه |
| `Not inside a git repository` (الخروج 2) | انتقل بـ `cd` إلى جذر المستودع، أو راجع الشيفرة بـ `--file` / `--symbol` / `--stdin` |
| الحكم `inconclusive`، الخروج 4 | ليس موافقة: رُفضت استنتاجات، أو خالف النموذج أو لم يغطِّ الشيفرة، أو فشل نموذج. ضيّق النطاق، أو أضف `--context`، أو جرّب `--model` آخر |
| `blocked by Gemini's filters` | رفض مرشّح الأمان في Gemini الطلب (شائع في طلبات الأمان). بدون `--model` تعيد الأداة المحاولة بنموذج غير Gemini؛ وإلا فاختر نموذجًا بـ `--model` |
| `--effort is not supported for model` | يُعالَج تلقائيًا (يُستخدم الافتراضي للنموذج ويُبلَّغ عنه) |
| مراجعة فارغة، الخروج 1 | افحص تسجيل الدخول والحصة بـ `agy -p "say hi"`؛ وارفع `--timeout` للأهداف الكبيرة |
| الخروج 3 / تغيّرت شجرة العمل | عدّل شيء ما ملفاتك أثناء مراجعة وكيلية (محرر، أو بناء، أو تجاوز للحارس). افحص `git status` و`git diff`؛ وإن لم تكن أنت من غيّرها فتعامل معها كحادث أمني |
| استنتاجات كثيرة مرفوضة | اقتبس النموذج شيفرة غير موجودة. متوقع أحيانًا؛ ولا تُحتسب أبدًا. استخدم `--model` أقوى أو نطاقًا أضيق |
| `--symbol`: "defined in several places" أو "not found" | مرّر `--file`، أو استخدم `--file path:A-B`. الباحث استدلالي (مطابقة الأقواس/المسافات البادئة) وليس محلِّلًا نحويًا |
| Codex: "blocked by sandbox" | راجع 5b: يجب السماح بالشبكة والكتابة في `~/.gemini/antigravity-cli` ومقبس localhost |
| Windows: تعذّر العثور على `agy` أو `bun` داخل Claude/Codex | لصدفة الأداة قيمة `PATH` مختلفة؛ شغّلها من صدفة يعمل فيها الأمر |
| يطبع `verify` الرمز FAIL | لا تستخدم المراجعات الوكيلية على شيفرة مهمة؛ وافتح issue مع المخرجات و`agy --version` |

## 11. الأسئلة الشائعة

**هل يغيّر شيفرتي؟** لا. الأوضاع الثابتة لا تستطيع ذلك؛ والوضع الوكيلي يحجب الكتابة ويحذّر إذا اختلفت شجرتك بعد ذلك. ولا يُودِع (commit) ولا يُخفي (stash) ولا يبدّل الفرع (checkout) أي شيء أبدًا.

**هل Bun أسرع من Node هنا؟** ليس بشكل يمكن قياسه. على جهاز Windows الخاص بالمؤلف كان زمن البدء نحو 56 ms مع Node و64 ms مع Bun، وخطّاف الحارس نحو 60 ms مقابل 57 ms؛ والمراجعة تستغرق عشرات الثواني وهذا الوقت هو وقت النموذج. Bun هو الخيار الافتراضي الموثّق؛ ويعمل Node 18.18+ بالطريقة نفسها. وكلاهما مشمول بالشيفرة نفسها.

**هل يكلّف مالًا؟** الإضافة مجانية. وتستهلك كل مراجعة من حصتك في Antigravity.

**ما الملفات التي يراها Antigravity؟** في الأوضاع الثابتة: الشيفرة التي يرسلها السكربت فقط (مع شيفرة ذات صلة محدودة لـ `--security`). وفي الأوضاع الوكيلية: كل ما يقرؤه في المستودع، وأي مكان على القرص عدا مسارات بيانات الاعتماد.

**هل يستطيع إصلاح الاستنتاجات؟** لا يفعل ذلك أبدًا. يصلحها وكيل آخر أو أنت؛ والمراجِع يراجع فقط، لتبقى مراجعته مستقلة.

**هل يستطيع مراجعة pull request على GitHub؟** اسحب الفرع (checkout) محليًا واستخدم `--base`. لا يوجد وصول إلى GitHub API.

**لماذا لا نضع الأوامر في قائمة سماح ضمن إعدادات agy؟** جرى الاختبار: في الوضع الخالي من الواجهة (headless) يطابق agy الأذونات متعددة الكلمات مطابقةً تامة (`git status` نعم، `git status --short` لا) ولا يتجاوز "السماح" الصادر من خطّاف فحصَ الأذونات. الخطّاف لا يستطيع إلا الرفض بشكل موثوق، ومن هنا جاء الجمع بين skip-permissions وخطّاف يرفض افتراضيًا للوضع الوكيلي، ودون أي أدوات للوضع الثابت.

**هل يمكنني إضافة أوامر مسموحة أو قواعد للماسح؟** عدّل `CMDS` / `GIT_OK` في `guard.mjs` أو `RULES` في `lib/security.mjs`، ثم شغّل `npm test`، ثم `--install-guard`.

## 12. التحديث والإزالة والتطوير

```text
/plugin marketplace update agy-review          # Claude Code        |  codex plugin marketplace upgrade agy-review  # Codex
/plugin uninstall agy-review@agy-review        # Claude Code        |  codex plugin remove agy-review@agy-review    # Codex
bun .../agy-review.mjs --uninstall-guard       # removes the guard from ~/.gemini/config/plugins
```

بعد التحديث شغّل الإعداد مرة أخرى (فهو يعيد تثبيت الحارس إذا تغيّر) ثم تحقق.

```bash
npm test        # 50 tests, no agy, no network (uses a fake agy in fixtures/)
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
docs/ (AGENTS.md, SECURITY-REVIEW.md, README.<lang>.md, index.html = website)   examples/   test/   fixtures/
```

المساهمات عبر issues وpull requests موضع ترحيب، خاصةً: نتائج `verify` على macOS وLinux، وإعدادات بيئة Codex المعزولة التي تعمل، وثغرات تجاوز الحارس (بلّغ عنها بشكل خاص أولًا إن أمكن)، وقواعد جديدة للماسح. الترجمات: انسخ `README.md` إلى `docs/README.<code>.md`، ثم ترجمه، وأضف اللغة إلى سطر مبدّل اللغات في كل مكان.

## الترخيص

MIT، راجع [LICENSE](../LICENSE).
