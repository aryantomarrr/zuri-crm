import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  try {
    const { campaignMemberId, eventType } = await req.json()
    if (!campaignMemberId || !eventType) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }
    await prisma.commEvent.upsert({
      where: { campaignMemberId_eventType: { campaignMemberId, eventType } },
      update: { receivedAt: new Date() },
      create: { campaignMemberId, eventType },
    })
    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}