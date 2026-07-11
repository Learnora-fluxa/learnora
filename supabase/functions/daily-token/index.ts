import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { action, session_id } = await req.json() as { action: 'create' | 'join'; session_id: string }

    if (!action || !session_id) return json({ error: 'Missing action or session_id' }, 400)

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')             ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify JWT and get caller identity
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    // Fetch the live session
    const { data: session, error: sessErr } = await supabase
      .from('live_sessions')
      .select('id, teacher_id, class_id, school_id, topic, daily_room_name, daily_room_url, status')
      .eq('id', session_id)
      .maybeSingle()

    if (sessErr || !session) return json({ error: 'Session not found' }, 404)

    const isTeacher = session.teacher_id === user.id

    // Access check for non-teachers
    if (!isTeacher) {
      const { data: enrollment } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('class_id',  session.class_id)
        .eq('student_id', user.id)
        .eq('school_id',  session.school_id)
        .maybeSingle()

      if (!enrollment) return json({ error: 'Access denied: not enrolled in this class' }, 403)
    }

    let roomName: string = session.daily_room_name ?? ''
    let roomUrl:  string = session.daily_room_url  ?? ''

    // ── CREATE (teacher starts the room) ──────────────────────────────────────
    if (action === 'create') {
      if (!isTeacher) return json({ error: 'Only the teacher can start a room' }, 403)

      if (!roomName) {
        // Derive a stable room name from the session UUID (Daily max 40 chars, alphanumeric + hyphens)
        const safeName = `ls-${session_id.replace(/-/g, '').substring(0, 32)}`

        const roomRes = await fetch('https://api.daily.co/v1/rooms', {
          method: 'POST',
          headers: {
            'Authorization':  `Bearer ${DAILY_API_KEY}`,
            'Content-Type':   'application/json',
          },
          body: JSON.stringify({
            name:    safeName,
            privacy: 'private',
            properties: {
              enable_prejoin_ui:  false,
              enable_chat:        true,
              enable_screenshare: true,
              max_participants:   250,
              lang:               'en',
              // 4-hour expiry from now
              exp: Math.floor(Date.now() / 1000) + 14400,
            },
          }),
        })

        if (!roomRes.ok) {
          const msg = await roomRes.text()
          return json({ error: `Daily room creation failed: ${msg}` }, 500)
        }

        const room = await roomRes.json() as { name: string; url: string }
        roomName = room.name
        roomUrl  = room.url

        await supabase.from('live_sessions').update({
          daily_room_name: roomName,
          daily_room_url:  roomUrl,
          status:          'live',
        }).eq('id', session_id)
      } else {
        // Room already exists — just flip to live in case it was upcoming
        await supabase.from('live_sessions')
          .update({ status: 'live' })
          .eq('id', session_id)
      }
    }

    // ── JOIN (student or re-entering teacher) ─────────────────────────────────
    if (action === 'join') {
      if (!roomName) return json({ error: 'Room not started yet — wait for the teacher to begin' }, 400)
    }

    // Mint a short-lived meeting token
    const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner:  isTeacher,
          user_name: user.email ?? 'Participant',
          user_id:   user.id,
          exp: Math.floor(Date.now() / 1000) + 14400,
          enable_screenshare: true,
        },
      }),
    })

    if (!tokenRes.ok) {
      const msg = await tokenRes.text()
      return json({ error: `Daily token mint failed: ${msg}` }, 500)
    }

    const { token } = await tokenRes.json() as { token: string }

    return json({ token, room_url: roomUrl })

  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
