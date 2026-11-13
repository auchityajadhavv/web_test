const METRICS = [
  { label: 'Service', key: 'service', value: 4 },
  { label: 'Quality', key: 'quality', value: 4 },
  { label: 'Overall experience', key: 'overall', value: 5 },
]
const WORDS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent']
const state = Object.fromEntries(METRICS.map((metric) => [metric.key, metric.value]))
const cards = document.getElementById('cards')

for (const metric of METRICS) {
  const card = document.createElement('div')
  card.className = 'card'
  card.innerHTML = `<div class="card__top"><span>${metric.label}</span><strong>${WORDS[metric.value - 1]}</strong></div><input type="range" min="1" max="5" step="1" value="${metric.value}" aria-label="${metric.label}">`
  const input = card.querySelector('input')
  const word = card.querySelector('strong')
  input.addEventListener('input', () => {
    state[metric.key] = Number(input.value)
    word.textContent = WORDS[state[metric.key] - 1]
  })
  cards.append(card)
}

const average = () => Object.values(state).reduce((sum, value) => sum + value, 0) / METRICS.length
function draft() {
  const notes = document.getElementById('notes').value.trim().replace(/[.\s]+$/, '')
  const score = average()
  let text = score >= 4.5
    ? 'A polished experience from start to finish. The team was thoughtful, the quality stood out, and everything felt easy.'
    : score >= 3
      ? 'A good experience overall. The team was helpful and the quality was solid, with a few details that could be improved.'
      : 'There were a few issues during my experience. I hope the team can use this feedback to make the next visit better.'
  if (notes) text += ` ${notes}.`
  return text
}

const step1 = document.getElementById('step1')
const step2 = document.getElementById('step2')
const reviewText = document.getElementById('reviewText')

document.getElementById('continue').addEventListener('click', () => {
  document.getElementById('chips').innerHTML = METRICS.map((metric) => `<span class="chip">${metric.label} · <b>${WORDS[state[metric.key] - 1]}</b></span>`).join('')
  reviewText.value = draft()
  step1.hidden = true
  step2.hidden = false
  document.querySelector('.stage').scrollTo({ top: 0 })
})
document.getElementById('back').addEventListener('click', () => { step2.hidden = true; step1.hidden = false })
document.getElementById('post').addEventListener('click', async (event) => {
  let copied = false
  try { await navigator.clipboard.writeText(reviewText.value); copied = true } catch { reviewText.select(); copied = document.execCommand('copy') }
  event.currentTarget.textContent = copied ? 'Example copied—nothing posted' : 'Copy unavailable'
})
document.getElementById('skip').addEventListener('click', (event) => {
  event.currentTarget.textContent = 'Demo complete—nothing sent'
  event.currentTarget.disabled = true
})
