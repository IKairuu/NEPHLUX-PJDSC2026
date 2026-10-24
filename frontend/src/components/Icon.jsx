// className="" gives a bare svg, sized by its parent (.icon-btn svg, .chip svg, ...)
export default function Icon({ name, className = 'ic', style }) {
  return (
    <svg className={className || undefined} style={style} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  )
}

// the N mark from assets/logo plus the NEPH·LUX wordmark
export function BrandMark({ className }) {
  return (
    <>
      <img className={className ? `mark ${className}` : 'mark'} src="/logo/icon-192.png" alt="" width="30" height="30" />
      <span className="wm">NEPH<b>LUX</b></span>
    </>
  )
}
