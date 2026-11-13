const L = require('./_lib'), { E } = L, crypto = require('crypto');
const st = (m, p, body, ct) => fetch(E.SUPABASE_URL + '/storage/v1/object/photos/' + p, { method: m, headers: { apikey: E.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + E.SUPABASE_SERVICE_KEY, ...(ct ? { 'Content-Type': ct } : {}) }, body });
const CATS = ['pool', 'outdoor', 'inside', 'kids'];
module.exports = async (req, res) => {
  const b = req.body || {}, a = b.a;
  if (a == 'login') {
    if (L.same((b.email || '').toLowerCase(), (E.ADMIN_EMAIL || '').toLowerCase()) && L.same(b.password || '', E.ADMIN_PASSWORD || '')) return L.send(res, 200, { token: L.sign(Date.now() + 12 * 3600e3) });
    return L.send(res, 401, { error: 'bad' });
  }
  if (!L.authed(req)) return L.send(res, 401, { error: 'auth' });
  const up = (id, o) => L.sb('bookings?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(o) });
  const pp = (id, o) => L.sb('photos?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(o) });
  if (a == 'list') { await require('./_sync')(); await L.expire(); const r = await L.sb('bookings?select=*&order=created_at.desc&limit=1000'); const ph = await L.sb('photos?select=*&order=pos.asc'); return L.send(res, 200, { rows: r.data, pricing: await L.pricing(), photos: Array.isArray(ph.data) ? ph.data : [] }) }
  if (a == 'block') { const r = await L.sb('bookings', { method: 'POST', body: JSON.stringify({ status: 'blocked', check_in: b.f, check_out: L.add(b.t, 1), note: b.note || '' }) }); return L.send(res, r.ok ? 200 : 409, { ok: r.ok }) }
  if (a == 'cancel') { await up(b.id, { status: 'cancelled' }); return L.send(res, 200, { ok: 1 }) }
  if (a == 'price') { const p = b.p; await L.sb('settings?key=eq.pricing', { method: 'PATCH', body: JSON.stringify({ value: { w: +p.w, we: +p.we, deposit: 0, hold_min: +p.hold_min || 20, seasons: p.seasons || [] } }) }); return L.send(res, 200, { ok: 1 }) }
  if (a == 'photo_add') {
    if (!/^[A-Za-z0-9+/=]+$/.test(b.data || '') || b.data.length > 3e6) return L.send(res, 400, { error: 'size' });
    const path = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + '.jpg';
    const u = await st('POST', path, Buffer.from(b.data, 'base64'), 'image/jpeg');
    if (!u.ok) return L.send(res, 502, { error: (await u.text()).slice(0, 200) });
    const last = await L.sb('photos?select=pos&order=pos.desc&limit=1'), pos = ((last.data && last.data[0] && last.data[0].pos) || 0) + 1;
    const r = await L.sb('photos', { method: 'POST', body: JSON.stringify({ url: E.SUPABASE_URL + '/storage/v1/object/public/photos/' + path, path, cat: CATS.includes(b.cat) ? b.cat : 'outdoor', pos }) });
    return L.send(res, r.ok ? 200 : 500, { ok: r.ok });
  }
  if (a == 'photo_del') { const g = (await L.sb('photos?id=eq.' + encodeURIComponent(b.id) + '&select=path')).data[0]; if (g) { await st('DELETE', g.path); await L.sb('photos?id=eq.' + encodeURIComponent(b.id), { method: 'DELETE' }) } return L.send(res, 200, { ok: 1 }) }
  if (a == 'photo_cat') { if (CATS.includes(b.cat)) await pp(b.id, { cat: b.cat }); return L.send(res, 200, { ok: 1 }) }
  if (a == 'photo_move') {
    const ps = (await L.sb('photos?select=id,pos&order=pos.asc')).data, i = ps.findIndex(p => p.id == b.id), j = b.dir == 'up' ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < ps.length) { await pp(ps[i].id, { pos: ps[j].pos }); await pp(ps[j].id, { pos: ps[i].pos }) }
    return L.send(res, 200, { ok: 1 });
  }
  L.send(res, 400, { error: 'unknown' });
};
