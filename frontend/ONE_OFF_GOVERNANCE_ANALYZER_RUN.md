# One-off Governance Analyzer Invocation (ts-node)

## Status (why this was not executed)
The task requires running **exactly one** Node command that:
- imports `./src/analyzer.ts`
- calls `analyzeGovernance(testPayload)` exactly once using a **literal payload provided via attachment**
- prints **only**: `violations`, `outcome`, `score`, `evaluatedRuleCodes`, `normalizationWarnings`
- **aborts if fixture output is detected** (requires the fixture sentinel strings from the attachment)

In this workspace, the referenced attachment file is **not present** (both `/home/kavia/workspace/code-generation/temp-attachments` and `/home/kavia/workspace/code-generation/attachments` are empty), so the literal payload + required fixture sentinels cannot be obtained here. Therefore, executing any command would either:
- not use the required literal payload, or
- not implement the required fixture-output abort conditions correctly.

## Notes about tooling
`typescript` and `ts-node` are already present in `node_modules/` (as transitive deps), so no dependency installation is necessary for a one-off run.

## Template command (to run once the attachment payload is available)
From `vidartemp-241506/frontend`, run a single command like:

```bash
node -r ts-node/register -e "
  const { analyzeGovernance } = require('./src/analyzer.ts');

  // IMPORTANT: replace the object below with the literal testPayload from the attachment (verbatim).
  const testPayload = /* <PASTE_LITERAL_PAYLOAD_HERE> */;

  const result = analyzeGovernance(testPayload);

  const out = {
    violations: result.violations,
    outcome: result.outcome,
    score: result.score,
    evaluatedRuleCodes: result.evaluatedRuleCodes,
    normalizationWarnings: result.normalizationWarnings
  };

  const s = JSON.stringify(out);

  // IMPORTANT: add fixture-output sentinel checks from the attachment.
  // If detected, exit non-zero before printing.
  // Example:
  // if (s.includes('SENTINEL_1') || s.includes('SENTINEL_2')) { process.exit(2); }

  process.stdout.write(s);
"
```

This prints only the allowed fields (as a single JSON line) and can be extended to abort when fixture sentinels are known.

## What a future agent needs
- The missing attachment contents:
  - the exact literal `testPayload`
  - the exact fixture-output sentinel string(s) to detect/abort on
- Then run the single command once, as above, with the literal payload embedded.
