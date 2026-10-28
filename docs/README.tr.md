# agy-review

**Yaptığı işi göstermek zorunda olan bağımsız bir inceleyici.** Claude Code, Codex veya herhangi bir terminalden Google Antigravity (`agy`) ile kod inceleme, güvenlik incelemesi, görev devretme ve çeviri. Salt okunurdur, izin istemez ve her bulgu siz görmeden önce gerçek kodunuzda doğrulanır.

> ## YENİ: graphify grafiğini yenilemek için Claude ve Codex tokenları harcamayı bırakın
>
> **graphify güncellemeleri artık her commit, merge, checkout ve rebase işleminde arka planda Antigravity üzerinde çalışıyor. Agentınız bunlar için 0 token harcıyor ve API key gerekmiyor.**
>
> Tek bir komut, `agy-review --graphify setup`, graphify'ın git hooklarını yeniden kaydeder. Böylece **her grafik güncellemesinin pahalı kısmını (belgelerinizi okuma ve toplulukları bir dil modeliyle adlandırma) Opus veya Fable oturumunuz yerine ucuz bir Antigravity model yapar.** `git commit` saniyenin küçük bir bölümünde tamamlanır, grafik de kendi kendine güncel duruma gelir.
>
> Windows'taki gerçek bir çalıştırmada kodu ve bir belgeyi değiştiren commit, grafiği **22 saniyede, tek bir Antigravity çağrısı ve 0 Claude veya Codex tokenı ile** güncelledi. Arkasındaki model yalnızca metin okuyup metinle yanıt verebilir: hiçbir aracı, yazma veya exec yetkisi yoktur. Ayrıntılar ve kurulum: bölüm 7g.

[English](../README.md) · [فارسی](README.fa.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [Español](README.es.md) · [العربية](README.ar.md) · **Türkçe** · [日本語](README.ja.md) · [한국어](README.ko.md) · [Português (BR)](README.pt-BR.md) · [Deutsch](README.de.md) · [Français](README.fr.md)

Web sitesi: https://ealireza.github.io/agy-review/ · Ayrıntılı belgeler (İngilizce): agentlar ve döngüler için [docs/AGENTS.md](AGENTS.md), güvenlik yöntemi için [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md).

---

## İçindekiler

1. Neler sunuyor
2. Rapora neden güvenebilirsiniz
3. Durum: neler doğrulandı, neler doğrulanmadı
4. Gereksinimler
5. Kurulum
6. İlk çalıştırma: kendi makinenizde doğrulayın
7. Kullanım: inceleme, güvenlik, görevler, çeviri, modeller, graphify
8. Agentlar, sub-agentlar ve döngülerle kullanma
9. Güvenlik modeli
10. Sorun giderme
11. SSS
12. Güncelleme (yeni sürümü alma), kaldırma, geliştirme

---

## 1. Neler sunuyor

| Skill (Claude Code / Codex) | Komut (Claude Code) | Ne yapar |
|---|---|---|
| `agy-review` / `review` | `/agy-review:review` | git değişikliklerini, bir branchi, dosyayı, satır aralığını, tek bir fonksiyonu veya kod parçasını derecelendirerek inceler |
| `agy-security` / `security` | `/agy-review:security` | güvenlik incelemesi yapar: OWASP/CWE, kötüye kullanılabilirlik, saldırı senaryosu, gizli bilgi ve kötü kalıp tarayıcısı; bağlam olarak çağıranlar ve çağrılanlar |
| `agy-proxy` / `proxy` | `/agy-review:proxy` | kendi başına tamamlanabilen herhangi bir görevi (yeniden yazma, özetleme, taslak hazırlama, ayıklama) Antigravity'ye verir ve sonucu getirir |
| `agy-translate` / `translate` | `/agy-review:translate` | ton, hedef kitle ve terim sözlüğüyle çeviri yapar; kodun, URL'lerin, yer tutucuların ve yapının korunduğunu doğrular |
| `agy-models` / `models` | `/agy-review:models` | agy içindeki modelleri ve her birinin kabul ettiği `--effort` değerlerini listeler; birini seçip proje için veya genel olarak kaydeder |
| `agy-graphify` / `graphify` | `/agy-review:graphify` | **git hooklarıyla graphify grafiğini Antigravity üzerinde güncel tutar: 0 Claude veya Codex tokenı, API key yok** |
| `setup`, `verify` | `/agy-review:setup`, `:verify` | ön koşulları denetler, salt okunur korumayı kurar ve makinenizde yazma işlemlerinin engellendiğini kanıtlar |

Claude Code için sub-agentlar: `agy-reviewer`, `agy-security`, `agy-worker`. Her şey tek bir repository ve tek bir script içindedir (`plugins/agy-review/scripts/agy-review.mjs`). Sunucu yoktur; kendi Antigravity oturumunuz dışında hesap gerekmez.

## 2. Rapora neden güvenebilirsiniz

Kodu inceleyen bir dil modeli bazen olmayan bir sorun uydurur. Bu araç modelin sözüne doğrudan güvenmez.

1. İnceleyici katı bir JSON raporu döndürmek zorundadır (`--json-schema` ile zorunlu tutulur). Her bulgu ilgili olduğu **tam kodu** içerir.
2. Script bu alıntıyı gerçek dosyada arar. **Bulunamazsa bulgu reddedilir** ve ayrı olarak listelenir. **Başka bir satırda bulunursa satır numarası düzeltilir.** Bir şeyi kanıtlamak için çok kısa veya genel olan alıntılar (`return null;`, `}`) reddedilir. Belirtilen satırdan uzakta birden fazla yerde eşleşen alıntı belirsiz sayılıp reddedilir.
3. Karar, sayılar ve CI geçidi yalnızca doğrulanmış bulgulardan **script tarafından hesaplanır**; modelden asla kopyalanmaz.
4. Hiçbir şeyin doğrulanmaması bir onay **değildir**: bulgular reddedildiyse, model anlaşmazlığa düştüyse, kodun tamamını kapsamadıysa veya birkaç modelden biri başarısız olduysa karar `inconclusive`, exit code ise 4 olur.
5. İstenen satırların dışındaki bulgular etiketlenir ve geçidi hiçbir zaman etkilemez. Düşük güvenli bulgular listelenir ancak sayılmaz.
6. Önem derecesi (etki) ve öncelik (ne zaman düzeltilmeli) birbirinden ayrıdır ve tutarlı tutulur: kritik her zaman P0, önemsiz ayrıntı her zaman P3'tür; stil bulguları hiçbir zaman düşük seviyenin üzerinde olmaz.

Hâlâ şu olabilir: alıntı doğrudur ama sonuç yanlıştır. Alıntı kodun varlığını kanıtlar, gerekçenin doğru olduğunu değil. Bu nedenle her bulguda somut bir senaryo vardır ve işlem yapmadan önce belirtilen satırları okumalısınız.

Gerçek örnek: bu araç, bilerek iki hata eklenmiş küçük bir dosyada (agy üzerinden Claude Sonnet 4.6) doğru satırlarda 4 doğrulanmış bulgu buldu: CWE-89, CWE-78, CWE-22 ve CWE-369; kapsam %100'dü, bir tekrar atıldı ve tarayıcı aynı iki satırı ayrıca işaretledi.

## 3. Durum: neler doğrulandı, neler doğrulanmadı

| Denetim | Sonuç |
|---|---|
| Birim ve pipeline testleri (`npm test`): temellendirme, kapsam, karar, tekrarları ayıklama, sembol bulucu, hedefler, yapılandırma, modeller, görevler, çeviri, güvenlik, gizleme | Sahte bir `agy` ile 72 testin tamamı geçiyor (agentic pipeline, çalışma ağacındaki değişikliği algılama, başarısız bir model ve `verify` geçidi dahil) |
| Koruma hooku (izin verilen ve reddedilen komutlar, araçlar, tırnak hileleri, kimlik bilgisi yolları) | Otomatik testler geçiyor |
| Claude Code manifestleri (`claude plugin validate`), Antigravity plugin (`agy plugin validate --strict`) | Geçiyor |
| Codex 0.163.0: marketplace ekleme, plugin kurma, skill keşfi | Windows 11'de denetlendi |
| Gerçek agy 1.4.8'e karşı statik inceleme, güvenlik incelemesi ve görevler (Gemini 3.8 Flash ve Claude Sonnet 4.6), Bun 1.3.14 ile çalıştırıldı | Windows 11'de denetlendi; bulgular doğru satırlara dayandırıldı |
| Model başına `--effort`: varsayılan model (low, medium, high), adında effort bulunan modeller ve `--effort` desteği olmayan Claude modelleri | Gerçek agy 1.4.8 ile denetlendi |
| Antigravity üzerinde uçtan uca graphify: Windows'ta gerçek graphify 0.9.86 ve gerçek agy 1.4.8. Bir git hooku grafiği arka planda güncelledi (22 sn, 1 Antigravity çağrısı, `git commit` 0.3 sn'de döndü) ve modele yalnızca değişen belge gönderildi | Elle, ayrıca sahte graphify ve sahte agy kullanılan testlerle denetlendi |
| Tasarım ve kod için iki bağımsız inceleme (Opus: 25 bulgu; Codex: 28 bulgu), doğrulananların her biri regresyon testiyle düzeltildi | Tamamlandı; changelog'a bakın |
| **Agentic incelemeler (`agy --dangerously-skip-permissions` ve gerçek yazmaları engelleyen koruma)** | **Yazar tarafından çalıştırılmadı** |

Yazarın test etmediği nokta: gerçek bir graphify kurulumunda `--graphify setup --yes`; söz konusu kurulum `uv tool` ile yapılmıştır (elle yapılan testte pip'ten kurulmuş ve `openai` paketi zaten bulunan graphify kullanıldı). Agentic satırı güvenlik açısından önemlidir ve agy sürümünüze bağlıdır; bu yüzden kurulumdan sonra ve her agy güncellemesinden sonra `verify` komutunu bir kez çalıştırın (bölüm 6). Bir sembol/dosya/kod parçasına yönelik statik incelemeler ve güvenlik incelemeleri, görevler ve çeviriler bu flagi hiçbir zaman kullanmaz ve hiçbir şey yazamaz.

agy 1.4.8, Codex CLI 0.163.0, Bun 1.3.14, Node 24 ve Windows 11 ile test edildi. macOS ve Linux'ta çalışması gerekir (agy tüm platformlarda `~/.gemini/config/plugins` kullanır) ancak test edilmedi.

## 4. Gereksinimler

Başka bir şey gerekmez: başka plugin veya CLI aracı yoktur.

| Gereken | Neden | Nasıl edinilir | Nasıl denetlenir |
|---|---|---|---|
| Antigravity CLI `agy` | işi yapar | https://antigravity.google/cli, ardından `agy` komutunu bir kez çalıştırıp oturum açın | `agy --version` |
| Bun (önerilir) **veya** Node.js 18.18+ | scripti ve koruma hookunu çalıştırır | https://bun.sh veya https://nodejs.org | `bun --version` / `node --version` |
| git | git hedefleri ve bulguyla ilgili kod | https://git-scm.com | `git --version` |
| Claude Code **veya** Codex **veya** herhangi bir terminal | isteği verdiğiniz yer | kendi kurulum kılavuzları | `claude --version` / `codex --version` |

Bun tüm yönergelerde ve koruma hookunda varsayılandır (`bun guard.mjs || node guard.mjs`); Node aynı şekilde çalışır. Antigravity kullanımı kendi quota'nızdan düşer. Bir inceleme birkaç saniye ile birkaç dakika arasında sürebilir.

## 5. Kurulum

Kullandığınız ortamı seçin; birkaçı aynı scripti ve korumayı paylaşabilir.

### 5a. Claude Code

```text
/plugin marketplace add Ealireza/agy-review
/plugin install agy-review@agy-review
/agy-review:setup
/agy-review:verify
```

`/agy-review:setup` agy, git ve korumayı denetler; korumayı `~/.gemini/config/plugins/readonly-review` konumuna kurar. `/agy-review:verify` canlı güvenlik kanıtıdır.

### 5b. Codex

```bash
codex plugin marketplace add Ealireza/agy-review
codex plugin add agy-review@agy-review
```

Codex'i yeniden başlatın, ardından doğal dille şunlardan birini isteyin: "Antigravity inceleme kurulumumu denetle", "Değişikliklerimi Antigravity ile incele", "saveUpload fonksiyonunu güvenlik açısından incele", "README.md dosyasını samimi bir tonla Almancaya çevir".

1. **Korumayı normal bir terminalden bir kez kurun** (`~/.gemini/config/plugins` konumuna yazar): `bun ~/.codex/plugins/cache/agy-review/agy-review/1.0.1/scripts/agy-review.mjs --install-guard` (Windows: `%USERPROFILE%\.codex\plugins\cache\agy-review\agy-review\1.0.1\scripts\agy-review.mjs`; klasör adı kurulu sürümdür, bu nedenle güncellemeden sonra var olan klasörü kullanın). Korumaya yalnızca agentic git incelemeleri ihtiyaç duyar.
2. **Codex sandbox, agy'nin çalışmasına izin vermelidir:** dış ağ erişimi, `~/.gemini/antigravity-cli` konumuna yazma erişimi ve localhost soketi. `workspace-write` kullanıyorsanız büyük olasılıkla `~/.codex/config.toml` içinde şunlar gerekir:

   ```toml
   [sandbox_workspace_write]
   network_access = true
   writable_roots = ["/home/you/.gemini/antigravity-cli"]   # Windows: "C:\\Users\\you\\.gemini\\antigravity-cli"
   ```

   Bir şey hâlâ engelleniyorsa skill eksik erişimi söyler ve durur; izinleri kendi kendine asla genişletmez. agy'nin Codex sandbox içinde doğru çalışıp çalışmadığı, Codex kurulumunda yazarın test edemediği bölümdür; bu nedenle `verify` komutunu Codex içinden de çalıştırın.

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

Koruma sıradan bir Antigravity plugindir. `plugins/agy-review/antigravity-plugin/readonly-review` klasörünü `~/.gemini/config/plugins/readonly-review` konumuna kopyalayın veya `--install-guard` komutunu çalıştırın; `agy plugin list` ile denetleyin. Bir prompt `AGY_READONLY_REVIEW` içermedikçe hiçbir şey yapmaz; dolayısıyla normal agy oturumlarınız değişmez. Etkileşimli agy için bir `readonly-code-review` skill de sunar.

## 6. İlk çalıştırma: kendi makinenizde doğrulayın

Kurulumdan sonra ve her agy güncellemesinden sonra bir kez çalıştırın: `/agy-review:verify`, Codex `verify` skill veya `--verify`. Geçici bir klasörde küçük bir canlı agy çağrısı yapar: dosya okuma çalışmalı; dosyaya yazma, dosyaya yönlendirme ve dosya silme işlemlerinin tamamı engellenmelidir. Beklenen çıktı:

```text
PASS  read allowed
PASS  file write blocked
PASS  redirect blocked
PASS  delete blocked
PASS  guard actually fired

Verified: reads work, writes are blocked.
```

Herhangi bir `FAIL`, `NOT VERIFIED` ile biter ve agentic incelemeler devre dışı kalır: çıktıyı ve `agy --version` sonucunuzu ekleyerek issue açın. Başarılı bir `verify`, tam olarak bu koruma ve bu agy sürümü için kaydedilir; **agentic incelemeler bu kayıt olmadan başlamayı reddeder**. agy veya koruma güncellemesi kaydı geçersiz kılar, bu yüzden güncellemelerden sonra `verify` komutunu yeniden çalıştırın. Statik modlar buna ihtiyaç duymaz.

## 7. Kullanım

Repository kökünden çalıştırın.

### 7a. İnceleme: hedefi seçin

| İncelemek istediğiniz | Kullanım | Mod |
|---|---|---|
| commit edilmemiş çalışma | hiçbir şey | agentic, salt okunur |
| bir branch / staged değişiklikler / tek commit | `--base main` / `--staged` / `--commit <sha>` (+ `--paths a,b`) | agentic, salt okunur |
| bir dosya veya aralık | `--file src/a.kt` veya `--file src/a.kt:40-80` (tekrarlanabilir) | statik |
| tek bir fonksiyon veya sınıf | `--symbol parseConfig` (+ ad belirsizse `--file`) | statik |
| yalnızca bellekte bulunan kod | `... \| agy-review --stdin --lang python --name snip.py [--start-line N]` | statik |
| bunlardan biri ve diğer dosyalara bakma izni | `--agentic` ekleyin | agentic, salt okunur |

*Statik*: script kodu kendi okur ve numaralandırır; model hiçbir araç almaz. Bu nedenle hiçbir şeye dokunulamaz ve gösterilmeyen dosyalar hakkında bir şey uydurulamaz. *Agentic*: inceleyici repository'yi her yazma işlemini engelleyen koruma hooku üzerinden kendi okur.

İnceleyiciye yardımcı olun: `--context "what this code must do"`, `--focus "concurrency, error handling"` (veya sondaki sözcükler), `--context-lines N`.

Çıktı varsayılan olarak Markdown'dır; makineler için `--format json`; `--output file`; doğrulanmış yüksek veya kritik bir bulgu varsa exit 10 için `--fail-on high`; `--previous old.json` bulguları yeni, devam eden, çözülmüş veya yeniden bildirilmemiş olarak işaretler.

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

`--security` (skill `agy-security`, komut `/agy-review:security`, sub-agent `agy-security`) yukarıdaki tüm hedeflerde çalışır ve şunları ekler: tehdit modeli yöntemi (güvenilmeyen kaynaktan tehlikeli hedefe, aradaki denetimlerle), OWASP Top 10 (2021) ve CWE eşlemesi, `exploitability` (`demonstrated`, `likely`, `conditional`, `theoretical`), `attack_scenario`, `data_flow`, gizli bilgi ve yaklaşık 25 kötü kalıp sınıfı için modelsiz tarayıcı ve **ilgili kod**: hedefin çağırdıkları ve hedefi çağıranlar.

- Koda gömülmüş bir gizli bilgi (private key, AWS, GitHub, Stripe, Slack, Google), **bir modele gönderilmeden önce gizlenir** ve kalıp üzerinden bulgu olarak bildirilir.
- Rapordaki bir `cve`, modelin iddiasıdır ve her zaman `cve_verified: false` olarak etiketlenir: NVD'den veya `osv-scanner` / `npm audit` / `pip-audit` ile doğrulayın. Araç CVE uydurmaz veya doğrulamaz.
- "Claude kod yazdı, onu ve komşularını incele": `examples/` içindeki hazır kuralı `CLAUDE.md` veya `AGENTS.md` dosyanıza kopyalayın ya da isteğe bağlı Stop hook veya pre-commit hook kurun. Ayrıntılar ve zincir tarifleri: [docs/SECURITY-REVIEW.md](SECURITY-REVIEW.md).

### 7c. Görevler: `agy-proxy`

```bash
bun agy-review.mjs --task "Summarise in 5 bullets for non-technical readers" --input notes.md
cat draft.txt | bun agy-review.mjs --task "Rewrite more friendly" --stdin --format json
```

Model yalnızca verdiğiniz metni alır; hiçbir araç almaz. Metin modu yalnızca yanıtı yazdırır; stderr, model ve effort bilgisini bildirir.

### 7d. Çeviri: `agy-translate`

```bash
bun agy-review.mjs --preset translate --to Persian --tone friendly --audience "new developers" --glossary glossary.json --input README.md --output docs/README.fa.md
```

Seçenekler: `--from`, `--variant` (pt-BR, zh-TW, de-CH ...), `--tone` (formal, neutral, friendly, casual, technical, marketing, literary, legal), `--audience`, `--glossary` (JSON `{"repo":"مخزن","API":"="}` veya CSV; `=` terimi korur), `--keep a,b`, `--notes`, `--strict`. Uzun metinler boş satırlardan bölünür (asla code block içinde değil) ve parça parça çevrilir. Çeviri sonrasında script fenced code, inline code, URL'ler, yer tutucular (`{{x}}`, `${x}`, `%s`), taglar ve başlıkların kaynakla eşleştiğini doğrular ve her farkı bildirir (`--strict` bir farkı exit 11'e dönüştürür). Skilller önce ton, hedef kitle ve terimler hakkında görüşür; yalnızca çıkarım yapamadıkları konuları sorar. Makine denetimleri akıcılığı değerlendiremez; önemli metinleri ana dili Türkçe olan birine okutun.

### 7e. Modeller ve effort

```bash
bun agy-review.mjs --list-models                    # id and name, * marks your selection
bun agy-review.mjs --set model=claude-sonnet-4-6    # this project (.agy-review.json); add --global for all projects
bun agy-review.mjs --set models=gemini-3.8-flash-high,claude-sonnet-4-6   # cross-check: findings both report are marked
bun agy-review.mjs --show-config
```

Her çalıştırma için: `--model <id|name>`, `--models a,b`, `--effort auto|low|medium|high|xhigh|max`. Öncelik sırası: komut satırı, proje dosyası, kullanıcı dosyası, agy varsayılanı. `--effort auto` (varsayılan), açıklanan ve deterministik bir seçimdir: incelemeler kapsamdaki kod miktarına göre ölçeklenir (güvenlik gibi riske duyarlı bir odak bir kademe ekler); görevlerde sözcükler (mekanik dönüşümlerde low, yoğun akıl yürütmede high) ve girdi uzunluğu kullanılır; `max` hiçbir zaman otomatik seçilmez. **effort her zaman modele uydurulur, asla tahmin edilmez.** Her modelin `--effort` anlayışı farklıdır: agy'nin varsayılan modeli `low | medium | high` sunar; adında effort bulunan modeller (`gemini-3.8-flash-high`, `gpt-oss-120b-medium`) hiçbir `--effort` kabul etmez; Claude modelleri de desteklemez. Araç, agy'ye bir modelin hangi durumda olduğunu sorar (yaklaşık dört saniye süren, model çağrısı başlatmayan ücretsiz bir denetim), yanıtı model ve agy sürümü başına `~/.agy-review-cache.json` içinde tutar, effort değerinizi modelin kabul ettiği en yakın değere getirir (örneğin `xhigh`, `high` olur) ve raporda gerçekte ne kullanıldığını belirtir. agy'nin listesi değişirse hata okunur, cache düzeltilir ve işlem bir kez daha denenir. `--list-models` her modelin ne kabul ettiğini gösterir (`--refresh` yeniden sorar). Gemini'ın içerik filtresi bir promptu reddeder ve siz model belirtmediyseniz araç Gemini olmayan bir modelle bir kez daha dener ve bunu belirtir.

### 7f. Seçenekler ve exit codelar

`bun agy-review.mjs --help` her şeyi listeler. Exit codelar: `0` tamam · `1` hata, zaman aşımı veya ayrıştırılamayan yanıt · `2` kullanım hatası veya eksik ön koşul · `3` agentic inceleme sırasında çalışma ağacı değişti · `4` sonuçsuz veya eksik (**geçti sayılmaz**) · `10` `--fail-on` geçidi başarısız oldu (rapor geçerlidir) · `11` `--strict` ile çeviri denetimi başarısız oldu. Birkaçı birden geçerliyse `3`, `10` karşısında; `10` ise `4` karşısında önceliklidir. `1` ve `2` dışında her durumda rapor yazılır; bu nedenle içindeki `verdict` ve `incomplete` alanlarını okuyun. Temiz çalışma ağacı hata değildir: araç "No changes to review" yazdırır ve model çağırmadan exit 0 ile çıkar.

### 7g. Antigravity üzerinde graphify: grafik güncellemeleri için sıfır agent tokenı

**[graphify](https://github.com/Graphify-Labs/graphify) kullanıyorsanız bu, projenin tamamındaki en büyük tasarruftur.** graphify bir repository'yi ve belgelerini bilgi grafiğine dönüştürür. İşin büyük bölümü deterministik koddur (tree-sitter, kümeleme, rapor, cache, merge) ve hiçbir maliyeti yoktur. İki adım dil modeli gerektirir: **belgelerin ve makalelerin anlamsal olarak çıkarılması** ve **toplulukların adlandırılması**. Bir backend sabitlemezseniz graphify kendisi seçer; coding agent içinde bu, coding agentın kendisi (veya aboneliği) olur. Bu yüzden belgeye dokunan her grafik yenilemesi Opus, Fable veya Codex tokenlarınızla ödenir.

**`--graphify` tam olarak bu iki adımı Antigravity'ye taşır ve diğer her şeyi olduğu gibi bırakır.** Script `127.0.0.1` üzerinde OpenAI uyumlu protokolü konuşan ve `agy` ile yanıt veren küçük bir yerel sunucu başlatır; ardından **graphify'ın her LLM adımını buna sabitler**. Böylece graphify hiçbir zaman coding agentınıza veya ücretli API key'e geri dönemez. Ollama ya da herhangi bir key gerekmez. (graphify, ayarlarında bu yuvaya "ollama" der; bu yalnızca "OpenAI uyumlu herhangi bir yerel sunucu" anlamına gelir.)

```text
git commit / merge / checkout / rebase
   -> hook returns at once and starts the update in the background
      -> graphify extract: code is parsed locally, only changed docs go to the model
      -> the model is Antigravity (agy), reached through the local server
      -> graphify cluster-only: communities are named by Antigravity, report refreshed
   -> Claude / Codex tokens used: 0.  API keys needed: 0.
```

**Neden yazma veya exec yetkisi gerekmiyor?** Bunun Python ve dosya yazma gerektirmesini bekleyebilirsiniz, ancak model yalnızca metin okuyup metinle yanıt vermelidir. graphify `graphify-out/` içeriğini kendi yazar; bu araç hookları, lock dosyasını ve logu yazar. Sunucunun arkasındaki modelin hiçbir aracı, dosyası veya ağı yoktur; bir belgenin içine gizlenen prompt injection modele hiçbir şey yaptıramaz. Belgelerinizde tanınan gizli bilgiler gönderilmeden önce gizlenir. Böylece projenin geri kalanındaki salt okunur olma sözü korunur.

Her repository için bir kez kurun:

```bash
bun agy-review.mjs --graphify doctor              # graphify, agy, and graphify's own Python must be able to import openai
bun agy-review.mjs --graphify setup --yes         # installs the git hooks; --yes lets it add the openai package to graphify's environment
bun agy-review.mjs --graphify update --full       # only if there is no graph yet: the first build reads every doc, so it takes a while
bun agy-review.mjs --graphify status              # hooks, last update, tokens used on Antigravity
```

Claude Code veya Codex içinde yalnızca "graphify güncellemelerini Antigravity üzerinde kur" deyin (skill `agy-graphify` / `graphify`, komut `/agy-review:graphify`). Skill, graphify ortamına paket eklemeden önce sorar.

Sizin için yaptıkları:

- **Hooklar:** `post-commit`, `post-merge`, `post-checkout` (yalnızca branch geçişleri) ve `post-rewrite` (amend, rebase), güncellemeyi **ayrılmış biçimde** çalıştırır; böylece git komutu saniyenin küçük bir bölümünde döner. Bu hook dosyalarının mevcut içeriği korunur. Varsayılan olarak **graphify'ın kendi hookları değiştirilir** (bunlar yalnızca kodu yeniden oluşturur, bizimkiler hem bunu hem daha fazlasını yapar; tek grafiğe yazan iki süreç yarışır). `--keep-graphify-hook` ikisini de korur; `--graphify hook-uninstall --restore-graphify` graphify'ın kendi hooklarını geri getirir. Bu aracın `~/.agy-review/runtime` altındaki kopyası, hookların plugin güncellemelerinden etkilenmemesini sağlar. Bir kez atlamak için `AGY_GRAPHIFY_SKIP=1 git commit ...` kullanın.
- **Artımlı:** neyin değiştiğine graphify'ın kendi cache'i karar verir; değişmeyen belgeler modele asla gönderilmez. Arka arkaya iki commit aynı anda iki güncelleme çalıştırmaz: ikincisi bir tur daha ister.
- **Agentınız bunun için token yakmayı bırakır:** `CLAUDE.md` veya `AGENTS.md` içinde agenta grafiği yeniden oluşturmasını söyleyen bir graphify bölümü varsa `--graphify rules --write-rules`, bunu yapmamasını söyleyen kısa bir kural ekler (kendi metniniz asla düzenlenmez ve dosyalar yoksa hiçbir şey oluşturulmaz).
- **Varsayılan olarak ucuz:** effort `low` değerindedir, çünkü çıkarma yapılandırılmış bir iştir. Bir testte `low`, aynı belge için `high` değerine göre yaklaşık 40 kat daha az çıktı tokenı kullandı (685'e karşı 29,996) ve 15 saniyede bitti; diğer değerle 207 saniye sürmüştü. `--set graphifyEffort=...` ile değiştirin, `--set graphifyModel=<id>` ile modeli seçin (`--list-models` bölümüne bakın), paralel çağrılar için `--set graphifyConcurrency=N`, topluluk adlandırmayı atlamak için `--set graphifyLabels=false` kullanın.

Dürüst sınırlamalar: güncellemeler **Antigravity quota'nızı** kullanır (amaç zaten budur: pahalı model yerine ucuz model, "ücretsiz" değil). **Bu yolda görseller çıkarılmaz** (graphify bu backend için onları atlar, agy de bu yoldan göremez). Kod yerel olarak ayrıştırılır; belgeler ve makaleler metin hâlinde Google'ın modeline gönderilir. Belge çıkarma kalitesi seçtiğiniz modele bağlıdır. graphify kurulu olmalıdır (`uv tool install graphifyy`) ve kendi Python ortamında `openai` paketi bulunmalıdır: `--graphify setup --yes`, bunu `uv tool install --force "graphifyy[openai]"` ile ekler (ya da `pipx inject graphifyy openai`). Ayrıntılar, ayarlar ve sorun giderme: [docs/GRAPHIFY.md](GRAPHIFY.md).

## 8. Agentlar, sub-agentlar ve döngülerle kullanma

Her skill kararlı JSON döndüren sade bir CLI çağrısıdır; dolayısıyla herhangi bir agent kullanabilir: Claude Code içinde `agy-reviewer`, `agy-security` veya `agy-worker` sub-agentını başlatın, Codex içindeki skillleri çağırın ya da scripti herhangi bir frameworkten çalıştırın.

```bash
# implement -> review -> fix, repeated at most 5 times
bun agy-review.mjs --security --symbol applyDiscount --context "applies at most one coupon" --format json --output r.json --fail-on high
# exit 0: done   10: fix the P0/P1 findings and re-run with --previous r.json   4: inconclusive, not a pass   1/2: stop and report
```

İnceleyiciye neyi değiştirdiğiniz asla söylenmez; bu nedenle her tur bağımsız kalır. Tam sözleşme, JSON alanları, döngü tarifleri ve fan-out kalıpları: [docs/AGENTS.md](AGENTS.md).

## 9. Güvenlik modeli

**Statik incelemeler, bir sembol/dosya/kod parçasının güvenlik incelemeleri, görevler ve çeviriler**, agy'yi herhangi bir permission flag olmadan ve boş bir geçici klasörde araçsız çalıştırır: agy dosyalarınızı okuyamaz veya yazamaz; dışarı çıkan tek veri scriptin prompta koyduğu içeriktir (tanınan gizli bilgiler gizlenir).

**Agentic incelemeler** (git hedefleri veya `--agentic`), hiçbir şeyin prompt beklememesi için agy'yi `--dangerously-skip-permissions` ile başlatır ve her araç çağrısını inceleyip **varsayılan olarak reddeden** bir `PreToolUse` koruma hookuna (`guard.mjs`) güvenir:

- izin verilenler: dosya görüntüleme ve arama araçları; yalnızca salt okunur `git` alt komutlarından, `rg`, `grep`, `cat`, `ls`, `head`, `tail`, `wc`, `find` (`-delete`/`-exec` olmadan), PowerShell `Get-*`, `Select-String` ve birkaç komuttan oluşan tekli veya zincirlenmiş shell komutları (liste `guard.mjs` içindedir);
- reddedilenler: her yazma/düzenleme/notebook/görsel/zamanlama/sub-agent/tarayıcı/web/MCP aracı ve bilinmeyen her araç; yönlendirme, `$(...)`, backtickler, script blokları, `eval` benzeri yapılar; `git commit/push/checkout/reset/...`; yorumlayıcılar ve paket yöneticileri; `curl`, `ssh`; kimlik bilgisi depolarını okuma (`.ssh`, `.aws`, `.gnupg`, private keyler);
- koruma çökerse isteği reddeder; script, koruma kurulmadıkça, paketle gelenle aynı olmadıkça **ve bu koruma ile bu agy sürümü için başarılı bir `--verify` kaydı bulunmadıkça** agentic çalıştırmayı başlatmaz. Çalıştırmadan önce ve sonra `git status`, tracked ve staged diffler ile her untracked dosyanın içeriğinin parmak izini çıkarır; herhangi bir fark varsa uyarıyla exit 3 döndürür.
- **Agentic moddaki gizli bilgiler**, inceleyici dosyaları okumadan önce gizlenemez. Araç bunları algılar, uyarır ve `limitations` içinde listeler; bu bilgileri değiştirin veya önceden gizlendikleri `--file` / `--symbol` seçenekleriyle inceleyin.

**graphify güncellemeleri** (`--graphify`) modele hiçbir araç vermez: model, yalnızca `127.0.0.1` üzerinde dinleyen, yalnızca bir güncelleme boyunca var olan rastgele bir bearer key isteyen ve yabancı `Host` headerlarını reddeden sunucu üzerinden metin alır; `agy`, permission flag olmadan boş bir geçici klasörde çalışır. Diske yazılanları graphify (`graphify-out/`) ve bu araç (git hookları, `~/.agy-review/runtime`, lock ve log) yazar. Hooklar her committe kod çalıştırır: bu, graphify'ın kendi hooklarına zaten verdiğiniz güvenle aynıdır; `--graphify hook-uninstall` bunları kaldırır.

Bu ne değildir:

- **OS sandbox değildir.** Koruma araç adlarını ve komut metnini filtreler; agy'nin kendi sandbox özelliği her yerde kullanılamaz. İncelenen kodun içine bilerek gizlenen bir prompt injection, filtrenin kabul ettiği bir komut biçimi arayabilir. Önce/sonra denetimi değiştirilen tracked dosyaları ve yeni dosyaları yakalar, okumaları değil.
- **Kodunuz Google'ın modeline gönderilir**; kimlik bilgisi yolları dışında okumalar sınırsızdır. Repository içindeki `.env` dosyaları agentic incelemeler tarafından okunabilir. Paylaşamayacağınız kodu inceletmeyin.
- git, bir repository içinde yapılandırılmış harici diff veya textconv programlarını çalıştırabilir: yalnızca güvendiğiniz repository'leri inceleyin.
- Bulgular yanlış veya eksik olabilir; "bulgu yok" hiçbir zaman "güvenli" demek değildir.

## 10. Sorun giderme

| Belirti | Neden ve çözüm |
|---|---|
| `Missing: agy CLI` | Antigravity CLI'ı kurun ve oturum açmak için `agy` komutunu bir kez çalıştırın; plugini çalıştıran shell içinde `agy --version` çalışmalıdır |
| `Missing: read-only guard - missing/outdated` | Kurulumu çalıştırın (`/agy-review:setup`, Codex `setup` skill veya `--install-guard`); yalnızca agentic incelemeler buna ihtiyaç duyar |
| `Not inside a git repository` (exit 2) | Repository köküne `cd` ile geçin veya kodu `--file` / `--symbol` / `--stdin` ile inceleyin |
| Karar `inconclusive`, exit 4 | Bu bir geçiş değildir: bulgular reddedilmiş, model anlaşmazlığa düşmüş, kodu kapsamamış veya modellerden biri başarısız olmuştur. Kapsamı daraltın, `--context` ekleyin veya başka bir `--model` deneyin |
| `blocked by Gemini's filters` | Gemini güvenlik filtresi isteği reddetti (güvenlik promptlarında sık görülür). `--model` belirtmediyseniz araç Gemini olmayan bir modelle yeniden dener; belirttiyseniz `--model` ile başka bir model seçin |
| `invalid model selection ... has no "xhigh" effort (available: low, medium, high)` veya `conflicts with --effort` ya da `--effort is not supported` | 1.0.1'de düzeltildi: effort otomatik olarak modele uydurulur ve rapor kullanılan değeri söyler. Hâlâ görüyorsanız `--list-models --refresh` çalıştırın, plugini güncelleyin (bölüm 12) ve bildirin |
| graphify: `openai package ... missing` | graphify'ın kendi Python ortamında `openai` paketi yok. `--graphify setup --yes` veya `uv tool install --force "graphifyy[openai]"` çalıştırın (pipx: `pipx inject graphifyy openai`) |
| graphify: commit sonrasında grafik güncellenmedi | `--graphify status` hookları ve son sonucu gösterir; `graphify-out/.agy-update.log` dosyasını okuyun; `--graphify update --debug` komutunu ön planda bir kez çalıştırın (her istek ve yanıtı belgelerinizi içeren `graphify-out/.agy-debug/` altında tutar). Henüz grafik yoksa hook hiçbir şey yapmaz: `--graphify update --full` ile bir kez oluşturun |
| graphify: bir parça için `agy returned no answer` | graphify sonraki güncellemede bu parçayı yeniden dener. `agy -p "say hi"` ile oturum ve quota durumunu denetleyin veya `--set graphifyModel=<id>` ile başka bir model seçin |
| graphify, skill ve paket sürümlerinin farklı olduğu uyarısını veriyor | Bu araç açısından zararsızdır; graphify'ı `uv tool upgrade graphifyy` ile yükseltin |
| Boş inceleme, exit 1 | `agy -p "say hi"` ile oturum ve quota durumunu denetleyin; büyük hedeflerde `--timeout` değerini yükseltin |
| Exit 3 / çalışma ağacı değişti | Agentic inceleme sırasında bir şey dosyalarınızı değiştirdi (editör, build veya korumayı aşma). `git status` ve `git diff` sonuçlarını denetleyin; değişikliği siz yapmadıysanız bunu güvenlik olayı olarak değerlendirin |
| Çok sayıda reddedilen bulgu | Model, orada olmayan kodu alıntıladı. Bu bazen beklenir; bu bulgular asla sayılmaz. Daha güçlü bir `--model` veya daha dar kapsam kullanın |
| `--symbol`: "defined in several places" veya "not found" | `--file` verin veya `--file path:A-B` kullanın. Bulucu sezgiseldir (parantez/girinti eşleştirme), parser değildir |
| Codex: "blocked by sandbox" | 5b'ye bakın: ağ, `~/.gemini/antigravity-cli` yazmaları ve localhost soketine izin verilmelidir |
| Windows: Claude/Codex içinde `agy` veya `bun` bulunamadı | Aracın shell ortamındaki `PATH` farklıdır; uygulamayı komutun çalıştığı bir shellden başlatın |
| `verify`, FAIL yazdırıyor | Önemli kodlarda agentic inceleme kullanmayın; çıktıyı ve `agy --version` sonucunuzu ekleyerek issue açın |

## 11. SSS

**Kodumu değiştirir mi?** Hayır. Statik modlar değiştiremez; agentic mod yazmaları engeller ve sonrasında ağacınız farklıysa uyarır. Asla commit etmez, stash yapmaz veya checkout yapmaz.

**Bun burada Node'dan daha mı hızlı?** Ölçülebilir bir fark yok. Yazarın Windows makinesinde başlangıç Node ile yaklaşık 56 ms, Bun ile 64 ms; koruma hooku ise yaklaşık 60 ms ve 57 ms sürdü. Bir inceleme onlarca saniye sürer ve bunun nedeni modeldir. Belgelerde varsayılan Bun'dır; Node 18.18+ aynı şekilde çalışır. İkisi de aynı kodla kapsanır.

**Ücretli mi?** Plugin ücretsizdir. Her inceleme, görev, çeviri ve graphify güncellemesi kendi Antigravity quota'nızı kullanır.

**graphify için Ollama veya API key gerekir mi?** Hayır. graphify'da "OpenAI uyumlu herhangi bir yerel sunucu" anlamına gelen "ollama" adlı bir backend yuvası vardır; arkasındaki sunucu bu aracın küçük Antigravity sunucusudur. Kurulması gereken tek şey graphify'ın `openai` Python paketidir; `--graphify setup --yes` bunu ekler.

**graphify yine Claude veya Codex tokenlarımı harcar mı?** Yalnızca siz veya agentınız `/graphify --update`, `graphify extract` ya da benzerini kendiniz çalıştırırsanız veya `CLAUDE.md` / `AGENTS.md` içindeki bir bölüm agenta grafiği yeniden oluşturmasını söylerse. Bunu durduran kuralı eklemek için `--graphify rules --write-rules` kullanın.

**Antigravity hangi dosyaları görür?** Statik modlar: yalnızca scriptin gönderdiği kod (ve `--security` için sınırlı ilgili kod). Agentic modlar: repository içinde ve kimlik bilgisi yolları dışında diskte okuduğu her şey.

**Bulguları düzeltebilir mi?** Asla düzeltmez. Başka bir agent veya siz düzeltirsiniz; inceleyici yalnızca inceleme yapar ve böylece bağımsız kalır.

**Bir GitHub pull requestini inceleyebilir mi?** Branchi yerelde checkout edin ve `--base` kullanın. GitHub API erişimi yoktur.

**Neden agy ayarlarında komutlara izin listesi uygulanmıyor?** Test edildi: headless modda agy çok sözcüklü izinleri tam olarak eşleştirir (`git status` evet, `git status --short` hayır) ve bir hookun "allow" yanıtı izin denetimini geçersiz kılmaz. Bir hook yalnızca güvenilir biçimde reddedebilir; bu nedenle agentic modda skip-permissions ve varsayılan olarak reddeden hook, statik modda ise hiç araç kullanılmaz.

**İzin verilen komutlar veya tarayıcı kuralları ekleyebilir miyim?** `CMDS` / `GIT_OK` değerlerini `guard.mjs` içinde veya `RULES` değerini `lib/security.mjs` içinde düzenleyin, `npm test` çalıştırın, ardından `--install-guard` kullanın.

## 12. Güncelleme, kaldırma, geliştirme

### Yeni sürüme güncelleme

Yeni bir release size kendiliğinden gelmez: bilerek güncellersiniz. Dört adım vardır.

**1. Elinizdeki sürümü ve daha yenisi olup olmadığını denetleyin**

```bash
bun agy-review.mjs --version          # for example: agy-review 1.0.1 (bun 1.3.14)
bun agy-review.mjs --update-check     # asks GitHub; prints the exact commands below if a newer version exists
```

Release listesini https://github.com/Ealireza/agy-review/releases adresinden ve [changelog](../CHANGELOG.md) üzerinden de okuyabilirsiniz.

**2. Kullandığınız ortam için plugini güncelleyin**

| Ortam | Komutlar (normal terminalde çalıştırın) | Ardından |
|---|---|---|
| Claude Code | `claude plugin marketplace update agy-review` ve ardından `claude plugin update agy-review@agy-review` | Claude Code'u yeniden başlatın |
| Codex | `codex plugin marketplace upgrade agy-review`, ardından `codex plugin remove agy-review@agy-review` ve `codex plugin add agy-review@agy-review` | Codex'i yeniden başlatın |
| Düz clone | Clone içinde `git pull` | Hiçbir şey |

**3. Plugin klasörü dışında yaşayan parçaları yenileyin**

```bash
bun agy-review.mjs --install-guard         # the Antigravity guard hook is copied to ~/.gemini/config/plugins; this replaces it with the new one
bun agy-review.mjs --verify                # a guard or agy change invalidates the last check, and agentic reviews stay off until this passes
bun agy-review.mjs --graphify setup        # only if you use graphify: refreshes the hooks and the runtime copy in ~/.agy-review/runtime
```

**4. Çalıştığını doğrulayın:** `--version` yeni numarayı gösterir, `--check` her şey için OK der ve `--list-models --refresh` her modelin kabul ettiği `--effort` değerlerini yeniden okur.

Güncellemeden sonra bir şey bozulursa: `--check` çalıştırın, sorun giderme tablosunu okuyun (bölüm 10). Eski sürüme dönmeniz gerekirse plugini kaldırın ve `git clone --branch v1.0.0 https://github.com/Ealireza/agy-review` ile belirli bir release kurun. Ayarlarınız (`.agy-review.json`) güncellemelerin asla dokunmadığı düz dosyalardır.

### Kaldırma

```text
claude plugin uninstall agy-review@agy-review   # Claude Code
codex plugin remove agy-review@agy-review       # Codex
bun agy-review.mjs --uninstall-guard            # removes the guard from ~/.gemini/config/plugins
bun agy-review.mjs --graphify hook-uninstall --restore-graphify   # removes our git hooks and puts graphify's own back
```

Hiçbir şey kalmasın istiyorsanız `~/.agy-review` (runtime kopyası) ve `~/.agy-review-cache.json` (effort cache'i) dosyalarını silin.

### Geliştirme

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

Issue ve pull requestler memnuniyetle karşılanır; özellikle macOS ve Linux'taki `verify` sonuçları, çalışan Codex sandbox ayarları, korumayı aşma yöntemleri (mümkünse önce özel olarak bildirin) ve yeni tarayıcı kuralları. Çeviriler: `README.md` dosyasını `docs/README.<code>.md` konumuna kopyalayın, çevirin ve dili her yerdeki dil değiştirici satırına ekleyin.

## Lisans

MIT, bkz. [LICENSE](../LICENSE).
