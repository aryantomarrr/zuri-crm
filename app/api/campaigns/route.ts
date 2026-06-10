import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        members: {
          include: { events: true }
        }
      }
    })

    const result = campaigns.map(c => {
      const allEvents = c.members.flatMap(m => m.events)
      const count = (type: string) => allEvents.filter(e => e.eventType === type).length
      return {
        id: c.id,
        name: c.name,
        goalText: c.goalText,
        channel: c.channel,
        status: c.status,
        createdAt: c.createdAt,
        launchedAt: c.launchedAt,
        memberCount: c.members.length,
        stats: {
          sent: count('sent'),
          delivered: count('delivered'),
          read: count('read'),
          clicked: count('clicked'),
          order_placed: count('order_placed'),
          failed: count('failed'),
        }
      }
    })

    return Response.json(result)
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}