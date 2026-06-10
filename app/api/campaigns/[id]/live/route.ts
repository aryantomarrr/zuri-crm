import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest, context: any) {
  const { id } = await context.params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      let polls = 0
      const interval = setInterval(async () => {
        polls++
        try {
          const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: { members: { include: { events: true } } }
          })
          if (!campaign) { clearInterval(interval); controller.close(); return }
          const allEvents = campaign.members.flatMap((m: any) => m.events)
          const count = (type: string) => allEvents.filter((e: any) => e.eventType === type).length
          const events = {
            sent: count('sent'), delivered: count('delivered'), read: count('read'),
            clicked: count('clicked'), order_placed: count('order_placed'), failed: count('failed'),
          }
          send({ type: 'stats', events })
          const total = campaign.members.length
          const done = events.delivered + events.failed
          if ((done >= total && total > 0) || polls >= 60) {
            if (events.delivered > 0) {
              const readRate = Math.round((events.read / events.delivered) * 100)
              const clickRate = events.read > 0 ? Math.round((events.clicked / events.read) * 100) : 0
              send({ type: 'insight', insight: `Campaign complete. ${events.delivered}/${total} delivered. ${readRate}% read rate. ${clickRate}% click rate. ${events.order_placed} conversions.` })
            }
            send({ type: 'done' })
            clearInterval(interval)
            controller.close()
          }
        } catch (e) {
          clearInterval(interval)
          controller.close()
        }
      }, 2000)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    }
  })
}