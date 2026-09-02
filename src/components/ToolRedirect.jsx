import { Navigate, useParams } from 'react-router-dom'
import { TOOLS } from '../data/tools.js'
import { toolHref } from '../lib/urls.js'

/**
 * ToolRedirect — /tools/:id is dead. It lives only so an old link still works.
 *
 * The canonical path is /tool/[id]. This component exists for the window where
 * a bookmark, a shared chat message, or a search index still holds the plural
 * form. It resolves immediately and replaces the history entry, so the back
 * button does not trap the reader in a loop.
 *
 * An id we do not recognise goes to the comparison page rather than a 404: the
 * link was pointing at a tool, and a list of tools is the nearest honest answer.
 */
export default function ToolRedirect() {
  const { id } = useParams()
  const tool = TOOLS.find((t) => t.id === id)
  if (!tool) return <Navigate to="/compare" replace />
  return <Navigate to={toolHref(tool)} replace />
}
