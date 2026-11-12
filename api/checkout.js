const L = require('./_lib'), { E } = L;
module.exports = async (req, res) => {
  if (req.method !== 'POST') return L.send(res, 405, {});
  const { name, phone, guests, i, o } = req.body || {}, D = /^\d{4}-\d\d-\d\d$/;
  if (!name || !phone || !D.test(i) || !D.test(o) || i < L.today()) return L.send(res, 400, { error: 'need' });
  const p = await L.pricing(), q = L.quote(p, i, o);
  if (q.err) return L.send(res, 400, { error: q.err });
  await L.expire();
  const exp = new Date(Date.now() + (p.hold_min || 20) * 60000);
  const ins = await L.sb('bookings', { method: 'POST', body: JSON.stringify({ name: String(name).slice(0, 80), phone: String(phone).slice(0, 30), guests: Math.max(1, +guests || 1), check_in: i, check_out: o, rent: q.rent, deposit: q.deposit, total: q.total, expires_at: exp }) });
  if (!ins.ok) return L.send(res, 409, { error: 'na' }); // dates taken (database blocks overlaps)
  const b = ins.data[0];
  const z = await L.zi('/payment_intent', { amount: q.total * 100, currency_code: 'AED', message: 'Al Samer Pool ' + i + ' to ' + o, success_url: E.SITE_URL + '/?paid=' + b.id, cancel_url: E.SITE_URL + '/?cancelled=1', failure_url: E.SITE_URL + '/?cancelled=1', expiry: String(exp.getTime()), test: E.ZIINA_TEST !== 'false' });
  if (!z.ok || !z.data.redirect_url) { await L.sb('bookings?id=eq.' + b.id, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }); return L.send(res, 502, { error: 'na' }) }
  await L.sb('bookings?id=eq.' + b.id, { method: 'PATCH', body: JSON.stringify({ ziina_id: z.data.id }) });
  L.send(res, 200, { url: z.data.redirect_url });
};
