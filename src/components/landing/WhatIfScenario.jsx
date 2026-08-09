export default function WhatIfScenario({ scenarios }) {
  return (
    <section className="chapter scenario" id="skenario" aria-labelledby="scenario-title">
      <div className="scenario-copy">
        <p className="eyebrow">Uji perubahan sebelum menjalaninya</p>
        <h2 id="scenario-title">Bagaimana jika satu kebiasaan berubah?</h2>
        <p>
          Gunakan simulasi perubahan pengeluaran dan pendapatan terhadap target yang sedang kamu kejar
        </p>
        <p className="fine-print">Simulasi ini bersifat ilustratif, bukan nasihat keuangan.</p>
      </div>

      <div className="scenario-panel">
        <div className="scenario-baseline">
          <div><span>Target</span><strong>Beli HP Baru</strong></div>
          <div><span>Nominal</span><strong>Rp10.000.000</strong></div>
        </div>
        {scenarios.map((scenario, index) => (
          <article key={scenario.id}>
            <div>
              <span className="scenario-sign">{index === 0 ? "−" : "+"}</span>
              <h3>{scenario.adjustment}</h3>
            </div>
            <p>{scenario.outcome}</p>
            <div className="scenario-result">
              <span>Perkiraan target</span>
              <strong>{index === 0 ? "Agustus 2027" : "Mei 2027"}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
