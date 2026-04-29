import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tgpbthntkrwhslkhfqak.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STREAMLINE_TOKEN = process.env.STREAMLINE_TOKEN;
const STREAMLINE_BASE = 'https://admin.streamlinevrs.com/api/v1';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  // Security check - only allow cron or manual trigger with secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get check-ins for next 14 days from Streamline
    const today = new Date();
    const twoWeeks = new Date();
    twoWeeks.setDate(today.getDate() + 14);

    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = twoWeeks.toISOString().split('T')[0];

    const streamlineRes = await fetch(
      `${STREAMLINE_BASE}/reservations?check_in_from=${dateFrom}&check_in_to=${dateTo}&status=confirmed`,
      {
        headers: {
          'X-API-Token': STREAMLINE_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!streamlineRes.ok) {
      throw new Error(`Streamline API error: ${streamlineRes.status}`);
    }

    const data = await streamlineRes.json();
    const reservations = data.reservations || data.data || data || [];

    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of reservations) {
      try {
        // Extract fields - adjust field names based on Streamline's actual response
        const resNumber = String(r.id || r.reservation_id || r.confirmation_number || '');
        const lastName = (r.guest_last_name || r.last_name || r.guest?.last_name || '').trim();
        const guestName = (r.guest_name || `${r.guest_first_name || ''} ${r.guest_last_name || ''}`.trim() || r.guest?.name || '').trim();
        const cabinName = (r.unit_name || r.property_name || r.home_name || r.unit?.name || '').trim();
        const checkIn = r.check_in || r.arrival || r.check_in_date || null;
        const checkOut = r.check_out || r.departure || r.check_out_date || null;

        if (!resNumber || !lastName) {
          skipped++;
          continue;
        }

        // Upsert - add if not exists, skip if already there
        const { error } = await sb.from('reservations').upsert({
          reservation_number: resNumber,
          last_name: lastName.toLowerCase(),
          guest_name: guestName,
          cabin_name: cabinName,
          check_in: checkIn,
          check_out: checkOut
        }, {
          onConflict: 'reservation_number',
          ignoreDuplicates: true
        });

        if (error) {
          console.error('Error upserting reservation:', resNumber, error);
          errors++;
        } else {
          added++;
        }
      } catch (e) {
        console.error('Error processing reservation:', e);
        errors++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sync complete`,
      stats: { total: reservations.length, added, skipped, errors },
      dateRange: { from: dateFrom, to: dateTo }
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: error.message });
  }
}
