import { NextRequest, NextResponse } from "next/server"
import { getServerCommunities } from "@/lib/server-store"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const communities = getServerCommunities()
  return NextResponse.json(communities)
}
