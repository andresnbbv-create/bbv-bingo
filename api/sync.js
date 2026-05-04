const SUPABASE_URL = 'https://tgpbthntkrwhslkhfqak.supabase.co';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const STREAMLINE_TOKEN = process.env.STREAMLINE_TOKEN;

  try {
    const today = new Date();
    const twoWeeks = new Date();
    twoWeeks.setDate(today.getDate() + 14);
    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = twoWeeks.toISOString().split('T')[0];

    const streamlineRes = await fetch(
      `https://admin.streamlinevrs.com/api/v1/reservations?check_in_from=${dateFrom}&check_in_to=${dateTo}`,
      { headers: { 'X-API-Token': STREAMLINE_TOKEN, 'Accept': 'application/json' } }
    );

    const raw = await streamlineRes.text();
    let reservations = [];
    try {
      const data = JSON.parse(raw);
      reservations = data.reservations || data.data || data.results || (Array.isArray(data) ? data : []);
    } catch (e) {
      return res.status(200).json({ success: false, message: 'Could not parse Streamline response', raw: raw.substring(0, 500) });
    }

    let added = 0, skipped = 0, errors = 0;
    for (const r of reservations) {
      try {
        const resNumber = String(r.id || r.reservation_id || r.confirmation_number || r.res_id || '');
        const lastName = (r.guest_last_name || r.last_name || (r.guest && r.guest.last_name) || '').trim();
        const guestName = (r.guest_name || `${r.guest_first_name || ''} ${r.guest_last_name || ''}`.trim() || '').trim();
        const cabinName = (r.unit_name || r.property_name || r.home_name || '').trim();
        const checkIn = r.check_in || r.arrival || r.check_in_date || null;
        const checkOut = r.check_out || r.departure || r.check_out_date || null;
        if (!resNumber || !lastName) { skipped++; continue; }
        const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/reservations`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates,return=minimal'
          },
          body: JSON.stringify({ reservation_number: resNumber, last_name: lastName.toLowerCase(), guest_name: guestName, cabin_name: cabinName, check_in: checkIn, check_out: checkOut })
        });
        if (upsertRes.ok) { added++; } else { errors++; }
      } catch (e) { errors++; }
    }
    return res.status(200).json({ success: true, stats: { total: reservations.length, added, skipped, errors }, dateRange: { from: dateFrom, to: dateTo } });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
