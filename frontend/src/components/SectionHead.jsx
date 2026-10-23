export default function SectionHead({ eyebrow, id, title, text }) {
  return (
    <div className="sh reveal">
      <div><div className="eyebrow">{eyebrow}</div><h2 id={id}>{title}</h2></div>
      {text && <p>{text}</p>}
    </div>
  )
}
