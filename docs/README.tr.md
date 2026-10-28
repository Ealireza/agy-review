# agy-review

**Çalışmasını kanıtlamak zorunda olan bağımsız bir inceleyici.** Google Antigravity (`agy`) ile kod incelemesi, güvenlik incelemesi, görev devri ve çeviri; Claude Code, Codex veya herhangi bir terminalden. Salt okunur, izin istemi yok ve her bulgu siz görmeden önce gerçek kodunuzla doğrulanır.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · **Türkçe** · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

Web sitesi: https://ealireza.github.io/agy-review/ · Ayrıntılı belgeler (İngilizce): ajanlar ve döngüler için [AGENTS.md](AGENTS.md), güvenlik yöntemi için [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

---

## İçindekiler

1. Neler sunuyor
2. Rapora neden güvenebilirsiniz
3. Durum: nelerin doğrulandığı ve nelerin doğrulanmadığı
4. Gereksinimler
5. Kurulum
6. İlk çalıştırma: kendi makinenizde doğrulayın
7. Kullanım: inceleme, güvenlik, görevler, çeviri, modeller
8. Ajanlardan, alt ajanlardan ve döngülerden kullanım
9. Güvenlik modeli
10. Sorun giderme
11. SSS
12. Güncelleme, kaldırma, geliştirme

---

## 1. Neler sunuyor

| Skill (Claude Code / Codex) | Komut (Claude Code) | Ne yapar |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | git değişikliklerinin, bir dalın, bir dosyanın, bir satır aralığının, tek bir fonksiyonun veya bir kod parçasının dereceli incelemesi |
| `agy-security` / `security` | `/agy-review:security` | güvenlik incelemesi: OWASP/CWE, istismar edilebilirlik, saldırı senaryosu, sır ve kötü örüntü tarayıcısı, bağlam olarak çağıranlar ve çağrılanlar |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | kendi içinde tamamlanabilen herhangi bir görevi (yeniden yazma, özetleme, taslak hazırlama, bilgi çıkarma) Antigravity'ye devredin ve sonucu geri alın |
| `agy-translate` / `translate` | `/agy-review:translate` | ton, hedef kitle ve sözlükle çeviri; kodun, URL'lerin, yer tutucuların ve yapının korunduğunu doğrular |
| `agy-models` / `models` | `/agy-review:models` | agy'nizdeki modelleri listeler, birini seçmenizi, proje veya genel olarak kaydetmenizi ve çaba düzeyini ayarlamanızı sağlar |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | önkoşulları denetler, salt okunur koruyucuyu kurar, makinenizde yazmaların engellendiğini kanıtlar |

Claude Code için alt ajanlar: `agy-reviewer`, `agy-security`, `agy-worker`. Her şey tek bir depo ve tek bir betikten oluşur (`plugins/agy-review/scripts/agy-review.mjs`). Sunucu yoktur ve kendi Antigravity oturumunuz dışında hesap gerekmez.

## 2. Rapora neden güvenebilirsiniz

Kodu inceleyen bir dil modeli bazen olmayan bir sorun uydurur. Bu araç, hiçbir konuda modelin sözüne güvenmez.

1. İnceleyici, katı bir JSON raporu döndürmek zorundadır (`--json-schema` ile zorunlu kılınır). Her bulgu, ilgili olduğu **tam kodu** taşır.
2. Betik, bu alıntıyı gerçek dosyada arar. **Bulunamazsa bulgu reddedilir** ve ayrıca listelenir. **Başka bir satırda bulunursa satır numarası düzeltilir.** Bir şeyi kanıtlamak için fazla kısa veya genel olan alıntılar (`return null;`, `}`) reddedilir. Belirtilen satırdan uzakta birden çok yerle eşleşen alıntı, belirsiz sayılarak reddedilir.
3. Karar, sayılar ve CI geçidi yalnızca doğrulanmış bulgulardan **betik tarafından hesaplanır**; modelden asla kopyalanmaz.
4. Hiçbir şeyin doğrulanmamış olması bir onay **değildir**: bulgular reddedildiyse, model aynı fikirde değilse, kodu kapsamadıysa veya birden çok modelden biri başarısız olduysa karar `inconclusive` olur ve çıkış kodu 4'tür.
5. İstenen satırların dışındaki bulgular etiketlenir ve geçidi asla etkilemez. Düşük güvenli bulgular listelenir ama sayılmaz.
6. Önem (etki) ile öncelik (ne zaman düzeltileceği) ayrıdır ve tutarlı tutulur: critical her zaman P0, nit her zaman P3'tür; stil bulguları hiçbir zaman low düzeyinin üzerine çıkmaz.

Yine de mümkün olan şey: doğru alıntı, yanlış sonuç. Alıntı kodun var olduğunu kanıtlar, akıl yürütmenin doğru olduğunu değil; bu yüzden her bulgunun somut bir senaryosu vardır ve harekete geçmeden önce alıntılanan satırları okumalısınız.

Gerçek örnek: bu araç, iki kasıtlı hata içeren küçük bir dosyada (agy üzerinden Claude Sonnet 4.6): doğru satırlarda 4 doğrulanmış bulgu, CWE-89, CWE-78, CWE-22 ve CWE-369 ile, kapsama %100, bir yinelenen bulgu elendi ve tarayıcı aynı iki satırı bağımsız olarak işaretledi.

## 3. Durum: nelerin doğrulandığı ve nelerin doğrulanmadığı

| Denetim | Sonuç |
|---|---|
| Birim ve işlem hattı testleri (`npm test`): dayanak doğrulama, kapsam, karar, yinelenenleri eleme, sembol bulucu, hedefler, yapılandırma, modeller, görevler, çeviri, güvenlik, sır maskeleme | 50 test, tümü geçiyor, sahte bir `agy` ile (ajan tabanlı işlem hattı, ağaç değişikliği algılama, başarısız bir model ve `verify` geçidi dahil) |
| Koruyucu hook (izin verilen ve reddedilen komutlar, araçlar, alıntı hileleri, kimlik bilgisi yolları) | otomatik testler, geçiyor |
| Claude Code manifestleri (`claude plugin validate`), Antigravity eklentisi (`agy plugin validate --strict`) | geçiyor |
| Codex 0.163.0: marketplace ekleme, eklenti kurulumu, skill'lerin keşfi | Windows 11'de denetlendi |
| Gerçek agy 1.4.8'e (Gemini 3.8 Flash ve Claude Sonnet 4.6) karşı statik inceleme, güvenlik incelemesi ve görevler, Bun 1.3.14 ile çalıştırıldı | Windows 11'de denetlendi; bulgular doğru satırlara dayandırıldı |
| Tasarım ve kodun iki bağımsız incelemesi (Opus: 25 bulgu; Codex: 28 bulgu), doğrulananlar birer regresyon testiyle düzeltildi | tamamlandı, bkz. değişiklik günlüğü |
| **Ajan tabanlı incelemeler (`agy --dangerously-skip-permissions` ve gerçek yazmaları engelleyen koruyucu)** | **yazar tarafından çalıştırılmadı** |

Son satır güvenlik açısından önemlidir ve agy sürümünüze bağlıdır; bu yüzden kurulumdan sonra ve her agy güncellemesinden sonra bir kez `verify` çalıştırın (bölüm 6). Statik incelemeler, bir sembolün/dosyanın/kod parçasının güvenlik incelemeleri, görevler ve çeviriler bu bayrağı hiç kullanmaz ve hiçbir şey yazamaz.

agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14 ve Node 24 ile, Windows 11'de test edildi. macOS ve Linux'ta çalışması beklenir (agy tüm platformlarda `~/.gemini/config/plugins` kullanır) ancak test edilmemiştir.

## 4. Gereksinimler

Başka hiçbir şey gerekmez: başka eklenti yok, başka CLI aracı yok.

| Gerekli | Neden | Nasıl edinilir | Nasıl denetlenir |
|---|---|---|---|
| Antigravity CLI `agy` | işi yapar | https://antigravity.google/cli, ardından `agy` komutunu bir kez çalıştırıp oturum açın | `agy --version` |
| Bun (önerilir) **veya** Node.js 18.18+ | betiği ve koruyucu hook'u çalıştırır | https://bun.sh veya https://nodejs.org | `bun --version` / `node --version` |
| git | git hedefleri ve ilgili kodu bulma | https://git-scm.com | `git --version` |
| Claude Code **veya** Codex **veya** herhangi bir terminal | isteği ilettiğiniz yer | kurulum kılavuzları | `claude --version` / `codex --version` |

Bun, tüm yönergelerde ve koruyucu hook'ta varsayılandır (`bun guard.mjs || node guard.mjs`); Node aynı şekilde çalışır. Antigravity kullanımı kendi kotanızdan düşer. Bir inceleme saniyelerden birkaç dakikaya kadar sürebilir.

## 5. Kurulum

Kullandığınız ortamı seçin; birden fazlası aynı betiği ve koruyucuyu paylaşabilir.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup`, agy'yi, git'i ve koruyucuyu denetler ve koruyucuyu `~/.gemini/config/plugins/readonly-review` içine kurar. `/agy-review:verify` canlı güvenlik kanıtıdır.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Codex'i yeniden başlatın, ardından düz bir dille isteyin: "Check my Antigravity review setup", "Review my changes with Antigravity", "Security-review the function saveUpload", "Translate README.md to German, friendly tone".

1. **Koruyucuyu normal bir terminalden bir kez kurun** (`~/.gemini/config/plugins` içine yazar): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.0/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.0\scripts\agy-review.mjs`). Koruyucuya yalnızca ajan tabanlı git incelemelerinin ihtiyacı vardır.
2. **Codex'in sanal alanı agy'nin çalışmasına izin vermelidir:** giden ağ erişimi, `~/.gemini/antigravity-cli` dizinine yazma erişimi ve bir localhost soketi. `workspace-write` ile büyük olasılıkla `~/.codex/config.toml` içinde şunlara ihtiyacınız olacak:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   Hâlâ engellenen bir şey varsa skill eksik erişimi belirtir ve durur; izinleri asla kendiliğinden genişletmez. agy'nin Codex sanal alanınızda doğru çalışıp çalışmadığı, yazarın test edemediği Codex kurulum kısmıdır; bu yüzden `verify` komutunu Codex içinden de çalıştırın.

### 5c. Düz terminal

```bash
git clone https://github.com/Ealireza/agy-review
cd agy-review
bun plugins/agy-review/scripts/agy-review.mjs --check
bun plugins/agy-review/scripts/agy-review.mjs --install-guard
bun plugins/agy-review/scripts/agy-review.mjs --verify
# then, from inside any git repository (use node instead of bun if you prefer):
bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs --security --symbol saveUpload
```

İpucu: `alias agyr='bun /full/path/to/agy-review/plugins/agy-review/scripts/agy-review.mjs'`.

### 5d. Yalnızca Antigravity tarafı

Koruyucu sıradan bir Antigravity eklentisidir. `plugins/agy-review/antigravity-plugin/readonly-review` dizinini `~/.gemini/config/plugins/readonly-review` konumuna kopyalayın veya `--install-guard` çalıştırın; `agy plugin list` ile denetleyin. Bir istem `AGY_READONLY_REVIEW` içermedikçe hiçbir şey yapmaz, dolayısıyla normal agy oturumlarınız değişmez. Ayrıca etkileşimli agy için bir `readonly-code-review` skill'i de içerir.

## 6. İlk çalıştırma: kendi makinenizde doğrulayın

Kurulumdan sonra ve her agy güncellemesinden sonra bir kez çalıştırın: `/agy-review:verify`, Codex `verify` skill'i veya `--verify`. Geçici bir klasörde küçük bir canlı agy çağrısı yapar: bir dosyayı okur (çalışmalı), bir dosyaya yazar, bir dosyaya yönlendirme yapar ve bir dosyayı siler (hepsi engellenmeli). Beklenen çıktı:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

Herhangi bir `FAIL`, `NOT VERIFIED` ile biter ve ajan tabanlı incelemeler devre dışı kalır: çıktıyla ve `agy --version` sonucunuzla bir issue açın. Geçen bir `verify`, tam olarak bu koruyucu ve bu agy sürümü için kaydedilir; **ajan tabanlı incelemeler onsuz başlamayı reddeder**, agy veya koruyucu güncellemesi onu geçersiz kılar, bu yüzden güncellemelerden sonra `verify` komutunu yeniden çalıştırın. Statik modlar buna ihtiyaç duymaz.

## 7. Kullanım

Deponun kök dizininden çalıştırın.

### 7a. İnceleme: hedefi seçin

| İncelemek istediğiniz | Kullanım | Mod |
|---|---|---|
| kaydedilmemiş (commit edilmemiş) çalışma | hiçbir şey | ajan tabanlı, salt okunur |
| bir dal / hazırlanmış (staged) değişiklikler / tek bir commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | ajan tabanlı, salt okunur |
| bir dosya veya bir aralık | `--file src/a.kt` veya `--file src/a.kt:40-80` (tekrarlanabilir) | statik |
| tek bir fonksiyon veya sınıf | `--symbol parseConfig` (ad belirsizse + `--file`) | statik |
| yalnızca bellekte bulunan kod | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | statik |
| bunlardan herhangi biri artı diğer dosyalara bakma izni | `--agentic` ekleyin | ajan tabanlı, salt okunur |

*Statik*: betik kodu kendisi okur ve numaralandırır, modele hiçbir araç verilmez; böylece hiçbir şeye dokunulamaz ve gösterilmeyen dosyalar hakkında hiçbir şey uydurulamaz. *Ajan tabanlı*: inceleyici depoyu, her yazmayı engelleyen koruyucu hook üzerinden kendisi okur.

İnceleyiciye yardım edin: `--context "bu kodun yapması gereken şey"`, `--focus "concurrency, error handling"` (veya sondaki sözcükler), `--context-lines N`.

Çıktı: varsayılan olarak Markdown; makineler için `--format json`; `--output file`; `--fail-on high` (doğrulanmış bir high veya critical bulgu varsa çıkış kodu 10); `--previous old.json` bulguları yeni, kalıcı, çözülmüş veya yeniden raporlanmamış olarak işaretler.

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

### 7b. Güvenlik incelemesi

`--security` (skill `agy-security`, komut `/agy-review:security`, alt ajan `agy-security`) yukarıdaki her hedefte çalışır ve şunları ekler: bir tehdit modeli yöntemi (güvenilmeyen kaynaktan tehlikeli hedefe, aradaki denetimlerle birlikte), OWASP Top 10 (2021) ve CWE eşlemesi, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, sırlar ve ~25 kötü örüntü sınıfı için modelsiz bir tarayıcı ve **ilgili kod**: hedefin neleri çağırdığı ve onu kimlerin çağırdığı.

- Koda gömülü bir sır (özel anahtar, AWS, GitHub, Stripe, Slack, Google) bir modele herhangi bir şey gönderilmeden **önce maskelenir** ve örüntü eşleşmesiyle bir bulgu olarak raporlanır.
- Bir raporda yer alan `cve`, modelin iddiasıdır ve her zaman `cve_verified: false` olarak etiketlenir: NVD'de veya `osv-scanner` / `npm audit` / `pip-audit` ile doğrulayın. Araç hiçbir zaman CVE uydurmaz veya doğrulamaz.
- "Claude kod yazdı, onu ve komşularını incele": `examples/` içindeki hazır kuralı `CLAUDE.md` veya `AGENTS.md` dosyanıza kopyalayın ya da isteğe bağlı Stop hook'unu veya pre-commit hook'unu kurun. Ayrıntılar ve zincir tarifleri: [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. Görevler: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

Model yalnızca ilettiğiniz metni alır ve hiçbir aracı yoktur. Metin modunda yalnızca yanıt yazdırılır; stderr modeli ve çaba düzeyini bildirir.

### 7d. Çeviri: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

Seçenekler: `--from`, `--variant` (pt-BR, zh-TW, de-CH ...), `--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary` (JSON `{"repo":"مخزن","API":"="}` veya CSV; `=` terimi korur), `--keep a,b`, `--notes`, `--strict`. Uzun metinler boş satırlardan bölünür (hiçbir zaman bir kod bloğunun içinden değil) ve parça parça çevrilir. Çeviriden sonra betik, çit (fenced) kod bloklarının, satır içi kodun, URL'lerin, yer tutucuların (`{{x}}`, `${x}`, `%s`), etiketlerin ve başlıkların kaynakla eşleştiğini doğrular ve her farkı raporlar (`--strict` bir farkı çıkış kodu 11'e çevirir). Skill'ler önce ton, hedef kitle ve terimler için sizinle görüşür, yalnızca çıkarsayamadıklarını sorar. Makine denetimleri akıcılığı değerlendiremez; önemli metinleri ana dili konuşan biri kontrol etsin.

### 7e. Modeller ve çaba düzeyi

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

Çalıştırma başına: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Öncelik sırası: komut satırı, proje dosyası, kullanıcı dosyası, agy varsayılanı. `--effort auto` (varsayılan) belirleyici ve açıklanan bir seçimdir: incelemelerde kapsamdaki kod miktarına göre ölçeklenir (güvenlik gibi risk odaklı bir odak bir adım ekler), görevlerde ifadeye (mekanik dönüşümler low, akıl yürütme ağırlıklı olanlar high) ve girdi uzunluğuna göre; `max` hiçbir zaman otomatik seçilmez. Bazı modeller `--effort` kabul etmez; bu durumda araç model varsayılanını kullanır ve bunu belirtir. Gemini'nin içerik filtresi bir istemi reddederse ve bir model belirtmediyseniz, araç Gemini olmayan bir modelle bir kez yeniden dener ve bunu belirtir.

### 7f. Seçenekler ve çıkış kodları

`bun agy-review.mjs --help` her şeyi listeler. Çıkış kodları: `0` tamam · `1` hata, zaman aşımı veya ayrıştırılamayan yanıt · `2` kullanım hatası veya eksik önkoşul · `3` ajan tabanlı inceleme sırasında çalışma ağacı değişti · `4` sonuçsuz veya eksik (**onay değildir**) · `10` `--fail-on` geçidi başarısız oldu (rapor geçerlidir) · `11` `--strict` ile çeviri denetimi başarısız oldu. Birden fazlası geçerliyse `3`, `10`'a; `10` ise `4`'e üstün gelir; `1` ve `2` dışında her durumda bir rapor yazılır, bu yüzden içindeki `verdict` ve `incomplete` alanlarını okuyun. Temiz bir çalışma ağacı hata değildir: araç "No changes to review" yazdırır ve bir model çağırmadan 0 ile çıkar.

## 8. Ajanlardan, alt ajanlardan ve döngülerden kullanım

Her skill, kararlı JSON döndüren düz bir CLI çağrısıdır; bu yüzden her ajan kullanabilir: Claude Code'da `agy-reviewer`, `agy-security` veya `agy-worker` alt ajanını başlatın, Codex'te skill'leri çağırın veya betiği herhangi bir çerçeveden çağırın.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

İnceleyiciye neyi değiştirdiğiniz asla söylenmez, bu yüzden her tur bağımsız kalır. Tam sözleşme, JSON alanları, döngü tarifleri ve yayılım (fan-out) örüntüleri: [AGENTS.md](AGENTS.md).

## 9. Güvenlik modeli

**Statik incelemeler, bir sembolün/dosyanın/kod parçasının güvenlik incelemeleri, görevler ve çeviriler** agy'yi hiçbir izin bayrağı olmadan ve araçsız, boş bir geçici klasörde çalıştırır: agy dosyalarınızı okuyamaz veya yazamaz; dışarı çıkan tek veri, betiğin istemin içine koyduğudur (tanınan sırlar maskelenmiş olarak).

**Ajan tabanlı incelemeler** (git hedefleri veya `--agentic`) agy'yi hiçbir şey bir istemi beklemesin diye `--dangerously-skip-permissions` ile başlatır ve her araç çağrısını denetleyen, **varsayılan olarak reddeden** bir `PreToolUse` koruyucu hook'una (`guard.mjs`) dayanır:

- izin verilenler: dosya görüntüleme ve arama araçları; yalnızca salt okunur `git` alt komutlarından, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find` (`-delete`/`-exec` olmadan), PowerShell `Get-*`, `Select-String` ve birkaç tanesinden oluşturulmuş tekli veya zincirli kabuk komutları (liste `guard.mjs` içindedir);
- reddedilenler: her yazma/düzenleme/not defteri/görüntü/zamanlama/alt ajan/tarayıcı/web/MCP aracı ve bilinmeyen her araç; yönlendirme, `$(...)`, ters tırnaklar, betik blokları, `eval` benzeri yapılar; `git commit/push/checkout/reset/...`; yorumlayıcılar ve paket yöneticileri; `curl`, `ssh`; kimlik bilgisi depolarını okuma (`.ssh`, `.aws`, `.gnupg`, özel anahtarlar);
- koruyucu çökerse reddeder; betik, koruyucu kurulu, birlikte gelenle özdeş **ve bu koruyucu ile bu agy sürümü için geçen bir `--verify` kaydedilmiş** olmadıkça ajan tabanlı bir çalıştırmayı başlatmayı reddeder; çalıştırmadan önce ve sonra `git status`, izlenen ve hazırlanmış (staged) diff'ler ve izlenmeyen her dosyanın içeriği için parmak izi alır; herhangi bir fark varsa bir uyarıyla 3 koduyla çıkar.
- **Ajan tabanlı modda sırlar maskelenemez**, çünkü inceleyici dosyaları okumadan önce bu mümkün değildir. Araç onları algılar, uyarır ve `limitations` içinde listeler; onları döndürün (rotate) veya önce maskelendikleri `--file` / `--symbol` ile inceleyin.

Bunun olmadığı şeyler:

- **Bir işletim sistemi sanal alanı değildir.** Koruyucu araç adlarını ve komut metnini filtreler; agy'nin kendi sanal alanı her yerde mevcut değildir. İncelenen koda gizlenmiş kasıtlı bir istem enjeksiyonu, filtrenin kabul ettiği bir komut biçimi arayabilir. Öncesi/sonrası denetimi, değiştirilmiş izlenen dosyaları ve yeni dosyaları yakalar, okumaları değil.
- **Kodunuz Google'ın modeline gönderilir**; kimlik bilgisi yolları dışında okumalar kısıtsızdır. Depodaki `.env` dosyaları ajan tabanlı incelemelerce okunabilir. Paylaşmaya yetkiniz olmayan kodu incelemeyin.
- git, bir depoda yapılandırılmış harici diff veya textconv programlarını çalıştırabilir: yalnızca güvendiğiniz depoları inceleyin.
- Bulgular yanlış veya eksik olabilir ve "bulgu yok" asla "güvenli" demek değildir.

## 10. Sorun giderme

| Belirti | Neden ve çözüm |
|---|---|
| `Missing: agy CLI` | Antigravity CLI'yi kurun ve oturum açmak için `agy` komutunu bir kez çalıştırın; eklentiyi çalıştıran kabukta `agy --version` çalışmalıdır |
| `Missing: read-only guard - missing/outdated` | kurulumu çalıştırın (`/agy-review:setup`, Codex `setup` skill'i veya `--install-guard`); yalnızca ajan tabanlı incelemelerin buna ihtiyacı vardır |
| `Not inside a git repository` (çıkış 2) | depo köküne `cd` ile geçin veya kodu `--file` / `--symbol` / `--stdin` ile inceleyin |
| Karar `inconclusive`, çıkış 4 | onay değildir: bulgular reddedildi, model aynı fikirde değil veya kodu kapsamadı ya da bir model başarısız oldu. Kapsamı daraltın, `--context` ekleyin veya başka bir `--model` deneyin |
| `blocked by Gemini's filters` | Gemini güvenlik filtresi reddetti (güvenlik istemlerinde yaygın). `--model` olmadan araç Gemini olmayan bir modelle yeniden dener; aksi hâlde `--model` ile birini seçin |
| `--effort is not supported for model` | otomatik olarak ele alınır (model varsayılanı kullanılır ve bildirilir) |
| Boş inceleme, çıkış 1 | oturumu ve kotayı `agy -p "say hi"` ile denetleyin; büyük hedefler için `--timeout` değerini artırın |
| Çıkış 3 / çalışma ağacı değişti | ajan tabanlı inceleme sırasında bir şey dosyalarınızı değiştirdi (düzenleyici, derleme veya koruyucuyu atlama). `git status` ve `git diff` komutlarını denetleyin; siz değiştirmediyseniz bunu bir güvenlik olayı olarak değerlendirin |
| Çok sayıda reddedilen bulgu | model orada olmayan kodu alıntıladı. Bazen beklenir; asla sayılmazlar. Daha güçlü bir `--model` veya daha dar bir kapsam kullanın |
| `--symbol`: "defined in several places" veya "not found" | `--file` verin veya `--file path:A-B` kullanın. Bulucu sezgiseldir (küme parantezi/girinti eşleştirme), bir ayrıştırıcı değildir |
| Codex: "blocked by sandbox" | bkz. 5b: ağ, `~/.gemini/antigravity-cli` yazmaları ve bir localhost soketine izin verilmelidir |
| Windows: Claude/Codex içinde `agy` veya `bun` bulunamıyor | araç kabuğunun `PATH` değeri farklıdır; komutun çalıştığı bir kabuktan başlatın |
| `verify` FAIL yazdırıyor | önemli kodda ajan tabanlı incelemeleri kullanmayın; çıktıyla ve `agy --version` ile bir issue açın |

## 11. SSS

**Kodumu değiştirir mi?** Hayır. Statik modlar değiştiremez; ajan tabanlı mod yazmaları engeller ve sonrasında ağacınız farklıysa uyarır. Hiçbir şeyi commit etmez, stash'lemez veya checkout yapmaz.

**Burada Bun, Node'dan hızlı mı?** Ölçülebilir ölçüde değil. Yazarın Windows makinesinde başlangıç Node ile yaklaşık 56 ms, Bun ile 64 ms'ydi; koruyucu hook ise yaklaşık 60 ms'ye karşı 57 ms'ydi; bir inceleme onlarca saniye sürer ve bu süre modele aittir. Bun belgelenmiş varsayılandır; Node 18.18+ aynı şekilde çalışır. İkisi de aynı kodla kapsanır.

**Para harcar mı?** Eklenti ücretsizdir. Her inceleme Antigravity kotanızı kullanır.

**Antigravity hangi dosyaları görür?** Statik modlar: yalnızca betiğin gönderdiği kodu (artı `--security` için sınırlı ilgili kod). Ajan tabanlı modlar: depoda okuduğu her şeyi ve kimlik bilgisi yolları dışında diskteki her yeri.

**Bulguları düzeltebilir mi?** Asla düzeltmez. Başka bir ajan veya siz düzeltirsiniz; inceleyici yalnızca inceler, böylece bağımsız kalır.

**Bir GitHub pull request'ini inceleyebilir mi?** Dalı yerelde checkout edin ve `--base` kullanın. GitHub API erişimi yoktur.

**Neden agy ayarlarında komutlara izin listesi verilmiyor?** Test edildi: başsız (headless) modda agy çok sözcüklü izinleri tam olarak eşleştirir (`git status` evet, `git status --short` hayır) ve bir hook'un "allow" kararı izin denetimini geçersiz kılmaz. Bir hook yalnızca güvenilir biçimde reddedebilir; bu nedenle ajan tabanlı mod için skip-permissions artı varsayılan olarak reddeden bir hook, statik mod için ise hiç araç yoktur.

**İzin verilen komutlar veya tarayıcı kuralları ekleyebilir miyim?** `guard.mjs` içindeki `CMDS` / `GIT_OK` değerlerini veya `lib/security.mjs` içindeki `RULES` değerini düzenleyin, `npm test` çalıştırın, ardından `--install-guard` yapın.

## 12. Güncelleme, kaldırma, geliştirme

```text
/plugin marketplace update agy-review          # Claude Code        |  codex plugin marketplace upgrade agy-review  # Codex
/plugin uninstall agy-review@agy-review        # Claude Code        |  codex plugin remove agy-review@agy-review    # Codex
bun .../agy-review.mjs --uninstall-guard       # removes the guard from ~/.gemini/config/plugins
```

Bir güncellemeden sonra kurulumu yeniden çalıştırın (değişen koruyucuyu yeniden kurar) ve doğrulayın.

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

Issue'lar ve pull request'ler memnuniyetle karşılanır, özellikle: macOS ve Linux'ta `verify` sonuçları, işe yarayan Codex sanal alanı ayarları, koruyucu atlatmaları (mümkünse önce özel olarak bildirin) ve yeni tarayıcı kuralları. Çeviriler: `README.md` dosyasını `docs/README.<code>.md` olarak kopyalayın, çevirin ve dili her yerde dil değiştirici satırına ekleyin.

## Lisans

MIT, bkz. [LICENSE](../LICENSE).
