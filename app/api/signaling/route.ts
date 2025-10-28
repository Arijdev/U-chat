import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { conversationId, from, to, type, payload, callType, fromName, sdp, candidate } = body

    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 })
    }

    const supabase = createClient(url, serviceKey)

    const insert = {
      conversation_id: conversationId || null,
      from_id: from || null,
      to_id: to || null,
      type: type || null,
      payload: payload || null,
      sdp: sdp || null,
      candidate: candidate || null,
      call_type: callType || null,
      from_name: fromName || null,
    }

    const { data, error } = await supabase.from('webrtc_signaling').insert(insert).select()

    if (error) {
      console.error('[api/signaling] insert error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, row: data && data[0] ? data[0] : null })
  } catch (err) {
    console.error('[api/signaling] unexpected error', err)
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}
