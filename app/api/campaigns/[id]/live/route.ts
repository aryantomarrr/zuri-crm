import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const encoder = new TextEncoder()
  let closed = false
  let insightGenerated = false
  let pollCount = 0
  const MAX_POLLS = 60 // stop after 2 minutes max

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch (_) {
          closed = true
        }
      }

      const close = () => {
        if (closed) return
        closed = true
        try { controller.close() } catch (_) {}
      }

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval)
          return
        }

        pollCount++
        if (pollCount > MAX_POLLS) {
          clearInterval(interval)
          close()
          return
        }

        try {
          const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: {
              members: {
                include: {
                  events: true,
                  customer: {
                    select: { id: true, name: true, city: true, totalSpend: true }
                  }
                }
              }
            }
          })

          if (!campaign) {
            clearInterval(interval)
            close()
            return
          }

          const allEvents = campaign.members.flatMap(m => m.events)
          const count = (type: string) => allEvents.filter(e => e.eventType === type).length

          const events = {
            sent: count('sent'),
            delivered: count('delivered'),
            read: count('read'),
            clicked: count('clicked'),
            order_placed: count('order_placed'),
            failed: count('failed'),
          }

          send({ type: 'stats', events })

          const total = campaign.members.length
          const allSettled = total > 0 && (events.delivered + events.failed) >= total

          if (allSettled && !insightGenerated) {
            insightGenerated = true
            clearInterval(interval)

            // Build per-member status map
            const memberStatuses = campaign.members.map(m => {
              const memberEvents = m.events.map(e => e.eventType)
              let status = 'pending'
              if (memberEvents.includes('order_placed')) status = 'converted'
              else if (memberEvents.includes('clicked')) status = 'clicked'
              else if (memberEvents.includes('read')) status = 'read'
              else if (memberEvents.includes('delivered')) status = 'delivered'
              else if (memberEvents.includes('sent')) status = 'sent'
              else if (memberEvents.includes('failed')) status = 'failed'
              return { ...m, status }
            })

            const clickers = memberStatuses.filter(m => m.status === 'clicked').map(m => ({
              id: m.customer.id,
              name: m.customer.name,
              city: m.customer.city,
              totalSpend: Number(m.customer.totalSpend)
            }))

            const readers = memberStatuses.filter(m => m.status === 'read').map(m => ({
              id: m.customer.id,
              name: m.customer.name,
              city: m.customer.city,
              totalSpend: Number(m.customer.totalSpend)
            }))

            const converters = memberStatuses.filter(m => m.status === 'converted').map(m => ({
              id: m.customer.id,
              name: m.customer.name,
              city: m.customer.city,
              totalSpend: Number(m.customer.totalSpend)
            }))

            // Generate insight text
            try {
              const readRate = events.delivered > 0
                ? Math.round((events.read / events.delivered) * 100) : 0
              const clickRate = events.read > 0
                ? Math.round((events.clicked / events.read) * 100) : 0

              const insightResponse = await anthropic.messages.create({
                model: 'claude-haiku-4-5',
                max_tokens: 120,
                messages: [{
                  role: 'user',
                  content: `Campaign: ${total} sent, ${events.delivered} delivered (${Math.round(events.delivered/total*100)}%), ${events.read} read (${readRate}%), ${events.clicked} clicked (${clickRate}%), ${events.order_placed} converted.
WhatsApp benchmarks: 68% read, 22% click.
Write 2 plain sentences only. No markdown. No bold. No headers.
Sentence 1: What worked vs benchmarks.
Sentence 2: Most important next action.`
                }]
              })

              const insight = (insightResponse.content[0] as any).text
                .trim()
                .replace(/\*\*/g, '')
                .replace(/#{1,6}\s/g, '')
                .replace(/\n+/g, ' ')
                .trim()

              send({ type: 'insight', insight })
            } catch (e) {
              const readRate = events.delivered > 0
                ? Math.round((events.read / events.delivered) * 100) : 0
              send({
                type: 'insight',
                insight: `${events.delivered}/${total} delivered with ${readRate}% read rate${readRate > 68 ? ', above the 68% WhatsApp benchmark' : ', below the 68% WhatsApp benchmark'}. ${clickers.length > 0 ? `Re-target the ${clickers.length} customers who clicked but did not convert with a stronger offer.` : 'Consider a follow-up campaign with increased urgency.'}`
              })
            }

            // Send follow-up options
            const followUpOptions = []

            if (clickers.length > 0) {
              followUpOptions.push({
                type: 'clickers',
                title: `Re-target ${clickers.length} clickers`,
                description: 'These customers showed interest but didn\'t buy. Hit them with extra urgency and a stronger offer.',
                action: `Re-engage ${clickers.length} customers who clicked our WhatsApp campaign but didn't purchase. Offer an additional 10% off valid for 24 hours only. Create urgency.`,
                customers: clickers,
                count: clickers.length,
                color: 'green'
              })
            }

            if (readers.length > 0) {
              followUpOptions.push({
                type: 'readers',
                title: `Win back ${readers.length} readers`,
                description: 'They opened but weren\'t convinced. Try a different angle with social proof.',
                action: `Re-engage ${readers.length} customers who read our WhatsApp message but didn't click. Use a different approach — highlight customer reviews and show bestsellers. Offer free shipping.`,
                customers: readers,
                count: readers.length,
                color: 'blue'
              })
            }

            if (converters.length > 0) {
              followUpOptions.push({
                type: 'converters',
                title: `Reward ${converters.length} buyers`,
                description: 'They purchased! Send a thank you with a loyalty reward.',
                action: `Send a thank you campaign to ${converters.length} customers who just purchased. Reward them with early access to our next collection and a loyalty discount for their next order.`,
                customers: converters,
                count: converters.length,
                color: 'amber'
              })
            }

            if (followUpOptions.length > 0) {
              send({ type: 'followup_options', options: followUpOptions })
            }

            send({ type: 'done' })
            close()
          }
        } catch (e) {
          clearInterval(interval)
          close()
        }
      }, 2000)

      req.signal?.addEventListener('abort', () => {
        clearInterval(interval)
        closed = true
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}