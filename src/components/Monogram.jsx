export default function Monogram({ tool, size = 'md' }) {
  const dims = {
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-14 w-14 text-base',
  }[size]

  return (
    <div
      aria-hidden="true"
      className={`${dims} flex shrink-0 items-center justify-center rounded-md font-mono font-semibold tracking-tight text-white`}
      style={{ backgroundColor: tool.accent }}
    >
      {tool.monogram}
    </div>
  )
}
