const L = require('./_lib'), { E } = L, crypto = require('crypto');
module.exports = async (req, res) => {
  const b = req.body || {}, a = b.a;
  if (a == 'login') {
    if (L.same((b.email || '').toLowerCase(), (E.ADMIN_EMAIL || '').toLowerCase()) && L.same(b.password || '', E.ADMIN_PASSWORD || '')) return L.send(res, 200, { token: L.sign(Date.now() + 12 * 3600e3) });
    return L.send(res, 401, { error: 'bad' });
  }
  if (!L.authed(req)) return L.send(res, 401, { error: 'auth' });
  const up = (id, o) => L.sb('bookings?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(o) });
  if (a == 'list') { await L.expire(); const r = await L.sb('bookings?select=*&order=created_at.desc&limit=200'); return L.send(res, 200, { rows: r.data, pricing: await L.pricing() }) }
  if (a == 'block') { const r = await L.sb('bookings', { method: 'POST', body: JSON.stringify({ status: 'blocked', check_in: b.f, check_out: L.add(b.t, 1), note: b.note || '' }) }); return L.send(res, r.ok ? 200 : 409, { ok: r.ok }) }
  if (a == 'cancel') { await up(b.id, { status: 'cancelled' }); return L.send(res, 200, { ok: 1 }) } // also unblocks blocked dates
  if (a == 'refund') { // returns the security deposit after check-out
    const g = (await L.sb('bookings?id=eq.' + encodeURIComponent(b.id) + '&select=*')).data[0];
    if (!g || g.status != 'paid' || !g.ziina_id) return L.send(res, 400, { error: 'not paid' });
    const z = await L.zi('/refund', { id: crypto.randomUUID(), payment_intent_id: g.ziina_id, amount: g.deposit * 100, currency_code: 'AED', test: E.ZIINA_TEST !== 'false' });
    if (!z.ok) return L.send(res, 502, { error: JSON.stringify(z.data) });
    await up(b.id, { status: 'completed', deposit_refund: z.data.id || 'ok' }); return L.send(res, 200, { ok: 1 });
  }
  if (a == 'price') { const p = b.p; await L.sb('settings?key=eq.pricing', { method: 'PATCH', body: JSON.stringify({ value: { w: +p.w, we: +p.we, deposit: +p.deposit, hold_min: +p.hold_min || 20, seasons: p.seasons || [] } }) }); return L.send(res, 200, { ok: 1 }) }
  L.send(res, 400, { error: 'unknown' });
};
