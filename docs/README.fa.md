# agy-review

**یک بازبین مستقل که باید کارش را نشان بدهد.** بازبینی کد، بازبینی امنیتی، واگذاری وظیفه و ترجمه با Google Antigravity (`agy`)، از داخل Claude Code، Codex یا هر ترمینال. فقط‌خواندنی، بدون درخواست مجوز، و هر یافته پیش از آنکه به دست شما برسد با کد واقعی شما مطابقت داده می‌شود.

[English](../README.md) · **فارسی** · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

وب‌سایت: https://ealireza.github.io/agy-review/ · مطالب تکمیلی (به انگلیسی): [AGENTS.md](AGENTS.md) برای عامل‌ها و حلقه‌ها، [SECURITY-REVIEW.md](SECURITY-REVIEW.md) برای روش بازبینی امنیتی.

---

## فهرست مطالب

1. چه چیزی به دست می‌آورید
2. چرا می‌توانید به گزارش اعتماد کنید
3. وضعیت: چه چیزی راستی‌آزمایی شده و چه چیزی نشده
4. پیش‌نیازها
5. نصب
6. نخستین اجرا: آن را روی دستگاه خودتان راستی‌آزمایی کنید
7. نحوه استفاده: بازبینی، امنیت، وظایف، ترجمه، مدل‌ها
8. استفاده از آن در عامل‌ها، زیرعامل‌ها و حلقه‌ها
9. مدل امنیتی
10. عیب‌یابی
11. پرسش‌های متداول
12. به‌روزرسانی، حذف، توسعه

---

## 1. چه چیزی به دست می‌آورید

| مهارت (Claude Code / Codex) | فرمان (Claude Code) | کار آن |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | بازبینی درجه‌بندی‌شده تغییرات git، یک شاخه، یک فایل، یک بازه از خطوط، یک تابع یا یک قطعه کد |
| `agy-security` / `security` | `/agy-review:security` | بازبینی امنیتی: OWASP/CWE، قابلیت بهره‌برداری، سناریوی حمله، پویشگر اسرار و الگوهای بد، و فراخواننده‌ها و فراخوانده‌شده‌ها به‌عنوان زمینه |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | هر وظیفه مستقل (بازنویسی، خلاصه‌سازی، پیش‌نویس، استخراج) را به Antigravity بسپارید و نتیجه را پس بگیرید |
| `agy-translate` / `translate` | `/agy-review:translate` | ترجمه با لحن، مخاطب و واژه‌نامه؛ بررسی می‌کند که کد، نشانی‌ها، جانگهدارها و ساختار سالم مانده باشند |
| `agy-models` / `models` | `/agy-review:models` | فهرست مدل‌های موجود در agy شما، انتخاب یکی، ذخیره آن برای پروژه یا به‌صورت سراسری، و تنظیم سطح تلاش |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | بررسی پیش‌نیازها، نصب نگهبان فقط‌خواندنی، و اثبات روی دستگاه شما که نوشتن مسدود است |

زیرعامل‌ها برای Claude Code: `agy-reviewer`، `agy-security`، `agy-worker`. همه‌چیز یک مخزن و یک اسکریپت است (`plugins/agy-review/scripts/agy-review.mjs`). سروری در کار نیست و به جز ورود خودتان به Antigravity حساب دیگری لازم نیست.

## 2. چرا می‌توانید به گزارش اعتماد کنید

یک مدل زبانی که کد را بازبینی می‌کند گاهی مشکلی را از خودش می‌سازد. این ابزار هیچ حرفی را بدون بررسی نمی‌پذیرد.

1. بازبین باید یک گزارش JSON سخت‌گیرانه بازگرداند (با `--json-schema` اجباری می‌شود). هر یافته **کد دقیقی** را که به آن مربوط است همراه دارد.
2. اسکریپت آن نقل‌قول را در فایل واقعی جست‌وجو می‌کند. **پیدا نشد: یافته رد می‌شود** و جداگانه فهرست می‌شود. **در خط دیگری پیدا شد: شماره خط اصلاح می‌شود.** نقل‌قول‌هایی که آنقدر کوتاه یا عمومی‌اند که چیزی را ثابت نمی‌کنند (`return null;`، `}`) رد می‌شوند. نقل‌قولی که با چند جای دور از خط ذکرشده مطابقت دارد، به‌دلیل ابهام رد می‌شود.
3. حکم نهایی، شمارش‌ها و دروازه CI **توسط اسکریپت محاسبه می‌شوند** و فقط بر پایه یافته‌های تأییدشده‌اند، هرگز از مدل کپی نمی‌شوند.
4. نبودن یافته تأییدشده **به معنای تأیید** نیست: اگر یافته‌ای رد شده باشد، مدل مخالفت کرده باشد، کد را پوشش نداده باشد یا یکی از چند مدل شکست خورده باشد، حکم `inconclusive` است و کد خروج 4 است.
5. یافته‌های بیرون از خطوط درخواست‌شده برچسب می‌خورند و هرگز دروازه را فعال نمی‌کنند. یافته‌های با اطمینان پایین فهرست می‌شوند اما شمرده نمی‌شوند.
6. شدت (تأثیر) و اولویت (زمان رفع) جدا از هم‌اند و هماهنگ نگه داشته می‌شوند: critical همیشه P0 است، nit همیشه P3 است، و یافته‌های سبک‌نگارشی هرگز بالاتر از low نیستند.

آنچه هنوز ممکن است: نقل‌قول درست با نتیجه‌گیری نادرست. نقل‌قول فقط ثابت می‌کند که کد وجود دارد، نه اینکه استدلال درست است؛ به همین دلیل هر یافته سناریوی مشخصی دارد و به همین دلیل باید پیش از اقدام، خطوط ذکرشده را بخوانید.

نمونه واقعی، این ابزار روی یک فایل کوچک با دو باگ کاشته‌شده (Claude Sonnet 4.6 از طریق agy): 4 یافته تأییدشده در خطوط درست با CWE-89، CWE-78، CWE-22 و CWE-369، پوشش 100 %، یک تکراری حذف شد، و پویشگر به‌طور مستقل همان دو خط را علامت زد.

## 3. وضعیت: چه چیزی راستی‌آزمایی شده و چه چیزی نشده

| بررسی | نتیجه |
|---|---|
| آزمون‌های واحد و خط لوله (`npm test`): grounding، محدوده، حکم، حذف تکراری، نمادیاب، هدف‌ها، پیکربندی، مدل‌ها، وظایف، ترجمه، امنیت، پنهان‌سازی | 50 آزمون، همه موفق، با یک `agy` ساختگی (شامل خط لوله agentic، تشخیص تغییر درخت، یک مدل ناموفق و دروازه `verify`) |
| قلاب نگهبان (فرمان‌ها و ابزارهای مجاز و ممنوع، ترفندهای نقل‌قول، مسیرهای اعتبارنامه) | آزمون‌های خودکار، موفق |
| مانیفست‌های Claude Code (`claude plugin validate`)، افزونه Antigravity (`agy plugin validate --strict`) | موفق |
| Codex 0.163.0: افزودن marketplace، نصب افزونه، کشف مهارت‌ها | روی Windows 11 بررسی شد |
| بازبینی ایستا، بازبینی امنیتی و وظایف با agy واقعی 1.4.8 (Gemini 3.8 Flash و Claude Sonnet 4.6)، اجراشده با Bun 1.3.14 | روی Windows 11 بررسی شد؛ یافته‌ها در خطوط درست grounded شدند |
| دو بازبینی مستقل از طراحی و کد (Opus: 25 یافته؛ Codex: 28 یافته)، موارد تأییدشده رفع شدند و برای هرکدام یک آزمون رگرسیون نوشته شد | انجام شد، تغییرنامه را ببینید |
| **بازبینی‌های agentic (`agy --dangerously-skip-permissions` به‌علاوه نگهبانی که نوشتن‌های واقعی را مسدود می‌کند)** | **توسط نویسنده اجرا نشده است** |

ردیف آخر برای ایمنی اهمیت دارد و به نسخه agy شما بستگی دارد؛ پس پس از نصب و پس از هر به‌روزرسانی agy یک بار `verify` را اجرا کنید (بخش 6). بازبینی‌های ایستا، بازبینی‌های امنیتی یک نماد/فایل/قطعه کد، وظایف و ترجمه‌ها هرگز از آن پرچم استفاده نمی‌کنند و نمی‌توانند چیزی را بنویسند.

آزمایش‌شده با agy 1.4.8، Codex CLI 0.163.0، Bun 1.3.14 و Node 24، روی Windows 11. macOS و Linux باید کار کنند (agy در همه سکوها از `~/.gemini/config/plugins` استفاده می‌کند) اما آزمایش نشده‌اند.

## 4. پیش‌نیازها

چیز دیگری لازم نیست: نه افزونه دیگری، نه ابزار خط فرمان دیگری.

| لازم است | چرا | چگونه تهیه کنید | چگونه بررسی کنید |
|---|---|---|---|
| Antigravity CLI یعنی `agy` | کار اصلی را انجام می‌دهد | https://antigravity.google/cli، سپس یک بار `agy` را اجرا کنید و وارد شوید | `agy --version` |
| Bun (پیشنهادی) **یا** Node.js 18.18+ | اسکریپت و قلاب نگهبان را اجرا می‌کند | https://bun.sh یا https://nodejs.org | `bun --version` / `node --version` |
| git | هدف‌های git و یافتن کد مرتبط | https://git-scm.com | `git --version` |
| Claude Code **یا** Codex **یا** هر ترمینال | جایی که درخواست می‌دهید | راهنمای نصب آن‌ها | `claude --version` / `codex --version` |

Bun در همه دستورالعمل‌ها و در قلاب نگهبان پیش‌فرض است (`bun guard.mjs || node guard.mjs`)؛ Node دقیقاً به همان شکل کار می‌کند. مصرف Antigravity از سهمیه خود شما کسر می‌شود. یک بازبینی می‌تواند از چند ثانیه تا چند دقیقه طول بکشد.

## 5. نصب

میزبانی را که استفاده می‌کنید انتخاب کنید؛ چند میزبان می‌توانند از یک اسکریپت و یک نگهبان مشترک استفاده کنند.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` فرمان agy، git و نگهبان را بررسی می‌کند و نگهبان را در `~/.gemini/config/plugins/readonly-review` نصب می‌کند. `/agy-review:verify` اثبات زنده ایمنی است.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Codex را دوباره راه‌اندازی کنید، سپس به زبان ساده بپرسید: «پیکربندی بازبینی Antigravity من را بررسی کن»، «تغییرات من را با Antigravity بازبینی کن»، «تابع saveUpload را از نظر امنیتی بازبینی کن»، «README.md را با لحن دوستانه به آلمانی ترجمه کن».

1. **نگهبان را یک بار از یک ترمینال معمولی نصب کنید** (در `~/.gemini/config/plugins` می‌نویسد): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.0/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.0\scripts\agy-review.mjs`). فقط بازبینی‌های agentic روی git به نگهبان نیاز دارند.
2. **سندباکس Codex باید اجازه کار به agy بدهد:** شبکه خروجی، دسترسی نوشتن به `~/.gemini/antigravity-cli` و یک سوکت localhost. با `workspace-write` احتمالاً در `~/.codex/config.toml` به این نیاز خواهید داشت:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   اگر چیزی همچنان مسدود بود، مهارت دسترسی گم‌شده را نام می‌برد و متوقف می‌شود؛ هرگز خودش مجوزها را گسترش نمی‌دهد. اینکه agy درون سندباکس Codex شما درست اجرا می‌شود یا نه، بخشی از راه‌اندازی Codex است که نویسنده نتوانسته آزمایش کند؛ پس `verify` را از داخل Codex هم اجرا کنید.

### 5c. ترمینال ساده

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

نکته: `alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`.

### 5d. فقط سمت Antigravity

نگهبان یک افزونه معمولی Antigravity است. `plugins/agy-review/antigravity-plugin/readonly-review` را در `~/.gemini/config/plugins/readonly-review` کپی کنید یا `--install-guard` را اجرا کنید؛ با `agy plugin list` بررسی کنید. تا وقتی پرامپتی شامل `AGY_READONLY_REVIEW` نباشد هیچ کاری نمی‌کند، پس نشست‌های عادی agy شما بدون تغییر می‌مانند. یک مهارت `readonly-code-review` برای agy تعاملی هم همراه آن عرضه می‌شود.

## 6. نخستین اجرا: آن را روی دستگاه خودتان راستی‌آزمایی کنید

یک بار پس از نصب و پس از هر به‌روزرسانی agy اجرا کنید: `/agy-review:verify`، مهارت `verify` در Codex، یا `--verify`. این کار یک فراخوانی زنده کوچک به agy در یک پوشه موقت انجام می‌دهد: خواندن یک فایل (باید کار کند)، نوشتن یک فایل، تغییر مسیر خروجی به یک فایل و حذف یک فایل (همه باید مسدود شوند). نتیجه مورد انتظار:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

هر `FAIL` به `NOT VERIFIED` ختم می‌شود و بازبینی‌های agentic غیرفعال می‌مانند: با خروجی و `agy --version` خود یک issue باز کنید. نتیجه موفق `verify` دقیقاً برای همین نگهبان و همین نسخه agy ثبت می‌شود؛ **بازبینی‌های agentic بدون آن شروع نمی‌شوند**، و به‌روزرسانی agy یا نگهبان آن را باطل می‌کند، پس پس از به‌روزرسانی‌ها دوباره `verify` را اجرا کنید. حالت‌های ایستا به آن نیاز ندارند.

## 7. نحوه استفاده

از ریشه مخزن اجرا کنید.

### 7a. بازبینی: هدف را انتخاب کنید

| می‌خواهید بازبینی کنید | استفاده کنید | حالت |
|---|---|---|
| کار کامیت‌نشده | هیچ | agentic، فقط‌خواندنی |
| یک شاخه / تغییرات staged / یک کامیت | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | agentic، فقط‌خواندنی |
| یک فایل یا یک بازه | `--file src/a.kt` یا `--file src/a.kt:40-80` (قابل تکرار) | ایستا |
| یک تابع یا کلاس | `--symbol parseConfig` (+ در صورت مبهم بودن نام، `--file`) | ایستا |
| کدی که فقط در حافظه وجود دارد | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | ایستا |
| هرکدام از موارد بالا به‌علاوه اجازه نگاه کردن به فایل‌های دیگر | `--agentic` را اضافه کنید | agentic، فقط‌خواندنی |

*ایستا*: اسکریپت خودش کد را می‌خواند و شماره‌گذاری می‌کند و مدل هیچ ابزاری ندارد؛ پس چیزی را نمی‌توان دست زد و درباره فایل‌هایی که به مدل نشان داده نشده چیزی نمی‌توان از خود ساخت. *Agentic*: بازبین مخزن را خودش از طریق قلاب نگهبان می‌خواند که هر نوشتنی را مسدود می‌کند.

به بازبین کمک کنید: `--context "what this code must do"`، `--focus "concurrency, error handling"` (یا کلمات پایانی)، `--context-lines N`.

خروجی: به‌صورت پیش‌فرض Markdown؛ `--format json` برای ماشین‌ها؛ `--output file`؛ `--fail-on high` (اگر یافته تأییدشده high یا critical وجود داشته باشد، خروج با کد 10)؛ `--previous old.json` یافته‌ها را به‌صورت جدید، ماندگار، رفع‌شده یا دوباره‌گزارش‌نشده علامت می‌زند.

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

### 7b. بازبینی امنیتی

`--security` (مهارت `agy-security`، فرمان `/agy-review:security`، زیرعامل `agy-security`) روی هر هدف بالا کار می‌کند و این موارد را اضافه می‌کند: روش مدل‌سازی تهدید (از منبع نامعتبر تا مقصد خطرناک، همراه با کنترل‌های میان‌راه)، نگاشت OWASP Top 10 (2021) و CWE، `exploitability` (`demonstrated`، `likely`، `conditional`، `theoretical`)، `attack_scenario`، `data_flow`، یک پویشگر بدون مدل برای اسرار و حدود ~25 دسته الگوی بد، و **کد مرتبط**: آنچه هدف فراخوانی می‌کند و چه کسی آن را فراخوانی می‌کند.

- یک راز درج‌شده در کد (کلید خصوصی، AWS، GitHub، Stripe، Slack، Google) **پیش از ارسال هر چیزی به مدل پنهان می‌شود** و بر اساس الگو به‌عنوان یافته گزارش می‌شود.
- یک `cve` در گزارش ادعای مدل است و همیشه با `cve_verified: false` برچسب می‌خورد: آن را در NVD یا با `osv-scanner` / `npm audit` / `pip-audit` تأیید کنید. این ابزار هرگز CVE نمی‌سازد و تأیید هم نمی‌کند.
- «Claude کد نوشت، آن و همسایگانش را بازبینی کن»: قاعده آماده را از `examples/` در `CLAUDE.md` یا `AGENTS.md` خود کپی کنید، یا قلاب اختیاری Stop یا قلاب pre-commit را نصب کنید. جزئیات و دستورهای زنجیره‌ای: [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. وظایف: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

مدل فقط متنی را که می‌دهید دریافت می‌کند و هیچ ابزاری ندارد. حالت متنی فقط پاسخ را چاپ می‌کند؛ stderr مدل و سطح تلاش را گزارش می‌دهد.

### 7d. ترجمه: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

گزینه‌ها: `--from`، `--variant` (pt-BR، zh-TW، de-CH ...)، `--tone` (formal، neutral، friendly، casual، technical، marketing، literary، legal)، `--audience`، `--glossary` (JSON به شکل `{"repo":"مخزن","API":"="}` یا CSV؛ `=` اصطلاح را حفظ می‌کند)، `--keep a,b`، `--notes`، `--strict`. متن‌های بلند بر اساس خطوط خالی (هرگز درون بلوک کد) تقسیم و تکه‌تکه ترجمه می‌شوند. پس از ترجمه، اسکریپت بررسی می‌کند که کد بلوکی، کد درون‌خطی، نشانی‌ها، جانگهدارها (`{{x}}`، `${x}`، `%s`)، تگ‌ها و سرفصل‌ها با متن مبدأ یکی باشند و هر تفاوتی را گزارش می‌کند (`--strict` تفاوت را به خروج با کد 11 تبدیل می‌کند). مهارت‌ها ابتدا درباره لحن، مخاطب و اصطلاحات از شما می‌پرسند و فقط چیزهایی را می‌پرسند که خودشان نمی‌توانند استنباط کنند. بررسی ماشینی نمی‌تواند روانی متن را بسنجد؛ برای متن‌های مهم از یک فارسی‌زبان بخواهید آن را بخواند.

### 7e. مدل‌ها و سطح تلاش

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

برای هر اجرا: `--model <id|name>`، `--models a,b`، `--effort auto|low|medium|high|xhigh|max`. اولویت: خط فرمان، فایل پروژه، فایل کاربر، پیش‌فرض agy. `--effort auto` (پیش‌فرض) انتخابی قطعی و توضیح‌داده‌شده است: بازبینی‌ها با مقدار کد در محدوده مقیاس می‌گیرند (تمرکز حساس به ریسک مانند امنیت یک پله اضافه می‌کند)، وظایف با عبارت‌بندی (تبدیل‌های مکانیکی low، وظایف استدلال‌محور high) و طول ورودی؛ `max` هرگز خودکار انتخاب نمی‌شود. برخی مدل‌ها `--effort` را نمی‌پذیرند؛ در آن صورت ابزار پیش‌فرض مدل را به کار می‌برد و این را اعلام می‌کند. اگر فیلتر محتوای Gemini پرامپتی را رد کند و شما مدلی را نام نبرده باشید، ابزار یک بار با یک مدل غیر Gemini دوباره تلاش می‌کند و این را اعلام می‌کند.

### 7f. گزینه‌ها و کدهای خروج

`bun agy-review.mjs --help` همه‌چیز را فهرست می‌کند. کدهای خروج: `0` موفق · `1` خطا، پایان مهلت یا پاسخ غیرقابل تجزیه · `2` خطای استفاده یا پیش‌نیاز مفقود · `3` درخت کاری در طول بازبینی agentic تغییر کرد · `4` نتیجه‌نگرفته یا ناقص (**قبولی نیست**) · `10` دروازه `--fail-on` رد شد (گزارش معتبر است) · `11` بررسی ترجمه با `--strict` شکست خورد. اگر چند حالت هم‌زمان برقرار باشد، `3` بر `10` و `10` بر `4` غلبه دارد؛ در همه حالت‌ها به جز `1` و `2` گزارشی نوشته می‌شود، پس `verdict` و `incomplete` را در آن بخوانید. درخت کاری پاک خطا نیست: ابزار «No changes to review» را چاپ می‌کند و بدون فراخوانی مدل با کد 0 خارج می‌شود.

## 8. استفاده از آن در عامل‌ها، زیرعامل‌ها و حلقه‌ها

هر مهارت یک فراخوانی ساده خط فرمان با JSON پایدار است، پس هر عاملی می‌تواند از آن استفاده کند: زیرعامل `agy-reviewer`، `agy-security` یا `agy-worker` را در Claude Code بسازید، مهارت‌ها را در Codex صدا بزنید، یا اسکریپت را از هر چارچوبی فراخوانی کنید.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

به بازبین هرگز گفته نمی‌شود چه چیزی را تغییر داده‌اید، پس هر دور مستقل می‌ماند. قرارداد کامل، فیلدهای JSON، دستورهای حلقه و الگوهای fan-out: [AGENTS.md](AGENTS.md).

## 9. مدل امنیتی

**بازبینی‌های ایستا، بازبینی‌های امنیتی یک نماد/فایل/قطعه کد، وظایف و ترجمه‌ها** agy را بدون هیچ پرچم مجوز و بدون ابزار در یک پوشه موقت خالی اجرا می‌کنند: agy نمی‌تواند فایل‌های شما را بخواند یا بنویسد؛ تنها داده‌ای که بیرون می‌رود همان است که اسکریپت در پرامپت گذاشته (با اسرار شناخته‌شده پنهان‌شده).

**بازبینی‌های agentic** (هدف‌های git، یا `--agentic`) agy را با `--dangerously-skip-permissions` راه می‌اندازند تا هیچ چیز منتظر درخواست مجوز نماند، و بر یک قلاب نگهبان `PreToolUse` (`guard.mjs`) تکیه می‌کنند که هر فراخوانی ابزار را بررسی می‌کند و **به‌صورت پیش‌فرض رد می‌کند**:

- مجاز: ابزارهای مشاهده و جست‌وجوی فایل؛ فرمان‌های پوسته، تکی یا زنجیره‌ای، که فقط از زیرفرمان‌های فقط‌خواندنی `git`، و همچنین `rg`، `grep`، `cat`، `ls`، `head`، `tail`، `wc`، `find` (بدون `-delete`/`-exec`)، `Get-*` در PowerShell، `Select-String` و چند مورد دیگر ساخته شده باشند (فهرست در `guard.mjs` است)؛
- ممنوع: هر ابزار نوشتن/ویرایش/notebook/تصویر/زمان‌بندی/زیرعامل/مرورگر/وب/MCP و هر ابزار ناشناخته؛ تغییر مسیر خروجی، `$(...)`، backtick، بلوک‌های اسکریپت، سازه‌های شبیه `eval`؛ `git commit/push/checkout/reset/...`؛ مفسرها و مدیران بسته؛ `curl`، `ssh`؛ خواندن مخازن اعتبارنامه (`.ssh`، `.aws`، `.gnupg`، کلیدهای خصوصی)؛
- اگر نگهبان از کار بیفتد رد می‌کند؛ اسکریپت از شروع اجرای agentic امتناع می‌کند مگر اینکه نگهبان نصب شده باشد، با نسخه همراه یکسان باشد، **و یک `--verify` موفق برای این نگهبان و این نسخه agy ثبت شده باشد**؛ پیش و پس از اجرا از `git status`، تفاوت‌های tracked و staged و محتوای هر فایل untracked اثرانگشت می‌گیرد، و اگر چیزی متفاوت باشد با هشدار و کد 3 خارج می‌شود.
- **اسرار در حالت agentic را نمی‌توان پنهان کرد** پیش از آنکه بازبین فایل‌ها را بخواند. ابزار آن‌ها را شناسایی می‌کند، هشدار می‌دهد و در `limitations` فهرست می‌کند؛ آن‌ها را بچرخانید (rotate)، یا با `--file` / `--symbol` بازبینی کنید که در آن‌ها اسرار ابتدا پنهان می‌شوند.

آنچه این نیست:

- **سندباکس سطح سیستم‌عامل نیست.** نگهبان نام ابزارها و متن فرمان را فیلتر می‌کند؛ سندباکس خود agy همه‌جا در دسترس نیست. یک تزریق پرامپت عمدی پنهان در کد بازبینی‌شده می‌تواند به دنبال شکلی از فرمان بگردد که فیلتر می‌پذیرد. بررسی پیش/پس از اجرا فایل‌های tracked تغییریافته و فایل‌های جدید را می‌گیرد، نه خواندن‌ها را.
- **کد شما به مدل Google ارسال می‌شود**؛ خواندن‌ها جز مسیرهای اعتبارنامه نامحدودند. فایل‌های `.env` در مخزن برای بازبینی‌های agentic قابل خواندن‌اند. کدی را که اجازه اشتراک‌گذاری آن را ندارید بازبینی نکنید.
- git می‌تواند برنامه‌های خارجی diff یا textconv پیکربندی‌شده در یک مخزن را اجرا کند: مخازنی را بازبینی کنید که به آن‌ها اعتماد دارید.
- یافته‌ها ممکن است نادرست یا ناقص باشند، و «بدون یافته» هرگز به معنای «امن» نیست.

## 10. عیب‌یابی

| نشانه | علت و راه‌حل |
|---|---|
| `Missing: agy CLI` | Antigravity CLI را نصب کنید و یک بار `agy` را برای ورود اجرا کنید؛ `agy --version` باید در پوسته‌ای که افزونه را اجرا می‌کند کار کند |
| `Missing: read-only guard - missing/outdated` | setup را اجرا کنید (`/agy-review:setup`، مهارت `setup` در Codex، یا `--install-guard`)؛ فقط بازبینی‌های agentic به آن نیاز دارند |
| `Not inside a git repository` (کد خروج 2) | با `cd` به ریشه مخزن بروید، یا کد را با `--file` / `--symbol` / `--stdin` بازبینی کنید |
| حکم `inconclusive`، کد خروج 4 | قبولی نیست: یافته‌ها رد شده‌اند، مدل مخالفت کرده یا کد را پوشش نداده، یا یک مدل شکست خورده. محدوده را کوچک‌تر کنید، `--context` اضافه کنید، یا `--model` دیگری را امتحان کنید |
| `blocked by Gemini's filters` | فیلتر ایمنی Gemini رد کرد (برای پرامپت‌های امنیتی رایج است). بدون `--model` ابزار با یک مدل غیر Gemini دوباره تلاش می‌کند؛ در غیر این صورت با `--model` یکی را انتخاب کنید |
| `--effort is not supported for model` | خودکار مدیریت می‌شود (پیش‌فرض مدل استفاده و گزارش می‌شود) |
| بازبینی خالی، کد خروج 1 | ورود و سهمیه را با `agy -p "say hi"` بررسی کنید؛ برای هدف‌های بزرگ `--timeout` را بالا ببرید |
| کد خروج 3 / درخت کاری تغییر کرد | چیزی در طول بازبینی agentic فایل‌های شما را تغییر داده است (ویرایشگر، ساخت یا دور زدن نگهبان). `git status` و `git diff` را بررسی کنید؛ اگر شما آن‌ها را تغییر نداده‌اید، آن را یک رویداد امنیتی بدانید |
| یافته‌های رد‌شده بسیار | مدل کدی را نقل کرده که وجود ندارد. گاهی انتظار می‌رود؛ هرگز شمرده نمی‌شوند. از `--model` قوی‌تر یا محدوده کوچک‌تر استفاده کنید |
| `--symbol`: "defined in several places" یا "not found" | `--file` را بدهید، یا از `--file path:A-B` استفاده کنید. نمادیاب ابتکاری است (تطبیق آکولاد/تورفتگی)، تجزیه‌گر نیست |
| Codex: "blocked by sandbox" | بخش 5b را ببینید: شبکه، نوشتن در `~/.gemini/antigravity-cli` و یک سوکت localhost باید مجاز باشند |
| Windows: `agy` یا `bun` درون Claude/Codex پیدا نمی‌شود | پوسته ابزار `PATH` متفاوتی دارد؛ آن را از پوسته‌ای که فرمان در آن کار می‌کند راه‌اندازی کنید |
| `verify` عبارت FAIL را چاپ می‌کند | بازبینی agentic را روی کد مهم به کار نبرید؛ با خروجی و `agy --version` یک issue باز کنید |

## 11. پرسش‌های متداول

**آیا کد من را تغییر می‌دهد؟** خیر. حالت‌های ایستا نمی‌توانند؛ حالت agentic نوشتن را مسدود می‌کند و اگر پس از آن درخت شما متفاوت باشد هشدار می‌دهد. هرگز چیزی را commit، stash یا checkout نمی‌کند.

**آیا Bun در اینجا از Node سریع‌تر است؟** به‌طور قابل اندازه‌گیری خیر. روی دستگاه Windows نویسنده راه‌اندازی با Node حدود 56 ms و با Bun 64 ms بود، و قلاب نگهبان حدود 60 ms در برابر 57 ms؛ یک بازبینی ده‌ها ثانیه طول می‌کشد و آن زمان از مدل است. Bun پیش‌فرض مستند است؛ Node 18.18+ همان‌طور کار می‌کند. هر دو را همان کد پوشش می‌دهد.

**آیا هزینه دارد؟** افزونه رایگان است. هر بازبینی از سهمیه Antigravity شما مصرف می‌کند.

**Antigravity کدام فایل‌ها را می‌بیند؟** حالت‌های ایستا: فقط کدی که اسکریپت می‌فرستد (به‌علاوه کد مرتبط محدود برای `--security`). حالت‌های agentic: هرچه در مخزن بخواند، و هر جای دیسک به جز مسیرهای اعتبارنامه.

**آیا می‌تواند یافته‌ها را رفع کند؟** هرگز نمی‌کند. عامل دیگری یا خود شما رفع می‌کنید؛ بازبین فقط بازبینی می‌کند، تا مستقل بماند.

**آیا می‌تواند pull request در GitHub را بازبینی کند؟** شاخه را به‌صورت محلی checkout کنید و از `--base` استفاده کنید. دسترسی به API گیت‌هاب وجود ندارد.

**چرا فرمان‌ها را در تنظیمات agy فهرست مجاز نمی‌کنید؟** آزمایش شد: در حالت headless، agy مجوزهای چندکلمه‌ای را دقیقاً تطبیق می‌دهد (`git status` بله، `git status --short` نه) و «allow» یک قلاب بر بررسی مجوز غلبه نمی‌کند. یک قلاب فقط می‌تواند به‌طور قابل اعتماد رد کند؛ از این رو برای حالت agentic از skip-permissions به‌علاوه یک قلاب رد-به‌صورت-پیش‌فرض استفاده می‌شود و برای حالت ایستا هیچ ابزاری در کار نیست.

**آیا می‌توانم فرمان مجاز یا قاعده پویشگر اضافه کنم؟** `CMDS` / `GIT_OK` را در `guard.mjs` یا `RULES` را در `lib/security.mjs` ویرایش کنید، `npm test` را اجرا کنید، سپس `--install-guard`.

## 12. به‌روزرسانی، حذف، توسعه

```text
/plugin marketplace update agy-review          # Claude Code        |  codex plugin marketplace upgrade agy-review  # Codex
/plugin uninstall agy-review@agy-review        # Claude Code        |  codex plugin remove agy-review@agy-review    # Codex
bun .../agy-review.mjs --uninstall-guard       # removes the guard from ~/.gemini/config/plugins
```

پس از به‌روزرسانی دوباره setup را اجرا کنید (نگهبان تغییریافته را دوباره نصب می‌کند) و verify کنید.

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

issueها و pull requestها پذیرفته می‌شوند، به‌ویژه: نتایج `verify` روی macOS و Linux، تنظیمات سندباکس Codex که کار می‌کنند، دور زدن‌های نگهبان (در صورت امکان ابتدا به‌صورت خصوصی گزارش دهید) و قواعد جدید پویشگر. ترجمه‌ها: `README.md` را در `docs/README.<code>.md` کپی کنید، ترجمه کنید، و زبان را در همه‌جا به خط تعویض زبان اضافه کنید.

## مجوز

MIT، [LICENSE](../LICENSE) را ببینید.
