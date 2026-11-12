const L = require('./_lib');
module.exports = async (req, res) => {
  await L.expire();
  const r = await L.sb('bookings?status=in.(pending,paid,blocked,completed)&check_out=gte.' + L.today() + '&select=check_in,check_out');
  L.send(res, 200, { busy: (r.data || []).map(b => [b.check_in, b.check_out]), pricing: await L.pricing() });
};
