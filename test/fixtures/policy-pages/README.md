# Synthetic policy pages

These are **invented pages written to test the observer**. They are not real
policies, they describe no real company, and they are never used as data.

They exist so `scripts/check-policy-hashes.mjs` can be exercised without
depending on anyone's website being up — see `scripts/check-observer.mjs`,
which runs the observer against them and asserts what it should conclude.

Named `<toolId>__<n>.html`, where `n` is the position of the source in that
tool's `policy_sources` array. A fixture run is flagged `origin: 'fixture'` and
`--save` refuses to write, so a test can never overwrite real observations.
