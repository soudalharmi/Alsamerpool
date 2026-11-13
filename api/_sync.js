const L = require('./_lib');
module.exports = async () => {
  const r = await L.sb('bookings?status=in.(pending,expired)&ziina_id=not.is.null&created_at=gte.' + new Date(Date.now() - 864e5).toISOString() + '&select=id,ziina_id');
  for (const b of (Array.isArray(r.data) ? r.data : []).slice(0, 10)) {
    const z = await L.zi('/payment_intent/' + encodeURIComponent(b.ziina_id));
    if (z.ok && z.data.status == 'completed') await L.sb('bookings?id=eq.' + b.id + '&status=in.(pending,expired)', { method: 'PATCH', body: JSON.stringify({ status: 'paid', expires_at: null }) });
  }
};
