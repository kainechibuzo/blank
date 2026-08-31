// Re-export so the Edge Function and the weekly cron script share one
// definition of "verified" and cannot drift apart.
//
// The canonical implementation lives with the app code; this file exists only
// because `supabase functions deploy` bundles the functions directory.
//
// If your deploy cannot resolve a path outside supabase/functions, replace this
// file with a copy instead:
//   cp src/lib/snippet.js supabase/functions/_shared/snippet.js
// and keep the two in sync (or better, run `supabase db push` from the repo
// root, where the relative import resolves and gets bundled).
export * from '../../../src/lib/snippet.js'
