# agy-review

**بازبینی مستقلی که باید کارش را نشان دهد.** بازبینی کد، بازبینی امنیتی، واگذاری کار و ترجمه با Google Antigravity (`agy`)، از داخل Claude Code، Codex یا هر ترمینالی. فقط خواندنی است، prompt مجوز نشان نمی‌دهد و هر یافته را پیش از نمایش با کد واقعی شما بررسی می‌کند.

> ## جدید: دیگر برای تازه‌سازی گراف graphify، tokenهای Claude و Codex را خرج نکنید
>
> **به‌روزرسانی‌های graphify حالا با هر commit، merge، checkout و rebase، در پس‌زمینه روی Antigravity اجرا می‌شوند. Agent شما برای آن‌ها 0 token مصرف می‌کند و به هیچ API key نیاز ندارید.**
>
> فقط با دستور `agy-review --graphify setup`، hookهای git مربوط به graphify دوباره ثبت می‌شوند تا **بخش پرهزینه هر به‌روزرسانی گراف (خواندن مستندات و نام‌گذاری جامعه‌ها با یک model زبانی) به‌جای نشست Opus یا Fable شما، با یک model ارزان Antigravity انجام شود.** `git commit` در کسری از ثانیه برمی‌گردد و گراف خودش به‌روز می‌شود.
>
> در یک اجرای واقعی روی Windows، commitی که کد و یک سند را تغییر داده بود، گراف را **در 22 ثانیه، با یک فراخوانی Antigravity و 0 token از Claude یا Codex** به‌روز کرد. model پشت آن فقط می‌تواند متن بخواند و متن پاسخ دهد؛ هیچ ابزاری ندارد و اجازه نوشتن یا exec هم ندارد. جزئیات و راه‌اندازی: بخش 7g.

[English](../README.md) · **فارسی** · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · [Türkçe](README.tr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

وب‌سایت: https://ealireza.github.io/agy-review/ · توضیحات عمیق‌تر (English): [docs/AGENTS.md](AGENTS.md) برای Agentها و حلقه‌ها، [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md) برای روش امنیتی.

---

## فهرست

1. چه چیزی دریافت می‌کنید
2. چرا می‌توانید به گزارش اعتماد کنید
3. وضعیت: چه چیزهایی تأیید شده‌اند و چه چیزهایی نه
4. پیش‌نیازها
5. نصب
6. اولین اجرا: آن را روی سیستم خودتان بررسی کنید
7. استفاده: بازبینی، امنیت، کارها، ترجمه، modelها، graphify
8. استفاده از داخل Agentها، sub-agentها و حلقه‌ها
9. model امنیتی
10. رفع اشکال
11. پرسش‌های رایج
12. به‌روزرسانی (روش دریافت نسخه جدید)، حذف و توسعه

---

## 1. چه چیزی دریافت می‌کنید

| Skill (Claude Code / Codex) | دستور (Claude Code) | چه کاری می‌کند |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | بازبینی امتیازبندی‌شده تغییرات git، یک branch، فایل، بازه‌ای از خط‌ها، یک تابع یا قطعه‌کد |
| `agy-security` / `security` | `/agy-review:security` | بازبینی امنیتی: OWASP/CWE، امکان بهره‌برداری، سناریوی حمله، اسکنر رازها و الگوهای بد، همراه با فراخوان‌ها و فراخوانی‌شونده‌ها به‌عنوان زمینه |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | هر کار مستقل (بازنویسی، خلاصه‌سازی، پیش‌نویس، استخراج) را به Antigravity می‌سپارد و نتیجه را برمی‌گرداند |
| `agy-translate` / `translate` | `/agy-review:translate` | ترجمه با لحن، مخاطب و واژه‌نامه؛ بررسی می‌کند کد، URLها، جای‌نگهدارها و ساختار سالم مانده باشند |
| `agy-models` / `models` | `/agy-review:models` | modelهای موجود در agy و `--effort` قابل‌قبول هرکدام را فهرست می‌کند، یکی را انتخاب می‌کند و برای پروژه یا به‌صورت سراسری ذخیره می‌کند |
| `agy-graphify` / `graphify` | `/agy-review:graphify` | **گراف graphify را با hookهای git روی Antigravity تازه نگه می‌دارد: 0 token از Claude یا Codex و بدون API key** |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | پیش‌نیازها را بررسی می‌کند، محافظ فقط‌خواندنی را نصب می‌کند و روی سیستم شما ثابت می‌کند نوشتن مسدود است |

sub-agentهای Claude Code: `agy-reviewer`، `agy-security`، `agy-worker`. همه‌چیز در یک repository و یک اسکریپت (`plugins/agy-review/scripts/agy-review.mjs`) قرار دارد. هیچ سروری وجود ندارد و جز حساب Antigravity خودتان به حساب دیگری نیاز نیست.

## 2. چرا می‌توانید به گزارش اعتماد کنید

model زبانی هنگام بازبینی کد گاهی مشکلی را از خودش می‌سازد. این ابزار هیچ ادعایی را بدون بررسی قبول نمی‌کند.

1. بازبین باید یک گزارش JSON سخت‌گیرانه برگرداند (که با `--json-schema` اعمال می‌شود). هر یافته شامل **کد دقیق** مربوط به خودش است.
2. اسکریپت آن نقل‌قول را در فایل واقعی پیدا می‌کند. **پیدا نشد: یافته رد می‌شود** و جداگانه در فهرست می‌آید. **در خط دیگری پیدا شد: شماره خط اصلاح می‌شود.** نقل‌قول‌هایی که برای اثبات بیش از حد کوتاه یا عمومی‌اند (`return null;`، `}`) رد می‌شوند. نقل‌قولی که دور از خط اعلام‌شده در چند جای مختلف پیدا شود، به‌دلیل ابهام رد می‌شود.
3. نتیجه نهایی، تعدادها و دروازه CI **فقط بر اساس یافته‌های تأییدشده توسط اسکریپت محاسبه می‌شوند** و هرگز از model کپی نمی‌شوند.
4. نبودن یافته تأییدشده **به‌معنای تأیید کد نیست**: اگر یافته‌ای رد شده باشد، modelها اختلاف داشته باشند، کد پوشش داده نشده باشد یا یکی از چند model شکست بخورد، نتیجه `inconclusive` و exit code برابر 4 است.
5. یافته‌های بیرون از خط‌های درخواستی برچسب می‌خورند و هرگز جلوی کار را نمی‌گیرند. یافته‌های کم‌اطمینان فهرست می‌شوند، اما شمرده نمی‌شوند.
6. شدت (میزان اثر) و اولویت (زمان رفع) جدا هستند و سازگار نگه داشته می‌شوند: critical همیشه P0 است، nit همیشه P3 است و یافته‌های مربوط به سبک هرگز بالاتر از low نیستند.

چیزی که هنوز ممکن است رخ دهد: نقل‌قول درست باشد، اما نتیجه‌گیری اشتباه. نقل‌قول فقط وجود کد را ثابت می‌کند، نه درستی استدلال را؛ به همین دلیل هر یافته یک سناریوی مشخص دارد و باید پیش از اقدام، خط‌های اشاره‌شده را خودتان بخوانید.

نمونه واقعی، اجرای این ابزار روی فایلی کوچک با دو باگ عمدی (Claude Sonnet 4.6 از طریق agy): 4 یافته تأییدشده در خط‌های درست با CWE-89، CWE-78، CWE-22 و CWE-369، پوشش 100 %، حذف یک مورد تکراری و گزارش مستقل همان دو خط توسط اسکنر.

## 3. وضعیت: چه چیزهایی تأیید شده‌اند و چه چیزهایی نه

| بررسی | نتیجه |
|---|---|
| آزمون‌های واحد و خط لوله (`npm test`): استناد به کد، محدوده، نتیجه، حذف تکرار، پیدا کردن نماد، هدف‌ها، پیکربندی، modelها، کارها، ترجمه، امنیت، حذف اطلاعات حساس | 72 آزمون، همگی موفق، با یک `agy` ساختگی (شامل خط لوله Agentمحور، تشخیص تغییر درخت، model ناموفق و دروازه `verify`) |
| hook محافظ (دستورها و ابزارهای مجاز و غیرمجاز، ترفندهای نقل‌قول، مسیرهای اطلاعات ورود) | آزمون‌های خودکار، موفق |
| مانیفست‌های Claude Code (`claude plugin validate`)، plugin مربوط به Antigravity (`agy plugin validate --strict`) | موفق |
| Codex 0.163.0: افزودن marketplace، نصب plugin، شناسایی skillها | بررسی‌شده روی Windows 11 |
| بازبینی ایستا، بازبینی امنیتی و کارها با agy واقعی 1.4.8 (Gemini 3.8 Flash و Claude Sonnet 4.6)، اجراشده با Bun 1.3.14 | بررسی‌شده روی Windows 11؛ یافته‌ها به خط‌های درست متصل بودند |
| `--effort` هر model: model پیش‌فرض (low، medium، high)، modelهایی که effort در نامشان است و modelهای Claude بدون `--effort` | بررسی‌شده با agy واقعی 1.4.8 |
| graphify روی Antigravity، از ابتدا تا انتها: graphify واقعی 0.9.86 به‌همراه agy واقعی 1.4.8 روی Windows. یک hook مربوط به git گراف را در پس‌زمینه به‌روز کرد (22 s، 1 فراخوانی Antigravity، بازگشت `git commit` در 0.3 s) و فقط سند تغییریافته برای model فرستاده شد | بررسی دستی و آزمون با graphify و agy ساختگی |
| دو بازبینی مستقل طراحی و کد (Opus: 25 یافته؛ Codex: 28 یافته)، رفع موارد تأییدشده همراه با یک آزمون رگرسیون برای هرکدام | انجام‌شده، changelog را ببینید |
| **بازبینی‌های Agentمحور (`agy --dangerously-skip-permissions` همراه با محافظی که نوشتن واقعی را مسدود می‌کند)** | **توسط نویسنده اجرا نشده است** |

موردی که نویسنده آزمایش نکرده است: `--graphify setup --yes` روی نصب واقعی graphify با `uv tool` (آزمون دستی از graphify نصب‌شده با pip استفاده کرد که از قبل پکیج `openai` را داشت). ردیف Agentمحور برای امنیت مهم است و به نسخه agy شما بستگی دارد؛ پس پس از نصب و بعد از هر به‌روزرسانی agy، یک بار `verify` را اجرا کنید (بخش 6). بازبینی‌های ایستا، بازبینی امنیتی یک نماد/فایل/قطعه‌کد، کارها و ترجمه‌ها هرگز از آن flag استفاده نمی‌کنند و نمی‌توانند چیزی بنویسند.

آزمایش‌شده با agy 1.4.8، Codex CLI 0.163.0، Bun 1.3.14 و Node 24 روی Windows 11. macOS و Linux باید کار کنند (agy در همه پلتفرم‌ها از `~/.gemini/config/plugins` استفاده می‌کند)، اما آزمایش نشده‌اند.

## 4. پیش‌نیازها

چیز دیگری لازم نیست: نه plugin دیگری و نه ابزار CLI دیگری.

| لازم است | چرا | روش دریافت | روش بررسی |
|---|---|---|---|
| Antigravity CLI با نام `agy` | کار را انجام می‌دهد | https://antigravity.google/cli، سپس `agy` را یک بار اجرا و وارد حساب شوید | `agy --version` |
| Bun (پیشنهادی) **یا** Node.js 18.18+ | اسکریپت و hook محافظ را اجرا می‌کند | https://bun.sh یا https://nodejs.org | `bun --version` / `node --version` |
| git | هدف‌های git و کد مرتبط با یافته را پیدا می‌کند | https://git-scm.com | `git --version` |
| Claude Code **یا** Codex **یا** هر ترمینال | جایی که درخواست می‌دهید | راهنمای نصب خودشان | `claude --version` / `codex --version` |

Bun در همه دستورالعمل‌ها و hook محافظ پیش‌فرض است (`bun guard.mjs || node guard.mjs`)؛ Node دقیقاً همان‌طور کار می‌کند. استفاده از Antigravity از quota خودتان کم می‌کند. یک بازبینی ممکن است از چند ثانیه تا چند دقیقه طول بکشد.

## 5. نصب

میزبان مورد استفاده‌تان را انتخاب کنید؛ چند میزبان می‌توانند از یک اسکریپت و محافظ مشترک استفاده کنند.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup`، agy، git و محافظ را بررسی می‌کند و محافظ را در `~/.gemini/config/plugins/readonly-review` نصب می‌کند. `/agy-review:verify` آزمون زنده امنیت است.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Codex را دوباره راه‌اندازی کنید، سپس با زبان معمولی بخواهید: «تنظیمات بازبینی Antigravity من را بررسی کن»، «تغییراتم را با Antigravity بازبینی کن»، «تابع saveUpload را از نظر امنیتی بازبینی کن»، «README.md را با لحن دوستانه به German ترجمه کن».

1. **محافظ را یک بار از ترمینال عادی نصب کنید** (در `~/.gemini/config/plugins` می‌نویسد): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.1/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.1\scripts\agy-review.mjs`؛ نام پوشه همان نسخه نصب‌شده است، بنابراین پس از به‌روزرسانی از پوشه موجود استفاده کنید). فقط بازبینی‌های git به‌صورت Agentمحور به محافظ نیاز دارند.
2. **sandbox مربوط به Codex باید اجازه کار به agy بدهد:** شبکه خروجی، دسترسی نوشتن در `~/.gemini/antigravity-cli` و یک سوکت localhost. با `workspace-write` احتمالاً باید این را در `~/.codex/config.toml` داشته باشید:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   اگر چیزی هنوز مسدود باشد، skill دسترسی گمشده را نام می‌برد و متوقف می‌شود؛ هرگز خودش مجوزها را گسترده‌تر نمی‌کند. نویسنده نتوانسته درستی اجرای agy داخل sandbox مربوط به Codex شما را آزمایش کند، پس `verify` را از داخل Codex هم اجرا کنید.

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

محافظ یک plugin معمولی Antigravity است. `plugins/agy-review/antigravity-plugin/readonly-review` را در `~/.gemini/config/plugins/readonly-review` کپی کنید یا `--install-guard` را اجرا کنید؛ با `agy plugin list` آن را بررسی کنید. تا وقتی prompt شامل `AGY_READONLY_REVIEW` نباشد کاری نمی‌کند، بنابراین نشست‌های عادی agy شما تغییری نمی‌کنند. یک skill به نام `readonly-code-review` هم برای استفاده تعاملی در agy دارد.

## 6. اولین اجرا: آن را روی سیستم خودتان بررسی کنید

پس از نصب و بعد از هر به‌روزرسانی agy یک بار اجرا کنید: `/agy-review:verify`، skill مربوط به `verify` در Codex یا `--verify`. این کار در یک پوشه موقت، یک فراخوانی زنده و کوچک agy انجام می‌دهد: خواندن فایل (باید کار کند)، نوشتن فایل، هدایت خروجی به فایل و حذف فایل (همه باید مسدود شوند). خروجی مورد انتظار:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

هر `FAIL` با `NOT VERIFIED` تمام می‌شود و بازبینی‌های Agentمحور غیرفعال می‌مانند: خروجی و نتیجه `agy --version` را در یک issue بفرستید. نتیجه موفق `verify` دقیقاً برای همین محافظ و همین نسخه agy ثبت می‌شود؛ **بازبینی‌های Agentمحور بدون آن شروع نمی‌شوند** و به‌روزرسانی agy یا محافظ آن را باطل می‌کند، پس بعد از به‌روزرسانی دوباره `verify` را اجرا کنید. حالت‌های ایستا به آن نیاز ندارند.

## 7. استفاده

از ریشه repository اجرا کنید.

### 7a. بازبینی: هدف را انتخاب کنید

| چیزی که می‌خواهید بازبینی کنید | روش استفاده | حالت |
|---|---|---|
| کارهای commitنشده | هیچ‌چیز | Agentمحور، فقط خواندنی |
| یک branch / تغییرات stageشده / یک commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | Agentمحور، فقط خواندنی |
| یک فایل یا بازه | `--file src/a.kt` یا `--file src/a.kt:40-80` (قابل تکرار) | ایستا |
| یک تابع یا کلاس | `--symbol parseConfig` (+ `--file` اگر نام مبهم است) | ایستا |
| کدی که فقط در حافظه وجود دارد | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | ایستا |
| هرکدام از این‌ها، همراه با اجازه دیدن فایل‌های دیگر | افزودن `--agentic` | Agentمحور، فقط خواندنی |

*ایستا*: اسکریپت خودش کد را می‌خواند و شماره‌گذاری می‌کند و model هیچ ابزاری ندارد؛ بنابراین چیزی قابل تغییر نیست و model نمی‌تواند درباره فایل‌هایی که ندیده ادعایی بسازد. *Agentمحور*: بازبین خودش repository را از پشت hook محافظ می‌خواند؛ این محافظ هر نوع نوشتن را مسدود می‌کند.

به بازبین کمک کنید: `--context "what this code must do"`، `--focus "concurrency, error handling"` (یا واژه‌های انتهایی)، `--context-lines N`.

خروجی: به‌طور پیش‌فرض Markdown؛ برای ماشین‌ها `--format json`؛ برای فایل `--output file`؛ با `--fail-on high` اگر یافته تأییدشده high یا critical باشد exit 10؛ با `--previous old.json` یافته‌ها به‌صورت جدید، ادامه‌دار، رفع‌شده یا دوباره‌گزارش‌نشده علامت می‌خورند.

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

`--security` (skill با نام `agy-security`، دستور `/agy-review:security`، sub-agent با نام `agy-security`) برای همه هدف‌های بالا کار می‌کند و این موارد را اضافه می‌کند: روش threat model (از ورودی غیرقابل‌اعتماد تا مقصد خطرناک، همراه با کنترل‌های بین راه)، نگاشت OWASP Top 10 (2021) و CWE، مقدار `exploitability` (`demonstrated`، `likely`، `conditional`، `theoretical`)، `attack_scenario`، `data_flow`، اسکنر بدون model برای رازها و حدود 25 دسته الگوی بد، و **کد مرتبط**: هدف چه چیزهایی را فراخوانی می‌کند و چه چیزهایی آن را فراخوانی می‌کنند.

- راز ثابت در کد (کلید خصوصی، AWS، GitHub، Stripe، Slack، Google) **پیش از ارسال هر چیزی به model پوشانده می‌شود** و به‌عنوان یافته الگویی گزارش می‌شود.
- مقدار `cve` در گزارش ادعای model است و همیشه با `cve_verified: false` برچسب می‌خورد: آن را در NVD یا با `osv-scanner` / `npm audit` / `pip-audit` تأیید کنید. ابزار هرگز CVE نمی‌سازد یا تأیید نمی‌کند.
- «Claude کد نوشته، آن و همسایه‌هایش را بازبینی کن»: قانون آماده را از `examples/` در `CLAUDE.md` یا `AGENTS.md` کپی کنید، یا Stop hook یا hook اختیاری pre-commit را نصب کنید. جزئیات و دستورهای زنجیره‌ای: [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. کارها: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

model فقط متنی را دریافت می‌کند که شما می‌فرستید و هیچ ابزاری ندارد. حالت متنی فقط پاسخ را چاپ می‌کند؛ stderr، model و effort را گزارش می‌دهد.

### 7d. ترجمه: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

گزینه‌ها: `--from`، `--variant` (pt-BR، zh-TW، de-CH ...)، `--tone` (formal، neutral، friendly، casual، technical، marketing، literary، legal)، `--audience`، `--glossary` (JSON با `{"repo":"مخزن","API":"="}` یا CSV؛ `=` اصطلاح را نگه می‌دارد)، `--keep a,b`، `--notes`، `--strict`. متن‌های بلند بر اساس خط‌های خالی تقسیم می‌شوند (هرگز داخل code block تقسیم نمی‌شوند) و بخش‌به‌بخش ترجمه می‌شوند. پس از ترجمه، اسکریپت یکسان بودن کدهای محصورشده، کدهای درون‌خطی، URLها، جای‌نگهدارها (`{{x}}`، `${x}`، `%s`)، tagها و headingها را با منبع بررسی می‌کند و هر تفاوت را گزارش می‌دهد (`--strict` تفاوت را به exit 11 تبدیل می‌کند). skillها ابتدا درباره لحن، مخاطب و اصطلاحات از شما می‌پرسند و فقط چیزهایی را می‌پرسند که نتوانند حدس بزنند. بررسی ماشینی نمی‌تواند روان بودن متن را بسنجد؛ برای متن‌های مهم از یک فرد بومی بخواهید آن را بررسی کند.

### 7e. modelها و effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

برای هر اجرا: `--model <id|name>`، `--models a,b`، `--effort auto|low|medium|high|xhigh|max`. ترتیب اولویت: خط فرمان، فایل پروژه، فایل کاربر، پیش‌فرض agy. مقدار `--effort auto` (پیش‌فرض) انتخابی قطعی و توضیح‌داده‌شده است: بازبینی‌ها متناسب با مقدار کد در محدوده‌اند (تمرکز حساس به خطر، مثل امنیت، یک مرحله اضافه می‌کند)، کارها بر اساس متن درخواست (تبدیل مکانیکی low، استدلال سنگین high) و طول ورودی تنظیم می‌شوند؛ `max` هرگز خودکار نیست. **effort همیشه با model هماهنگ می‌شود و هرگز حدس زده نمی‌شود.** هر model برداشت خودش را از `--effort` دارد: model پیش‌فرض agy مقادیر `low | medium | high` را ارائه می‌دهد، modelهایی که effort در نامشان است (`gemini-3.8-flash-high`، `gpt-oss-120b-medium`) اصلاً `--effort` نمی‌پذیرند و modelهای Claude از آن پشتیبانی نمی‌کنند. ابزار از agy می‌پرسد model در کدام دسته است (بررسی رایگانی که حدود چهار ثانیه طول می‌کشد و هیچ فراخوانی modelی شروع نمی‌کند)، پاسخ هر model و نسخه agy را در `~/.agy-review-cache.json` نگه می‌دارد، effort شما را به نزدیک‌ترین مقدار قابل‌قبول model می‌رساند (برای نمونه `xhigh` به `high` تبدیل می‌شود) و گزارش می‌گوید واقعاً چه چیزی استفاده شده است. اگر فهرست agy تغییر کند، خطا خوانده می‌شود، cache اصلاح می‌شود و اجرا یک بار دیگر تکرار می‌شود. `--list-models` گزینه‌های قابل‌قبول هر model را نشان می‌دهد (`--refresh` دوباره می‌پرسد). اگر فیلتر محتوای Gemini یک prompt را رد کند و شما modelی تعیین نکرده باشید، ابزار یک بار با یک model غیر Gemini دوباره تلاش می‌کند و این موضوع را می‌گوید.

### 7f. گزینه‌ها و exit codeها

`bun agy-review.mjs --help` همه‌چیز را فهرست می‌کند. exit codeها: `0` موفق · `1` خطا، پایان مهلت یا پاسخ تجزیه‌ناپذیر · `2` خطای استفاده یا پیش‌نیاز گمشده · `3` درخت کاری هنگام بازبینی Agentمحور تغییر کرده · `4` نامشخص یا ناقص (**به‌معنای قبولی نیست**) · `10` دروازه `--fail-on` شکست خورده (گزارش معتبر است) · `11` بررسی ترجمه با `--strict` شکست خورده است. اگر چند مورد صدق کند، `3` بر `10` و `10` بر `4` اولویت دارد؛ در همه حالت‌ها به‌جز `1` و `2` گزارش نوشته می‌شود، پس `verdict` و `incomplete` را در آن بخوانید. درخت کاری تمیز خطا نیست: ابزار «No changes to review» را چاپ می‌کند و بدون فراخوانی model با exit 0 خارج می‌شود.

### 7g. graphify روی Antigravity: صفر token از Agent برای به‌روزرسانی گراف

**اگر از [graphify](https://github.com/Graphify-Labs/graphify) استفاده می‌کنید، این بزرگ‌ترین صرفه‌جویی کل پروژه است.** graphify یک repository و مستنداتش را به گراف دانش تبدیل می‌کند. بیشتر کارش کد قطعی است (tree-sitter، خوشه‌بندی، گزارش، cache، merge) و هزینه‌ای ندارد. دو مرحله به model زبانی نیاز دارند: **استخراج معنایی مستندات و مقاله‌ها** و **نام‌گذاری جامعه‌ها**. اگر backend را ثابت نکنید، graphify خودش یکی را انتخاب می‌کند و داخل یک Agent کدنویسی، همان Agent کدنویسی (یا اشتراک آن) خواهد بود. بنابراین هر تازه‌سازی گراف که به سندی دست بزند با tokenهای Opus، Fable یا Codex شما پرداخت می‌شود.

**`--graphify` دقیقاً همین دو مرحله را به Antigravity منتقل می‌کند و به بقیه کاری ندارد.** اسکریپت یک سرور محلی کوچک روی `127.0.0.1` راه می‌اندازد که با پروتکل سازگار با OpenAI صحبت می‌کند و با `agy` پاسخ می‌دهد؛ سپس **همه مرحله‌های LLM در graphify را به آن متصل می‌کند** تا graphify هرگز نتواند به Agent کدنویسی شما یا API key پولی برگردد. به Ollama یا هیچ کلیدی نیاز ندارید. (graphify در تنظیماتش این جایگاه را «ollama» می‌نامد؛ فقط یعنی «هر سرور محلی سازگار با OpenAI».)

```text
git commit / merge / checkout / rebase
   -> hook returns at once and starts the update in the background
      -> graphify extract: code is parsed locally, only changed docs go to the model
      -> the model is Antigravity (agy), reached through the local server
      -> graphify cluster-only: communities are named by Antigravity, report refreshed
   -> Claude / Codex tokens used: 0.  API keys needed: 0.
```

**چرا به اجازه نوشتن یا exec نیازی نیست.** ممکن است انتظار داشته باشید این کار به Python و نوشتن فایل نیاز داشته باشد، اما model فقط باید متن بخواند و متن پاسخ دهد. خود graphify در `graphify-out/` می‌نویسد؛ این ابزار hookها، یک فایل قفل و یک گزارش را می‌نویسد. model پشت سرور هیچ ابزار، فایل یا شبکه‌ای ندارد و prompt injection پنهان در سند نمی‌تواند وادارش کند کاری انجام دهد. رازهای شناخته‌شده در مستندات پیش از ارسال پوشانده می‌شوند. به این شکل وعده فقط‌خواندنی بودن باقی پروژه حفظ می‌شود.

برای هر repository یک بار راه‌اندازی کنید:

```bash
bun agy-review.mjs --graphify doctor              # graphify, agy, and graphify's own Python must be able to import openai
bun agy-review.mjs --graphify setup --yes         # installs the git hooks; --yes lets it add the openai package to graphify's environment
bun agy-review.mjs --graphify update --full       # only if there is no graph yet: the first build reads every doc, so it takes a while
bun agy-review.mjs --graphify status              # hooks, last update, tokens used on Antigravity
```

در Claude Code یا Codex فقط بخواهید: «به‌روزرسانی‌های graphify را روی Antigravity راه‌اندازی کن» (skill با نام `agy-graphify` / `graphify`، دستور `/agy-review:graphify`). skill پیش از افزودن پکیج به محیط graphify از شما اجازه می‌گیرد.

کاری که برایتان انجام می‌دهد:

- **Hookها:** `post-commit`، `post-merge`، `post-checkout` (فقط تغییر branch) و `post-rewrite` (amend، rebase) به‌روزرسانی را **جدا از پردازش اصلی** اجرا می‌کنند، پس دستور git در کسری از ثانیه برمی‌گردد. محتوای قبلی فایل‌های hook حفظ می‌شود. به‌طور پیش‌فرض **hookهای خود graphify جایگزین می‌شوند** (آن‌ها فقط کد را بازسازی می‌کنند و hookهای ما همان کار و بیشتر را انجام می‌دهند؛ دو نویسنده روی یک گراف با هم تداخل می‌کنند). `--keep-graphify-hook` هر دو را نگه می‌دارد؛ `--graphify hook-uninstall --restore-graphify` hookهای خود graphify را برمی‌گرداند. یک کپی از این ابزار در `~/.agy-review/runtime` باعث می‌شود hookها پس از به‌روزرسانی plugin هم باقی بمانند. برای یک بار رد کردن، از `AGY_GRAPHIFY_SKIP=1 git commit ...` استفاده کنید.
- **افزایشی:** cache خود graphify تغییرات را تشخیص می‌دهد؛ سندهای بدون تغییر هرگز برای model فرستاده نمی‌شوند. دو commit پشت سر هم باعث اجرای هم‌زمان دو به‌روزرسانی نمی‌شوند؛ دومی یک دور دیگر درخواست می‌کند.
- **Agent شما دیگر token برایش مصرف نمی‌کند:** اگر `CLAUDE.md` یا `AGENTS.md` بخشی درباره graphify دارد که به Agent می‌گوید گراف را بازسازی کند، `--graphify rules --write-rules` یک قانون کوتاه اضافه می‌کند تا این کار را نکند (متن خودتان هرگز ویرایش نمی‌شود و اگر فایل‌ها وجود نداشته باشند چیزی ساخته نمی‌شود).
- **به‌طور پیش‌فرض ارزان:** effort برابر `low` است، چون استخراج کاری ساختاریافته است. در یک آزمون، `low` برای همان سند حدود 40 برابر token خروجی کمتری از `high` مصرف کرد (685 در برابر 29,996) و به‌جای 207 ثانیه در 15 ثانیه تمام شد. با `--set graphifyEffort=...` تغییرش دهید، model را با `--set graphifyModel=<id>` انتخاب کنید (`--list-models` را ببینید)، برای فراخوانی‌های موازی از `--set graphifyConcurrency=N` استفاده کنید و برای رد کردن نام‌گذاری جامعه‌ها `--set graphifyLabels=false` را به کار ببرید.

محدودیت‌های صادقانه: به‌روزرسانی‌ها از **quota مربوط به Antigravity شما** استفاده می‌کنند (هدف همین است: model ارزان به‌جای model گران، نه «رایگان»). **تصویرها در این مسیر استخراج نمی‌شوند** (graphify برای این backend از آن‌ها می‌گذرد و agy از این مسیر نمی‌تواند آن‌ها را ببیند). کد به‌صورت محلی تجزیه می‌شود؛ مستندات و مقاله‌ها متن‌هایی هستند که برای model متعلق به Google فرستاده می‌شوند. کیفیت استخراج مستندات به model انتخابی شما بستگی دارد. graphify باید نصب باشد (`uv tool install graphifyy`) و Python خودش به پکیج `openai` نیاز دارد: `--graphify setup --yes` آن را با `uv tool install --force "graphifyy[openai]"` اضافه می‌کند (یا `pipx inject graphifyy openai`). جزئیات، تنظیمات و رفع اشکال: [docs/GRAPHIFY.md](GRAPHIFY.md).

## 8. استفاده از داخل Agentها، sub-agentها و حلقه‌ها

هر skill یک فراخوانی ساده CLI با JSON پایدار است، پس هر Agent می‌تواند از آن استفاده کند: sub-agent با نام `agy-reviewer`، `agy-security` یا `agy-worker` را در Claude Code اجرا کنید، skillها را در Codex فراخوانی کنید یا اسکریپت را از هر چارچوبی اجرا کنید.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

هرگز به بازبین گفته نمی‌شود چه چیزی را تغییر داده‌اید، بنابراین هر دور مستقل می‌ماند. قرارداد کامل، فیلدهای JSON، دستورهای حلقه و الگوهای fan-out: [docs/AGENTS.md](AGENTS.md).

## 9. model امنیتی

**بازبینی‌های ایستا، بازبینی امنیتی نماد/فایل/قطعه‌کد، کارها و ترجمه‌ها**، agy را بدون هیچ flag مجوز و بدون ابزار در یک پوشه موقت خالی اجرا می‌کنند: agy نمی‌تواند فایل‌های شما را بخواند یا بنویسد؛ تنها داده‌ای که خارج می‌شود چیزی است که اسکریپت در prompt گذاشته است (با پوشاندن رازهای شناخته‌شده).

**بازبینی‌های Agentمحور** (هدف‌های git یا `--agentic`) برای جلوگیری از انتظار برای prompt، agy را با `--dangerously-skip-permissions` اجرا می‌کنند و به یک hook محافظ `PreToolUse` (`guard.mjs`) متکی‌اند که هر فراخوانی ابزار را بررسی می‌کند و **به‌طور پیش‌فرض رد می‌کند**:

- مجاز: ابزارهای دیدن و جست‌وجوی فایل؛ دستورهای shell، تکی یا زنجیره‌ای، که فقط از زیر‌دستورهای فقط‌خواندنی `git`، `rg`، `grep`، `cat`، `ls`، `head`، `tail`، `wc`، `find` (بدون `-delete`/`-exec`)، دستورهای PowerShell مانند `Get-*`، `Select-String` و چند مورد دیگر ساخته شده‌اند (فهرست در `guard.mjs` است)؛
- غیرمجاز: هر ابزار نوشتن/ویرایش/notebook/تصویر/زمان‌بندی/sub-agent/مرورگر/web/MCP و هر ابزار ناشناخته؛ تغییر مسیر خروجی، `$(...)`، backtickها، script blockها، ساختارهای شبیه `eval`؛ دستورهای `git commit/push/checkout/reset/...`؛ مفسرها و package managerها؛ `curl`، `ssh`؛ خواندن محل اطلاعات ورود (`.ssh`، `.aws`، `.gnupg`، کلیدهای خصوصی)؛
- اگر محافظ crash کند، درخواست را رد می‌کند؛ اسکریپت بازبینی Agentمحور را شروع نمی‌کند مگر اینکه محافظ نصب باشد، با نسخه همراه ابزار یکسان باشد و **نتیجه موفق `--verify` برای همین محافظ و همین نسخه agy ثبت شده باشد**؛ پیش و پس از اجرا، از `git status`، diffهای tracked و staged و محتوای همه فایل‌های untracked اثرانگشت می‌گیرد و اگر چیزی فرق کند با exit 3 و هشدار خارج می‌شود.
- **رازها در حالت Agentمحور را نمی‌توان پیش از خوانده شدن فایل‌ها توسط بازبین پوشاند.** ابزار آن‌ها را تشخیص می‌دهد، هشدار می‌دهد و در `limitations` فهرست می‌کند؛ آن‌ها را عوض کنید یا با `--file` / `--symbol` بازبینی کنید تا ابتدا پوشانده شوند.

**به‌روزرسانی‌های graphify** (`--graphify`) هیچ ابزاری به model نمی‌دهند: model متن را از سروری دریافت می‌کند که فقط روی `127.0.0.1` گوش می‌دهد، به یک bearer key تصادفی نیاز دارد که فقط تا پایان همان به‌روزرسانی وجود دارد، headerهای خارجی `Host` را رد می‌کند و `agy` را در یک پوشه موقت خالی و بدون هیچ flag مجوز اجرا می‌کند. چیزهایی که روی دیسک نوشته می‌شوند توسط graphify (`graphify-out/`) و این ابزار (hookهای git، `~/.agy-review/runtime`، یک قفل و یک گزارش) نوشته می‌شوند. hookها در هر commit کد اجرا می‌کنند: این همان اعتمادی است که از قبل به hookهای خود graphify دارید و `--graphify hook-uninstall` آن‌ها را حذف می‌کند.

چیزهایی که این ابزار نیست:

- **sandbox سیستم‌عامل نیست.** محافظ نام ابزار و متن دستور را فیلتر می‌کند؛ sandbox خود agy همه‌جا در دسترس نیست. یک prompt injection عمدی در کد در حال بازبینی می‌تواند دنبال شکل دستوری بگردد که فیلتر می‌پذیرد. بررسی پیش/پس، فایل‌های tracked تغییریافته و فایل‌های جدید را پیدا می‌کند، نه خواندن‌ها را.
- **کد شما برای model متعلق به Google فرستاده می‌شود**؛ خواندن به‌جز مسیرهای اطلاعات ورود محدودیتی ندارد. فایل‌های `.env` داخل repository برای بازبینی‌های Agentمحور قابل‌خواندن‌اند. کدی را که اجازه اشتراک‌گذاری‌اش را ندارید بازبینی نکنید.
- git می‌تواند برنامه‌های خارجی diff یا textconv را که در repository پیکربندی شده‌اند اجرا کند: فقط repositoryهای مورد اعتماد را بازبینی کنید.
- یافته‌ها ممکن است اشتباه یا ناقص باشند و «بدون یافته» هرگز به‌معنای «امن» نیست.

## 10. رفع اشکال

| نشانه | علت و راه‌حل |
|---|---|
| `Missing: agy CLI` | Antigravity CLI را نصب کنید و `agy` را یک بار اجرا کنید تا وارد حساب شوید؛ `agy --version` باید در همان shellی کار کند که plugin را اجرا می‌کند |
| `Missing: read-only guard - missing/outdated` | راه‌اندازی را اجرا کنید (`/agy-review:setup`، skill مربوط به `setup` در Codex یا `--install-guard`)؛ فقط بازبینی‌های Agentمحور به آن نیاز دارند |
| `Not inside a git repository` (exit 2) | با `cd` به ریشه repository بروید یا کد را با `--file` / `--symbol` / `--stdin` بازبینی کنید |
| نتیجه `inconclusive`، exit 4 | قبولی نیست: یافته‌ها رد شده‌اند، modelها اختلاف داشته‌اند یا کد را پوشش نداده‌اند، یا یک model شکست خورده است. محدوده را کوچک‌تر کنید، `--context` اضافه کنید یا `--model` دیگری را امتحان کنید |
| `blocked by Gemini's filters` | فیلتر ایمنی Gemini درخواست را رد کرده است (برای promptهای امنیتی رایج است). بدون `--model` ابزار با یک model غیر Gemini دوباره تلاش می‌کند؛ در غیر این صورت با `--model` یکی را انتخاب کنید |
| `invalid model selection ... has no "xhigh" effort (available: low, medium, high)` یا `conflicts with --effort` یا `--effort is not supported` | در 1.0.1 رفع شده است: effort به‌طور خودکار با model هماهنگ می‌شود و گزارش می‌گوید چه چیزی استفاده شده است. اگر هنوز می‌بینید، `--list-models --refresh` را اجرا کنید، plugin را به‌روز کنید (بخش 12) و گزارش دهید |
| graphify: `openai package ... missing` | Python خود graphify پکیج `openai` را ندارد. `--graphify setup --yes` را اجرا کنید یا از `uv tool install --force "graphifyy[openai]"` استفاده کنید (pipx: `pipx inject graphifyy openai`) |
| graphify: گراف پس از commit به‌روز نشد | `--graphify status`، hookها و آخرین نتیجه را نشان می‌دهد؛ `graphify-out/.agy-update.log` را بخوانید؛ یک بار `--graphify update --debug` را در پیش‌زمینه اجرا کنید (هر درخواست و پاسخ را در `graphify-out/.agy-debug/` نگه می‌دارد که شامل مستندات شماست). نبودن گراف یعنی hook کاری نمی‌کند: یک بار با `--graphify update --full` آن را بسازید |
| graphify: پیام `agy returned no answer` برای یک بخش | graphify آن بخش را در به‌روزرسانی بعدی دوباره امتحان می‌کند. ورود و quota را با `agy -p "say hi"` بررسی کنید یا با `--set graphifyModel=<id>` model دیگری انتخاب کنید |
| graphify هشدار می‌دهد نسخه‌های skill و پکیج متفاوت‌اند | برای این ابزار بی‌ضرر است؛ graphify را با `uv tool upgrade graphifyy` ارتقا دهید |
| بازبینی خالی، exit 1 | ورود و quota را با `agy -p "say hi"` بررسی کنید؛ برای هدف‌های بزرگ `--timeout` را بیشتر کنید |
| Exit 3 / درخت کاری تغییر کرده است | چیزی هنگام بازبینی Agentمحور فایل‌های شما را تغییر داده است (ویرایشگر، build یا دور زدن محافظ). `git status` و `git diff` را بررسی کنید؛ اگر شما تغییرشان نداده‌اید، آن را یک رخداد امنیتی در نظر بگیرید |
| یافته‌های ردشده زیاد | model کدی را نقل کرده که وجود ندارد. گاهی طبیعی است؛ آن‌ها هرگز شمرده نمی‌شوند. از `--model` قوی‌تر یا محدوده کوچک‌تر استفاده کنید |
| `--symbol`: پیام «defined in several places» یا «not found» | `--file` را بدهید یا از `--file path:A-B` استفاده کنید. پیدا‌کننده ابتکاری است (تطبیق brace/indent)، نه parser |
| Codex: پیام «blocked by sandbox» | بخش 5b را ببینید: شبکه، نوشتن در `~/.gemini/antigravity-cli` و یک سوکت localhost باید مجاز باشند |
| Windows: `agy` یا `bun` داخل Claude/Codex پیدا نمی‌شود | shell ابزار `PATH` متفاوتی دارد؛ آن را از shellی اجرا کنید که دستور در آن کار می‌کند |
| `verify` مقدار FAIL چاپ می‌کند | برای کد مهم از بازبینی Agentمحور استفاده نکنید؛ خروجی و نتیجه `agy --version` را در یک issue بفرستید |

## 11. پرسش‌های رایج

**آیا کدم را تغییر می‌دهد؟** نه. حالت‌های ایستا نمی‌توانند؛ حالت Agentمحور نوشتن را مسدود می‌کند و اگر درخت کاری بعداً فرق داشته باشد هشدار می‌دهد. هرگز commit، stash یا checkout انجام نمی‌دهد.

**آیا Bun اینجا از Node سریع‌تر است؟** تفاوت قابل‌اندازه‌گیری نیست. روی سیستم Windows نویسنده، شروع با Node حدود 56 ms و با Bun حدود 64 ms بود و hook محافظ حدود 60 ms در برابر 57 ms؛ یک بازبینی ده‌ها ثانیه طول می‌کشد و این زمان صرف model می‌شود. Bun پیش‌فرض مستندات است؛ Node 18.18+ همان‌طور کار می‌کند. هر دو با یک کد پوشش داده شده‌اند.

**هزینه دارد؟** plugin رایگان است. هر بازبینی، کار، ترجمه و به‌روزرسانی graphify از quota مربوط به Antigravity شما استفاده می‌کند.

**برای graphify به Ollama یا API key نیاز دارم؟** نه. graphify یک جایگاه backend با نام «ollama» دارد که یعنی «هر سرور محلی سازگار با OpenAI»؛ پشت آن سرور کوچک Antigravity همین ابزار است. تنها چیزی که باید نصب کنید پکیج Python با نام `openai` برای graphify است که `--graphify setup --yes` آن را اضافه می‌کند.

**آیا graphify همچنان tokenهای Claude یا Codex من را مصرف می‌کند؟** فقط اگر خودتان یا Agent شما `/graphify --update`، `graphify extract` یا مشابه آن را اجرا کنید، یا بخشی در `CLAUDE.md` / `AGENTS.md` به Agent بگوید گراف را بازسازی کند. با `--graphify rules --write-rules` قانونی اضافه کنید که جلوی آن را بگیرد.

**Antigravity کدام فایل‌ها را می‌بیند؟** حالت‌های ایستا: فقط کدی که اسکریپت می‌فرستد (همراه با مقدار محدودی کد مرتبط برای `--security`). حالت‌های Agentمحور: هر چیزی که در repository بخواند و هر جای دیسک به‌جز مسیرهای اطلاعات ورود.

**می‌تواند یافته‌ها را رفع کند؟** هرگز. Agent دیگری یا خودتان آن‌ها را رفع می‌کنید؛ بازبین فقط بازبینی می‌کند تا مستقل بماند.

**می‌تواند یک pull request در GitHub را بازبینی کند؟** branch را به‌صورت محلی checkout کنید و از `--base` استفاده کنید. دسترسی GitHub API وجود ندارد.

**چرا دستورها را در تنظیمات agy مجاز نکنیم؟** آزمایش نشان داد در حالت headless، agy مجوزهای چندواژه‌ای را دقیق تطبیق می‌دهد (`git status` بله، `git status --short` نه) و «allow» از یک hook بررسی مجوز را بی‌اثر نمی‌کند. hook فقط می‌تواند با اطمینان رد کند؛ به همین دلیل حالت Agentمحور از skip-permissions همراه با hook پیش‌فرض‌رد استفاده می‌کند و حالت ایستا اصلاً ابزاری ندارد.

**می‌توانم دستورهای مجاز یا قوانین اسکنر را اضافه کنم؟** `CMDS` / `GIT_OK` را در `guard.mjs` یا `RULES` را در `lib/security.mjs` ویرایش کنید، `npm test` را اجرا کنید، سپس `--install-guard` را اجرا کنید.

## 12. به‌روزرسانی، حذف و توسعه

### روش به‌روزرسانی به نسخه جدید

release جدید خودبه‌خود به دست شما نمی‌رسد: خودتان آگاهانه به‌روزرسانی می‌کنید. چهار مرحله دارد.

**1. نسخه فعلی و وجود نسخه جدیدتر را بررسی کنید**

```bash
bun agy-review.mjs --version          # for example: agy-review 1.0.1 (bun 1.3.14)
bun agy-review.mjs --update-check     # asks GitHub; prints the exact commands below if a newer version exists
```

همچنین می‌توانید فهرست releaseها را در https://github.com/Ealireza/agy-review/releases و [changelog](../CHANGELOG.md) بخوانید.

**2. plugin را برای میزبان مورد استفاده به‌روز کنید**

| میزبان | دستورها (در ترمینال عادی اجرا کنید) | سپس |
|---|---|---|
| Claude Code | `claude plugin marketplace update agy-review` و سپس `claude plugin update agy-review@agy-review` | Claude Code را دوباره راه‌اندازی کنید |
| Codex | `codex plugin marketplace upgrade agy-review` و سپس `codex plugin remove agy-review@agy-review` و `codex plugin add agy-review@agy-review` | Codex را دوباره راه‌اندازی کنید |
| کپی ساده | `git pull` در کپی خودتان | هیچ‌چیز |

**3. بخش‌هایی را که بیرون از پوشه plugin هستند تازه کنید**

```bash
bun agy-review.mjs --install-guard         # the Antigravity guard hook is copied to ~/.gemini/config/plugins; this replaces it with the new one
bun agy-review.mjs --verify                # a guard or agy change invalidates the last check, and agentic reviews stay off until this passes
bun agy-review.mjs --graphify setup        # only if you use graphify: refreshes the hooks and the runtime copy in ~/.agy-review/runtime
```

**4. از موفقیت کار مطمئن شوید:** `--version` شماره جدید را نشان می‌دهد، `--check` برای همه‌چیز OK می‌گوید و `--list-models --refresh` دوباره می‌خواند هر model چه مقادیری را برای `--effort` می‌پذیرد.

اگر پس از به‌روزرسانی چیزی خراب شد: `--check` را اجرا کنید، جدول رفع اشکال (بخش 10) را بخوانید و اگر به نسخه قبلی نیاز دارید، plugin را حذف کنید و release مشخصی را با `git clone --branch v1.0.0 https://github.com/Ealireza/agy-review` نصب کنید. تنظیمات شما (`.agy-review.json`) فایل‌های ساده‌ای هستند که به‌روزرسانی هرگز به آن‌ها دست نمی‌زند.

### حذف

```text
claude plugin uninstall agy-review@agy-review   # Claude Code
codex plugin remove agy-review@agy-review       # Codex
bun agy-review.mjs --uninstall-guard            # removes the guard from ~/.gemini/config/plugins
bun agy-review.mjs --graphify hook-uninstall --restore-graphify   # removes our git hooks and puts graphify's own back
```

اگر می‌خواهید چیزی باقی نماند، `~/.agy-review` (کپی runtime) و `~/.agy-review-cache.json` (cache مربوط به effort) را حذف کنید.

### توسعه

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

issueها و pull requestها خوش‌آمدند، به‌ویژه: نتیجه‌های `verify` روی macOS و Linux، تنظیمات sandbox مربوط به Codex که کار می‌کنند، راه‌های دور زدن محافظ (اگر می‌توانید ابتدا خصوصی گزارش کنید) و قوانین جدید اسکنر. برای ترجمه: `README.md` را در `docs/README.<code>.md` کپی کنید، ترجمه کنید و زبان را در خط انتخاب زبان همه فایل‌ها اضافه کنید.

## مجوز

MIT، فایل [LICENSE](../LICENSE) را ببینید.
