const L = require('./_lib'), { E } = L;
module.exports = async (req, res) => {
  if (!E.ADMIN_SECRET || !L.same((req.query && req.query.key) || '', E.ADMIN_SECRET)) return L.send(res, 401, { error: 'auth' });
  const z = await L.zi('/webhook', { url: E.SITE_URL + '/api/webhook', secret: E.ADMIN_SECRET });
  L.send(res, z.ok ? 200 : 502, z.data);
};
