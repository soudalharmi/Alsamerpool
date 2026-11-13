const crypto = require('crypto'), E = process.env;
const sb = async (p, o = {}) => {
  const r = await fetch(E.SUPABASE_URL + '/rest/v1/' + p, { ...o, headers: { apikey: E.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + E.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(o.headers || {}) } });
  const t = await r.text(); let d; try { d = JSON.parse(t) } catch (e) { d = t } return { ok: r.ok, data: d };
};
const zi = async (p, b) => {
  const r = await fetch('https://api-v2.ziina.com/api' + p, { method: b ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + E.ZIINA_TOKEN, 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
};
const add = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) };
const today = () => new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10); // UAE time
const dow = d => new Date(d + 'T00:00:00Z').getUTCDay();
const pricing = async () => (await sb('settings?key=eq.pricing&select=value')).data[0].value;
const quote = (p, i, o) => {
  const n = []; for (let d = i; d < o && n.length < 60; d = add(d, 1)) n.push(d);
  if (!n.length || (n.some(d => dow(d) == 5 || dow(d) == 6) && n.length < 2)) return { err: 'min' };
  const rent = n.reduce((s, d) => { const x = (p.seasons || []).find(z => d >= z.f && d <= z.t); return s + (x ? x.p : (dow(d) == 5 || dow(d) == 6 ? p.we : p.w)) }, 0);
  return { rent, deposit: 0, total: rent };
};
const send = (r, c, o) => { r.statusCode = c; r.setHeader('Content-Type', 'application/json'); r.end(JSON.stringify(o)) };
const expire = () => sb('bookings?status=eq.pending&expires_at=lt.' + new Date().toISOString(), { method: 'PATCH', body: JSON.stringify({ status: 'expired' }) });
const sign = e => e + '.' + crypto.createHmac('sha256', E.ADMIN_SECRET).update(String(e)).digest('hex');
const authed = req => { const t = (req.headers.authorization || '').replace('Bearer ', ''); const [e] = t.split('.'); return +e > Date.now() && t === sign(e) };
const h = s => crypto.createHash('sha256').update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(h(a), h(b));
module.exports = { E, sb, zi, add, today, pricing, quote, send, expire, sign, authed, same };
