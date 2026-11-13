const L = require('./_lib');
module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '');
  if (!/^[0-9a-f-]{36}$/.test(id)) return L.send(res, 400, {});
  await require('./_sync')();
  const r = await L.sb('bookings?id=eq.' + id + '&select=ref,status,name,check_in,check_out,total');
  const b = r.ok && r.data[0];
  L.send(res, b ? 200 : 404, b || {});
};
