import './ReviewPhone.css'

const METRICS = [
  { label: 'Service', value: 'Thoughtful', score: 0.9 },
  { label: 'Quality', value: 'Excellent', score: 0.95 },
  { label: 'Overall experience', value: 'Great', score: 0.88 },
]

export default function ReviewPhone() {
  return (
    <div className="phone">
      <div className="phone__frame">
        <div className="phone__island" />
        <div className="phone__screen">
          <div className="rp">
            <div className="rp__head">
              <img src="/assets/revora-logo.png" alt="REVORA" width="900" height="183" />
              <span>PRIVATE FEEDBACK</span>
            </div>
            <div className="rp__intro">
              <p>How was your experience?</p>
              <span>Three quick questions. Your answers stay private.</span>
            </div>
            <div className="rp__cards">
              {METRICS.map((metric) => (
                <div className="rp__card" key={metric.label}>
                  <div className="rp__cardTop">
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                  <div className="rp__rail"><i style={{ width: `${metric.score * 100}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="rp__draft">
              <span>EXAMPLE DRAFT</span>
              <p>“A polished experience from start to finish. The team was thoughtful and the quality really stood out.”</p>
              <small>Edit it. Make it yours. Share only if you want to.</small>
            </div>
            <div className="rp__cta">Continue</div>
          </div>
        </div>
      </div>
    </div>
  )
}
