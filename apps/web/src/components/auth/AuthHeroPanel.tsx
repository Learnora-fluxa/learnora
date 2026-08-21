type Props = { compact?: boolean }

export default function AuthHeroPanel({ compact = false }: Props) {
  return (
    <div
      className={`
        relative flex flex-col justify-between overflow-hidden rounded-card
        ${compact ? 'h-48 p-8' : 'h-52 lg:h-full lg:min-h-screen p-8 lg:p-14'}
      `}
      style={{
        background:
          'linear-gradient(218deg, #00ccff 28%, #00c8b3 62%, #0088ff 77%, #ffffff 100%)',
      }}
    >
      {/* Wordmark */}
      <span className="text-xl font-bold text-white tracking-tight">Learnora</span>

      {/* Bottom copy — hidden in compact mode on very small viewports */}
      <div className={compact ? 'hidden sm:block' : ''}>
        <h2
          className={`font-bold text-white leading-tight mb-3 ${
            compact ? 'text-2xl' : 'text-2xl lg:text-4xl'
          }`}
        >
          Learning Without
          <br />
          Limits
        </h2>
        <p
          className={`font-semibold text-white leading-relaxed ${
            compact ? 'text-sm' : 'text-sm lg:text-base'
          } max-w-[400px]`}
        >
          Smart learning tools designed to help you grow, achieve and succeed
        </p>
      </div>
    </div>
  )
}
