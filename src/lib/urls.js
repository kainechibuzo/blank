/**
 * urls.js — one place that knows what a tool's URL is.
 *
 * The canonical tool path is /tool/[id]. There is no separate slug field in the
 * schema; the id is the URL segment, and the two are the same string for all
 * twenty tools. If a slug is ever added, it changes here and nowhere else.
 *
 * This file exists because /tool/ and /tools/ coexisted for a while, and every
 * page that links to a tool had the URL written into it by hand. Parallel paths
 * drift. Now a page that wants a tool link asks for one.
 */
export const toolHref = (tool) => `/tool/${tool.id}`
