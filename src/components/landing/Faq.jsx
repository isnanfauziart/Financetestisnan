export default function Faq({ items }) {
  return (
    <section className="chapter faq" id="faq" aria-labelledby="faq-title">
      <div className="chapter-heading" data-reveal="">
        <p className="eyebrow">Masih ragu?</p>
        <h2 id="faq-title">Pertanyaan yang sering ditanyakan.</h2>
      </div>

      <div className="faq-list" data-reveal-group="">
        {items.map(({ id, question, answer }) => (
          <details key={id} name="artami-faq">
            <summary>{question}</summary>
            <div className="faq-answer">
              <p>{answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}