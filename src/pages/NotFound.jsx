import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="font-mono text-sm text-ink-faint">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">Nothing here</h1>
      <p className="mt-2 text-sm text-ink-soft">
        The page does not exist — which, for a site about accuracy, is at least an honest error.
      </p>
      <Link to="/compare" className="mt-6 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">
        Go to the comparison
      </Link>
    </div>
  )
}
