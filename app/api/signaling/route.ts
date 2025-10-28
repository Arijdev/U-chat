import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { conversationId, from, to, type, payload, callType, fromName, sdp, candidate } = body

    // Use the same env vars as set in Vercel
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
      console.error('[api/signaling] Missing env vars:', { 
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      })
      return NextResponse.json({ 
        error: 'Server misconfigured: Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
        debug: {
          url: !!url,
          key: !!serviceKey
        }
      }, { status: 500 })
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
