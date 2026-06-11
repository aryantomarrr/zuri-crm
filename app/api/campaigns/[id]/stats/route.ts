import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest, context: any) {
  try {
    const { id } = await context.params

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            events: true,
            customer: {
              select: {
                id: true,
                name: true,
                city: true,
                totalSpend: true,
                orderCount: true,
              }
            }
          }
        }
      }
    })

    if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 })

    const allEvents = campaign.members.flatMap((m: any) => m.events)
    const count = (type: string) => allEvents.filter((e: any) => e.eventType === type).length

    const members = campaign.members.map((m: any) => {
      const memberEventTypes = m.events.map((e: any) => e.eventType)
      let status = 'pending'
      if (memberEventTypes.includes('order_placed')) status = 'converted'
      else if (memberEventTypes.includes('clicked')) status = 'clicked'
      else if (memberEventTypes.includes('read')) status = 'read'
      else if (memberEventTypes.includes('delivered')) status = 'delivered'
      else if (memberEventTypes.includes('sent')) status = 'sent'
      else if (memberEventTypes.includes('failed')) status = 'failed'

      return {
        id: m.id,
        personalizedMessage: m.personalizedMessage,
        status,
        customer: {
          id: m.customer?.id,
          name: m.customer?.name,
          city: m.customer?.city,
          totalSpend: Number(m.customer?.totalSpend || 0),
          orderCount: m.customer?.orderCount,
        }
      }
    })

    return Response.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        goalText: campaign.goalText,
        channel: campaign.channel,
        status: campaign.status,
        aiReasoning: campaign.aiReasoning,
        launchedAt: campaign.launchedAt,
        memberCount: campaign.members.length,
      },
      events: {
        sent: count('sent'),
        delivered: count('delivered'),
        read: count('read'),
        clicked: count('clicked'),
        order_placed: count('order_placed'),
        failed: count('failed'),
      },
      members,
      insight: null,
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}