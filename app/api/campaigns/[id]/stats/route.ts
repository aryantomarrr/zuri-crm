import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest, context: any) {
  try {
    const { id } = await context.params
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { members: { include: { events: true } } }
    })
    if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 })
    const allEvents = campaign.members.flatMap((m: any) => m.events)
    const count = (type: string) => allEvents.filter((e: any) => e.eventType === type).length
    return Response.json({
      campaign: {
        id: campaign.id, name: campaign.name, goalText: campaign.goalText,
        channel: campaign.channel, status: campaign.status, aiReasoning: campaign.aiReasoning,
        launchedAt: campaign.launchedAt, memberCount: campaign.members.length,
      },
      events: {
        sent: count('sent'), delivered: count('delivered'), read: count('read'),
        clicked: count('clicked'), order_placed: count('order_placed'), failed: count('failed'),
      },
      insight: null,
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}