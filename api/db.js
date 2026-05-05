// BBV Bingo DB Proxy v3.0
const SUPABASE_URL = 'https://tgpbthntkrwhslkhfqak.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncGJ0aG50a3J3aHNsa2hmcWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTAxMzMsImV4cCI6MjA5MzA2NjEzM30.0_ZW2kfxKQUJAVyVOsazJkRfdiaNWWK6y29CzHWxKkI';
const SUPABASE_PUB = 'sb_publishable_2RxOIjVafRZLxTE7RUaryw_fjO4mCXK';
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncGJ0aG50a3J3aHNsa2hmcWFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ5MDEzMywiZXhwIjoyMDkzMDY2MTMzfQ.cSTS5B4JG9DJC6dB5WYJn1DMatMt89yDELK6TZ0wRl8';

export default async function handler(req, res) {
  // CORS headers — allow all origins (server-side proxy is safe)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action, payload } = req.body || {};
    if (!action) return res.status(400).json({ error: 'Missing action' });

    // Use publishable key as apikey (no origin restriction) + service key as bearer (bypasses RLS)
    const headers = {
      'apikey': SUPABASE_PUB,
      'Authorization': `Bearer ${SUPABASE_SERVICE}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    let result = null;

    switch (action) {

      case 'findReservation': {
        const { res_num, last_name } = payload;
        const url = `${SUPABASE_URL}/rest/v1/reservations?reservation_number=eq.${encodeURIComponent(res_num)}&last_name=eq.${encodeURIComponent(last_name)}&select=*&limit=1`;
        const r = await fetch(url, { headers });
        const data = await r.json();
        result = Array.isArray(data) ? data[0] || null : null;
        break;
      }

      case 'findReservationByNumber': {
        const { res_num } = payload;
        const url = `${SUPABASE_URL}/rest/v1/reservations?reservation_number=eq.${encodeURIComponent(res_num)}&select=id&limit=1`;
        const r = await fetch(url, { headers });
        const data = await r.json();
        result = Array.isArray(data) ? data[0] || null : null;
        break;
      }

      case 'upsertReservation': {
        const { res_num, last_name, guest_name, check_in } = payload;
        // Try update first
        const findUrl = `${SUPABASE_URL}/rest/v1/reservations?reservation_number=eq.${encodeURIComponent(res_num)}&select=id&limit=1`;
        const findR = await fetch(findUrl, { headers });
        const found = await findR.json();

        if (Array.isArray(found) && found.length > 0) {
          const id = found[0].id;
          const updateUrl = `${SUPABASE_URL}/rest/v1/reservations?id=eq.${id}`;
          await fetch(updateUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ last_name, guest_name, check_in })
          });
          result = { id };
        } else {
          const insertUrl = `${SUPABASE_URL}/rest/v1/reservations`;
          const insertR = await fetch(insertUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ reservation_number: res_num, last_name, guest_name, check_in })
          });
          const inserted = await insertR.json();
          result = Array.isArray(inserted) ? inserted[0] : inserted;
        }
        break;
      }

      case 'findSession': {
        const { reservation_id } = payload;
        const url = `${SUPABASE_URL}/rest/v1/bingo_sessions?reservation_id=eq.${reservation_id}&select=*&limit=1`;
        const r = await fetch(url, { headers });
        const data = await r.json();
        result = Array.isArray(data) ? data[0] || null : null;
        break;
      }

      case 'createSession': {
        const { reservation_id, session_token, reward_notes } = payload;
        const url = `${SUPABASE_URL}/rest/v1/bingo_sessions`;
        const r = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ reservation_id, session_token, reward_notes })
        });
        const data = await r.json();
        result = Array.isArray(data) ? data[0] : data;
        break;
      }

      case 'loadActivities': {
        const { session_id } = payload;
        const url = `${SUPABASE_URL}/rest/v1/completed_activities?session_id=eq.${session_id}&select=*&order=activity_index.asc`;
        const r = await fetch(url, { headers });
        result = await r.json();
        break;
      }

      case 'saveActivity': {
        const { session_id, activity_index, activity_name, photo_url } = payload;
        // Check if exists
        const findUrl = `${SUPABASE_URL}/rest/v1/completed_activities?session_id=eq.${session_id}&activity_index=eq.${activity_index}&select=id&limit=1`;
        const findR = await fetch(findUrl, { headers });
        const found = await findR.json();

        if (Array.isArray(found) && found.length > 0) {
          if (photo_url) {
            const updateUrl = `${SUPABASE_URL}/rest/v1/completed_activities?id=eq.${found[0].id}`;
            await fetch(updateUrl, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ photo_url })
            });
          }
          result = { success: true, updated: true };
        } else {
          const insertUrl = `${SUPABASE_URL}/rest/v1/completed_activities`;
          await fetch(insertUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ session_id, activity_index, activity_name, photo_url: photo_url || null })
          });
          result = { success: true, inserted: true };
        }
        break;
      }

      case 'completeGame': {
        const { session_id } = payload;
        const url = `${SUPABASE_URL}/rest/v1/bingo_sessions?id=eq.${session_id}`;
        await fetch(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ completed_bingo: true })
        });
        result = { success: true };
        break;
      }

      case 'logPlayer': {
        const { first_name, last_name, reservation_number, check_in_date, bear_token } = payload;
        const normRes = (reservation_number || '').trim().toLowerCase();

        // Check both original and normalized reservation number
        const checkUrl = `${SUPABASE_URL}/rest/v1/bingo_players?select=id&limit=1&or=(reservation_number.eq.${encodeURIComponent(reservation_number)},reservation_number.eq.${encodeURIComponent(normRes)})`;
        const checkR = await fetch(checkUrl, { headers });
        const existing = await checkR.json();

        let playerId = null;

        if (Array.isArray(existing) && existing.length > 0) {
          playerId = existing[0].id;
          const patchBody = { first_name, last_name, check_in_date, started_at: new Date().toISOString() };
          if (bear_token) patchBody.bear_token = bear_token;
          await fetch(`${SUPABASE_URL}/rest/v1/bingo_players?id=eq.${playerId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(patchBody)
          });
        } else {
          const insertR = await fetch(`${SUPABASE_URL}/rest/v1/bingo_players`, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=representation' },
            body: JSON.stringify({
              first_name, last_name,
              reservation_number: normRes,
              check_in_date,
              started_at: new Date().toISOString(),
              completed_bingo: false,
              activities_completed: 0,
              photos_submitted: 0,
              bear_token: bear_token || null
            })
          });
          const inserted = await insertR.json();
          const row = Array.isArray(inserted) ? inserted[0] : inserted;
          playerId = row ? row.id : null;
        }

        // Always do a final direct patch by ID to guarantee token is saved
        if (playerId && bear_token) {
          await fetch(`${SUPABASE_URL}/rest/v1/bingo_players?id=eq.${playerId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ bear_token })
          });
        }

        result = { id: playerId };
        break;
      }

      case 'updatePlayerStats': {
        const { reservation_number, activities_completed, photos_submitted, completed_bingo, bear_token } = payload;
        const patchBody = { activities_completed, photos_submitted, completed_bingo };
        if (bear_token) patchBody.bear_token = bear_token;

        // Try original reservation number first
        const updateUrl = `${SUPABASE_URL}/rest/v1/bingo_players?reservation_number=eq.${encodeURIComponent(reservation_number)}`;
        const updateR = await fetch(updateUrl, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify(patchBody)
        });
        const updateData = await updateR.json();

        // If no rows matched, try with lowercased reservation number
        if (!Array.isArray(updateData) || updateData.length === 0) {
          const normRes = reservation_number.trim().toLowerCase();
          const updateUrl2 = `${SUPABASE_URL}/rest/v1/bingo_players?reservation_number=eq.${encodeURIComponent(normRes)}`;
          await fetch(updateUrl2, {
            method: 'PATCH',
            headers: { ...headers, 'Prefer': 'return=representation' },
            body: JSON.stringify(patchBody)
          });
        }
        result = { success: true };
        break;
      }

      case 'saveToken': {
        const { id, bear_token } = payload;
        const url = `${SUPABASE_URL}/rest/v1/bingo_players?id=eq.${id}`;
        await fetch(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ bear_token })
        });
        result = { success: true };
        break;
      }

      case 'getPlayers': {
        const url = `${SUPABASE_URL}/rest/v1/bingo_players?select=*&order=started_at.desc`;
        const r = await fetch(url, { headers });
        result = await r.json();
        break;
      }

      case 'markGiftSent': {
        const { id } = payload;
        const url = `${SUPABASE_URL}/rest/v1/bingo_players?id=eq.${id}`;
        await fetch(url, { method: 'PATCH', headers, body: JSON.stringify({ gift_sent: true, gift_sent_at: new Date().toISOString() }) });
        result = { success: true };
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(200).json({ data: result, error: null });

  } catch (error) {
    console.error('DB proxy error:', error);
    return res.status(500).json({ data: null, error: error.message });
  }
}
