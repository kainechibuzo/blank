#!/usr/bin/env node
/**
 * traceability-check.mjs — runs the project's hard rules as assertions.
 * Wire this into CI. If a rule is worth writing down, it is worth failing a
 * build over.
 */

import { runTraceabilityChecks } from '../src/lib/traceability.js'
import { runSourceChecks } from './lib/traceability-source.js'

const checks = [...runTraceabilityChecks(), ...(await runSourceChecks())]
let failed = 0

for (const c of checks) {
  if (!c.pass) failed++
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}`)
  console.log(`      ${c.detail}`)
}

console.log(`\n${checks.length - failed}/${checks.length} checks passed`)

if (failed) {
  console.error('\nHard rules are being violated. Fix before shipping.')
  process.exit(1)
}
