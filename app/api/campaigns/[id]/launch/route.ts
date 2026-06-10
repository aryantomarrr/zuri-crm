import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest, context: any) {
  try {
    const { id } = await context.params
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { members: { include: { customer: true } } }
    })
    if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 })
    await prisma.campaign.update({
      where: { id },
      data: { status: 'launched', launchedAt: new Date() }
    })
    const channelStubUrl = process.env.CHANNEL_STUB_URL || 'http://localhost:4000'
    for (const member of campaign.members) {
      try {
        await fetch(`${channelStubUrl}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignMemberId: member.id,
            recipient: (member as any).customer.phone,
            message: member.personalizedMessage,
            channel: campaign.channel,
            crmReceiptUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/receipt`,
          }),
        })
      } catch (_) {}
      await prisma.commEvent.upsert({
        where: { campaignMemberId_eventType: { campaignMemberId: member.id, eventType: 'sent' } },
        update: {},
        create: { campaignMemberId: member.id, eventType: 'sent' },
      })
    }
    return Response.json({ success: true, membersLaunched: campaign.members.length })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}