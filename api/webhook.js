const L = require('./_lib');
// Ziina calls this on payment_intent.status.updated. We never trust the payload: we re-fetch the payment from Ziina.
module.exports = async (req, res) => {
  const b = req.body || {}, id = (b.data && b.data.id) || b.payment_intent_id || b.id;
  if (!id) return L.send(res, 200, { ok: 1 });
  const z = await L.zi('/payment_intent/' + encodeURIComponent(id));
  if (!z.ok) return L.send(res, 502, {});
  const f = 'bookings?ziina_id=eq.' + encodeURIComponent(id), s = z.data.status;
  if (s == 'completed') {
    const r = await L.sb(f + '&status=in.(pending,expired)', { method: 'PATCH', body: JSON.stringify({ status: 'paid', expires_at: null }) });
    if (!r.ok) await L.sb(f, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled', note: 'PAID BUT DATES TAKEN - REFUND CUSTOMER' }) });
  } else if (s == 'failed' || s == 'canceled') await L.sb(f + '&status=eq.pending', { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) });
  L.send(res, 200, { ok: 1 });
};
