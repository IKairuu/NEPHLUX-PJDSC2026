// className="" gives a bare svg, sized by its parent (.icon-btn svg, .chip svg, ...)
export default function Icon({ name, className = 'ic', style }) {
  return (
    <svg className={className || undefined} style={style} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  )
}

export function BrandMark({ className }) {
  return <span className={className ? `mark ${className}` : 'mark'}><svg><use href="#i-logo" /></svg></span>
}
