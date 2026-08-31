import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TOOLS } from '../data/tools.js'
import { FILTER_BY_ID } from '../data/schema.js'
import { planQuery, answer, explain, signature, openingGreeting, SUGGESTIONS } from '../lib/chat.js'
import { encodeState } from '../lib/filters.js'
import { traceabilitySummary } from '../lib/traceability.js'
import ToolCard from '../components/ToolCard.jsx'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'
import Monogram from '../components/Monogram.jsx'
import Collapsible from '../components/Collapsible.jsx'
import { scoreTool } from '../lib/scoring.js'

function TracePanel({ plan, result, sig }) {
  const href = `/compare?${encodeState({ filters: result.filters, category: result.category, sort: 'score' })}`
  return (
    <Collapsible
      title="Traceability"
      collapseOnDesktop
      defaultOpen
      className="mt-3 text-xs"
      contentClassName="space-y-2"
    >
      <p className="text-ink-soft">
        Produced by <code className="font-mono text-[11px]">rankTools(filters, category, sort:"score")</code> —
        the same function the public comparison page calls. No per-user weighting, no fresh judgement,
        nothing a sponsor could influence.
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-ink-faint">Filters applied:</span>
        {result.filters.length ? (
          result.filters.map((id) => (
            <Pill key={id} tone="accent">
              {FILTER_BY_ID[id]?.label ?? id}
            </Pill>
          ))
        ) : (
          <Pill tone="unknown">none — ranked by score alone</Pill>
        )}
        {result.category && (
          <Pill tone="neutral">category: {Array.isArray(result.category) ? result.category.join(', ') : result.category}</Pill>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link to={href} className="font-medium text-accent underline underline-offset-2">
          Open this exact result set on /compare →
        </Link>
        <span className="font-mono text-[11px] text-ink-faint">set-{sig}</span>
      </div>
    </Collapsible>
  )
}

function ResultsMessage({ plan, result, sig }) {
  return (
    <div>
      {result.relaxed && (
        <Callout variant="warn" className="mb-3" title="Nothing matched every filter">
          No tool satisfies all of that at once. Dropping{' '}
          {result.dropped.map((id) => (FILTER_BY_ID[id]?.label ?? id).toLowerCase()).join(', ') ||
            'the strictest filters'}{' '}
          leaves {result.total}. Dropped filters are named here rather than quietly ignored.
        </Callout>
      )}

      <p className="text-sm text-ink-soft">
        {result.total} tool{result.total === 1 ? '' : 's'} matched. Ranked by the public transparency
        score — the same number shown on{' '}
        <Link to="/compare" className="text-accent underline underline-offset-2">
          /compare
        </Link>
        .
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {result.results.map((tool, i) => {
          const e = explain(tool, result.filters)
          return <ToolCard key={tool.id} tool={tool} rank={i + 1} matched={e.matched} compact />
        })}
      </div>

      <TracePanel plan={plan} result={result} sig={sig} />
    </div>
  )
}

export default function Discover() {
  const [messages, setMessages] = useState([openingGreeting()])
  const [input, setInput] = useState('')
  const [asked, setAsked] = useState([])
  const [answerFilters, setAnswerFilters] = useState([])
  const [answerCategory, setAnswerCategory] = useState(null)
  const [pending, setPending] = useState(null)
  const lastText = useRef('')

  const trace = useMemo(() => traceabilitySummary(), [])

  const runPlan = (text, filters, category, askedNow) => {
    const plan = planQuery(text, {
      askedQuestions: askedNow,
      answerFilters: filters,
      answerCategory: category,
    })

    if (plan.kind === 'ask') {
      setAsked([...askedNow, plan.question.id])
      setPending(plan.question)
      setMessages((m) => [...m, { role: 'assistant', kind: 'question', question: plan.question }])
      return
    }

    setPending(null)
    const result = answer(TOOLS, plan, { limit: 6 })
    const sig = signature(`${text}|${plan.filters.join(',')}|${plan.category ?? ''}`)

    if (plan.empty && result.total === 0 && plan.filters.length === 0) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          kind: 'text',
          text: 'I could not map that onto any tracked field. Try naming the thing that matters — “private”, “free”, “EU”, “for journaling”, “for work” — and I will translate it into filters.',
        },
      ])
      return
    }

    setMessages((m) => [...m, { role: 'assistant', kind: 'results', plan, result, sig }])
  }

  const send = (text) => {
    const clean = text.trim()
    if (!clean) return
    setMessages((m) => [...m, { role: 'user', kind: 'text', text: clean }])
    lastText.current = clean
    setInput('')
    runPlan(clean, answerFilters, answerCategory, asked)
  }

  const chooseOption = (option) => {
    const filters = [...new Set([...answerFilters, ...(option.filters ?? [])])]
    const category = option.category ?? answerCategory
    setAnswerFilters(filters)
    setAnswerCategory(category)
    setMessages((m) => [
      ...m,
      { role: 'user', kind: 'text', text: option.label, viaChip: true },
    ])
    runPlan(`${lastText.current} ${option.label}`, filters, category, asked)
  }

  const reset = () => {
    setMessages([openingGreeting()])
    setAsked([])
    setAnswerFilters([])
    setAnswerCategory(null)
    setPending(null)
    lastText.current = ''
  }

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Discovery</h1>
        <p className="mt-2 text-ink-soft">
          Describe what you need in your own words. This translates your words into the comparison
          filters, then ranks with the same function the comparison page uses.
        </p>
      </header>

      <Callout variant="rule" title="Hard rule, enforced in code">
        Chat recommendations are a personalised <em>view</em> into the public scored data — never an
        independent judgement formed in conversation. There is no language model in the ranking path
        by default: if one is added later, its only permitted job is parsing your words into filters.
        Every answer below links back to the identical result set on{' '}
        <Link to="/compare" className="underline underline-offset-2">
          /compare
        </Link>
        .
      </Callout>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="flex min-h-[420px] flex-col rounded-lg border border-line bg-white">
          <div className="flex-1 space-y-4 p-4">
            {messages.map((m, i) => {
              if (m.role === 'user') {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg rounded-br-sm bg-ink px-3 py-2 text-sm text-white">
                      {m.text}
                    </div>
                  </div>
                )
              }

              return (
                <div key={i} className="flex gap-2">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-accent-soft font-mono text-[10px] font-semibold text-accent-ink">
                    WT
                  </div>
                  <div className="min-w-0 flex-1">
                    {m.kind === 'text' && <p className="text-sm leading-relaxed text-ink-soft">{m.text}</p>}

                    {m.kind === 'question' && (
                      <div>
                        <p className="text-sm text-ink">{m.question.prompt}</p>
                        <p className="mt-0.5 text-xs text-ink-faint">{m.question.helper}</p>
                        {!pending && <p className="mt-2 text-xs text-ink-faint">Answered.</p>}
                      </div>
                    )}

                    {m.kind === 'results' && (
                      <ResultsMessage plan={m.plan} result={m.result} sig={m.sig} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {pending && (
            <div className="flex flex-wrap gap-2 border-t border-line bg-paper px-4 py-3">
              {pending.options.map((o) => (
                <button
                  key={o.id}
                  onClick={() => chooseOption(o)}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-line bg-white px-3.5 py-1.5 text-xs text-ink hover:border-accent hover:text-accent-ink sm:min-h-0 sm:px-3"
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. something private for journaling"
              className="flex-1 rounded-md border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
            />
            <button
              type="submit"
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
            >
              Ask
            </button>
          </form>
        </div>

        <aside className="space-y-4">
          <Collapsible title="Try">
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="flex min-h-[44px] w-full items-center rounded border border-line px-2 py-1.5 text-left text-xs text-ink-soft hover:border-accent hover:text-accent-ink sm:min-h-0"
                >
                  {s}
                </button>
              ))}
            </div>
            <button onClick={reset} className="mt-3 text-xs text-ink-faint underline underline-offset-2">
              Reset conversation
            </button>
          </Collapsible>

          <Collapsible
            title="Rule checks"
            count={trace.passed}
            countLabel={`/${trace.total} passing`}
            hint="Run live against the current dataset. These fail the build if violated."
          >
            <ul className="space-y-1.5">
              {trace.checks.map((c) => (
                <li key={c.name} className="text-[11px] leading-snug">
                  <span className={c.pass ? 'font-semibold text-good' : 'font-semibold text-bad'}>
                    {c.pass ? 'PASS' : 'FAIL'}
                  </span>{' '}
                  <span className="text-ink-soft">{c.name}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-line pt-2 text-[11px] text-ink-faint">
              {trace.passed}/{trace.total} passing
            </p>
          </Collapsible>

          <Callout variant="note" title="Why this is not an LLM free-for-all">
            A model writing recommendations fresh in conversation would create a second ranking
            nobody could audit. The parser above is deterministic: the same words always produce the
            same filters and the same order.
          </Callout>
        </aside>
      </div>

      <Collapsible
        title="Every tool the parser can return"
        count={TOOLS.length}
        hint="The complete candidate set. Nothing outside this list can ever be recommended, because nothing outside it has been scored."
      >
        <div className="flex flex-wrap gap-3">
          {TOOLS.map((t) => (
            <span key={t.id} className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Monogram tool={t} size="sm" />
              <Link to={`/tools/${t.id}`} className="hover:underline">
                {t.name}
              </Link>
              <span className="font-mono text-[10px] text-ink-faint">{scoreTool(t).score}</span>
            </span>
          ))}
        </div>
      </Collapsible>
    </div>
  )
}
