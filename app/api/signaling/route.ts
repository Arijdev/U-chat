import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceRoleKey } from '@/lib/env'

export async function POST(req: Request) {
  try {
    // 1. Authenticate the caller session
    const serverClient = await createServerClient()
    const {
      data: { user },
    } = await serverClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const { conversationId, from, to, type, payload, callType, fromName, sdp, candidate } = body

    // Verify sender matches the authenticated user to prevent spoofing
    const senderId = from || user.id
    if (senderId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: sender ID mismatch' }, { status: 403 })
    }

    const insert = {
      conversation_id: conversationId || null,
      from_id: senderId,
      to_id: to || null,
      type: type || null,
      payload: payload || null,
      sdp: sdp || null,
      candidate: candidate || null,
      call_type: callType || null,
      from_name: fromName || null,
    }

    const serviceKey = getSupabaseServiceRoleKey()
    const url = getSupabaseUrl()
    const anonKey = getSupabaseAnonKey()

    // 2. Insert via Service Role if provided, otherwise via the authenticated server client
    if (serviceKey && url) {
      const adminClient = createAdminClient(url, serviceKey)
      const { data, error } = await adminClient.from('webrtc_signaling').insert(insert).select()
      if (error) {
        console.error('[api/signaling] admin insert error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, row: data?.[0] || null })
    } else {
      // Fallback to authenticated user client
      const { data, error } = await serverClient.from('webrtc_signaling').insert(insert).select()
      if (error) {
        console.error('[api/signaling] server client insert error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, row: data?.[0] || null })
    }
  } catch (err: any) {
    console.error('[api/signaling] unexpected error:', err)
    return NextResponse.json({ error: err?.message || 'unexpected error' }, { status: 500 })
  }
}
