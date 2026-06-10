const fs = require('fs');

fs.mkdirSync('app/api/campaigns/[id]/stats', {recursive:true});
fs.mkdirSync('app/api/campaigns/[id]/launch', {recursive:true});
fs.mkdirSync('app/api/campaigns/[id]/live', {recursive:true});
fs.mkdirSync('app/api/receipt', {recursive:true});

fs.writeFileSync('app/api/campaigns/[id]/stats/route.ts', `import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: { members: { include: { events: true } } }
  })
  if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 })
  const allEvents = campaign.members.flatMap(m => m.events)
  const count = (type) => allEvents.filter(e => e.eventType === type).length
  return Response.json({
    campaign: { id: campaign.id, name: campaign.name, goalText: campaign.goalText, channel: campaign.channel, status: campaign.status, aiReasoning: campaign.aiReasoning, launchedAt: campaign.launchedAt, memberCount: campaign.members.length },
    events: { sent: count('sent'), delivered: count('delivered'), read: count('read'), clicked: count('clicked'), order_placed: count('order_placed'), failed: count('failed') },
    insight: null,
  })
}`);

fs.writeFileSync('app/api/campaigns/[id]/launch/route.ts', `import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({ where: { id: params.id }, include: { members: { include: { customer: true } } } })
  if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 })
  await prisma.campaign.update({ where: { id: params.id }, data: { status: 'launched', launchedAt: new Date() } })
  const channelStubUrl = process.env.CHANNEL_STUB_URL || 'http://localhost:4000'
  for (const member of campaign.members) {
    try {
      await fetch(channelStubUrl + '/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignMemberId: member.id, recipient: member.customer.phone, message: member.personalizedMessage, channel: campaign.channel, crmReceiptUrl: 'http://localhost:3000/api/receipt' }) })
    } catch (_) {}
    await prisma.commEvent.upsert({ where: { campaignMemberId_eventType: { campaignMemberId: member.id, eventType: 'sent' } }, update: {}, create: { campaignMemberId: member.id, eventType: 'sent' } })
  }
  return Response.json({ success: true, membersLaunched: campaign.members.length })
}`);

fs.writeFileSync('app/api/campaigns/[id]/live/route.ts', `import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => controller.enqueue(encoder.encode('data: ' + JSON.stringify(data) + '\\n\\n'))
      let polls = 0
      const interval = setInterval(async () => {
        polls++
        const campaign = await prisma.campaign.findUnique({ where: { id: params.id }, include: { members: { include: { events: true } } } })
        if (!campaign) { clearInterval(interval); controller.close(); return }
        const allEvents = campaign.members.flatMap(m => m.events)
        const count = (type) => allEvents.filter(e => e.eventType === type).length
        const events = { sent: count('sent'), delivered: count('delivered'), read: count('read'), clicked: count('clicked'), order_placed: count('order_placed'), failed: count('failed') }
        send({ type: 'stats', events })
        const total = campaign.members.length
        const done = events.delivered + events.failed
        if ((done >= total && total > 0) || polls >= 60) {
          if (events.delivered > 0) {
            const readRate = Math.round((events.read / events.delivered) * 100)
            const clickRate = events.read > 0 ? Math.round((events.clicked / events.read) * 100) : 0
            send({ type: 'insight', insight: 'Campaign complete. ' + events.delivered + '/' + total + ' delivered. ' + readRate + '% read rate. ' + clickRate + '% click rate. ' + events.order_placed + ' conversions.' })
          }
          send({ type: 'done' })
          clearInterval(interval)
          controller.close()
        }
      }, 2000)
    }
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
}`);

fs.writeFileSync('app/api/receipt/route.ts', `import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
export async function POST(req: NextRequest) {
  try {
    const { campaignMemberId, eventType } = await req.json()
    if (!campaignMemberId || !eventType) return Response.json({ error: 'Missing fields' }, { status: 400 })
    await prisma.commEvent.upsert({ where: { campaignMemberId_eventType: { campaignMemberId, eventType } }, update: { receivedAt: new Date() }, create: { campaignMemberId, eventType } })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}`);

console.log('All files written!');