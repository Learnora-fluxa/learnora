type Props = {
  checked:  boolean
  onChange: (val: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, disabled = false, size = 'md' }: Props) {
  const track = size === 'sm' ? 'w-9 h-5'   : 'w-11 h-6'
  const thumb = size === 'sm' ? 'w-4 h-4'   : 'w-5 h-5'
  const onX   = size === 'sm' ? 'left-[18px]' : 'left-[22px]'
  const offX  = 'left-[2px]'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative rounded-full shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${track} ${
        checked ? 'bg-primary' : 'bg-black/15'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute inset-y-[2px] rounded-full bg-white shadow-sm transition-all duration-200 ${thumb} ${
          checked ? onX : offX
        }`}
      />
    </button>
  )
}
