// Dosypuje do statycznych kart lokali żywe dane z Google (przez Supabase):
// ocenę, liczbę opinii, do 3 cytatów i link do wizytówki.
//
// Karty są w pełni statyczne w HTML (boty AI nie wykonują JS), więc brak
// Supabase niczego nie psuje: strona po prostu nie pokaże oceny i opinii.

(async function () {
  const cards = document.querySelectorAll('[data-venue-slug]');
  if (!cards.length) return;

  let cfg;
  try {
    const r = await fetch('/api/config');
    if (!r.ok) return;
    cfg = await r.json();
  } catch { return; }

  const slugs = [...cards].map(c => c.dataset.venueSlug);
  let venues;
  try {
    const q = `${cfg.url}/rest/v1/venues` +
      `?select=slug,rating,reviews_count,reviews,maps_url` +
      `&slug=in.(${slugs.map(encodeURIComponent).join(',')})`;
    const r = await fetch(q, {
      headers: { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}` }
    });
    if (!r.ok) return;
    venues = await r.json();
  } catch { return; }

  const bySlug = Object.fromEntries(venues.map(v => [v.slug, v]));

  for (const card of cards) {
    const v = bySlug[card.dataset.venueSlug];
    if (!v || v.rating == null) continue;

    const ratingEl = card.querySelector('.venue-rating');
    if (ratingEl) {
      const pct = Math.max(0, Math.min(100, (v.rating / 5) * 100));
      ratingEl.innerHTML =
        `<span class="stars" aria-hidden="true">` +
          `<span class="stars-bg">★★★★★</span>` +
          `<span class="stars-fill" style="width:${pct}%">★★★★★</span>` +
        `</span>` +
        `<span>${v.rating.toFixed(1)}</span>` +
        `<span class="count">(${v.reviews_count ?? 0} Google reviews)</span>`;
    }

    if (v.maps_url) {
      const btn = card.querySelector('.js-maps-link');
      if (btn) btn.href = v.maps_url;
    }

    const reviews = Array.isArray(v.reviews) ? v.reviews.filter(r => r.text) : [];
    const reviewsEl = card.querySelector('.venue-reviews');
    if (reviewsEl && reviews.length) {
      reviewsEl.innerHTML =
        `<div class="src">Reviews from Google</div>` +
        reviews.slice(0, 2).map(r =>
          `<p class="review"><b>${esc(r.author)}</b> ☆ ${r.rating}/5<br>“${esc(r.text)}”</p>`
        ).join('');
      reviewsEl.hidden = false;
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
})();
