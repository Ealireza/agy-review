## Security review rule (agy-review)

After you write or change code that touches any of: request data, file paths or uploads, shell or process execution, SQL/NoSQL, HTML or templates, URLs/redirects/outbound requests, deserialization, authentication, authorisation, secrets, cryptography, or Android components/WebViews:

1. Before you report the task as finished, run the `agy-security` skill (or `/agy-review:security`) on every new or changed function, e.g. `--security --symbol <name> --context "<what is untrusted and who calls it>" --fail-on high --format json --output /tmp/sec.json`.
2. Fix every P0 and P1 finding whose confidence is high, then re-run with `--previous`. Stop after at most 5 rounds.
3. Treat exit code 4 (inconclusive) as "not passed": narrow the scope or use another `--model`.
4. In your final message list what was reviewed, what was fixed, what is left (P2/P3, signals you could not confirm), and say plainly that this is a model-assisted review, not a guarantee.
5. Never paste secrets into prompts; never treat a `cve` in a report as verified.
