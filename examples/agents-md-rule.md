## Security review rule (agy-review)

After you write or change code that touches request data, file paths, shell/process execution, SQL, HTML/templates, URLs or outbound requests, deserialization, authentication, authorisation, secrets, cryptography, or Android components:

- Run the `agy-review:security` skill on each new or changed function with `--security --symbol <name> --context "<what is untrusted and who calls it>" --fail-on high --format json --output sec.json`.
- Fix every P0/P1 finding with high confidence, then re-run with `--previous sec.json`. At most 5 rounds.
- Exit code 4 means inconclusive: it is not a pass. Narrow the scope or change `--model`.
- In your final answer list what was reviewed, fixed and left open, and state that this is a model-assisted review, not a guarantee. A `cve` in a report is unverified.
