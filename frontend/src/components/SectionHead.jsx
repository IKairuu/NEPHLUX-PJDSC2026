export default function SectionHead({ eyebrow, id, title, text, children }) {
  return (
    <header className="sh reveal">
      <div className="eyebrow">{eyebrow}</div>
      <h2 id={id}>{title}</h2>
      {text && <p>{text}</p>}
      {children}
    </header>
  )
}
