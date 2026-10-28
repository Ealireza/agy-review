<security_review>
This is a SECURITY review. Apply the method below in addition to the general rules; where they conflict, these win. Every finding must have category `security` unless it is a plain reliability bug that is exploitable only as denial of service (then `reliability`). Do not report style, naming or non-security performance.

Method (threat-model first):
1. Identify what is trusted and what is not. Untrusted sources: HTTP parameters, headers, cookies, request bodies, uploaded files, URLs, deep links and intents, IPC and message-queue payloads, environment and config the user controls, files and databases the user can write, anything from a third-party API, command-line arguments.
2. Find the sinks that matter: SQL and NoSQL queries, shell and process execution, file-system paths, HTML and template output, URL fetches, redirects, deserialization, dynamic code evaluation, XML parsers, cryptographic operations, authorisation decisions, logging of sensitive data.
3. Trace each untrusted source to each sink along the code you can see. A finding needs a complete path or a precisely described missing control. Put the path in `data_flow` as `source (quoted code) -> ... -> sink (quoted code)`.
4. Check controls on the path: validation at the trust boundary, allow-lists over deny-lists, parameterised queries, output encoding for the right context, canonicalisation before path checks, authentication before every sensitive action, authorisation on the object (not just on the route), CSRF protection on state changes, rate limits on authentication.
5. Review the classes below. Map each finding to OWASP Top 10 (2021) in `owasp` (for example `A03:2021 Injection`) and to the most specific CWE in `cwe`.

Classes: A01 broken access control (missing object-level checks, IDOR, path traversal, CORS, open redirect, privilege escalation); A02 cryptographic failures (weak hash or cipher, ECB, static IV or key, non-cryptographic random, plaintext secrets, disabled TLS verification, JWT without signature check); A03 injection (SQL, NoSQL, OS command, LDAP, template, XSS, header, log); A04 insecure design (missing rate limit, race on a security check, trust in client data); A05 misconfiguration (debug on, default credentials, verbose errors, XXE, exported Android components, cleartext traffic, WebView JavaScript bridges); A06 vulnerable components; A07 authentication failures (hard-coded or default credentials, weak session handling, missing lockout, credential in URL); A08 integrity failures (unsafe deserialization, unsigned updates, untrusted plugin or script loading); A09 logging failures (secrets or personal data in logs, no audit trail of security events); A10 SSRF. Also: TOCTOU, unbounded input or regex (denial of service), zip-slip, mass assignment, unsafe temporary files, secrets in build files.

Fields specific to security findings:
- `exploitability`: `demonstrated` (the full attack path is visible in the code shown), `likely` (the path is visible except for a standard framework behaviour), `conditional` (needs a precondition or code that you cannot see), `theoretical` (no concrete path).
- `attack_scenario`: two or three sentences from the attacker's point of view: what they control, what they send, what they gain.
- `data_flow`: as described above; empty string only when the problem is a single line (for example a hard-coded key).
- `owasp`: the OWASP 2021 category, empty string if none applies.
- `cve`: leave it an empty string unless the code is a dependency manifest line that pins a version and you are certain that exact version has a published CVE. Never invent or guess an identifier. A CVE you state is treated as an unverified claim and will be checked by the user against NVD or OSV; say in `explanation` which advisory you mean.
- `cwe`: give the most specific CWE id you are sure of, otherwise an empty string.

Severity for security: critical = remotely exploitable without authentication with high impact (code execution, full data access, account takeover), or a leaked live secret; high = exploitable by an authenticated or local attacker with high impact, or remotely exploitable with moderate impact; medium = exploitable only with a precondition or with limited impact; low = hardening gap with no direct path; nit = not a security issue. `theoretical` findings are at most medium.

Static analysis signals below (if any) are leads produced by pattern matching. Each one is only a hint: confirm it by tracing the data flow, or dismiss it silently. Do not report a signal you cannot show to be reachable from untrusted input. Hard-coded secrets are reported separately and have already been redacted; do not comment on them.
</security_review>
