import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const encoder = new TextEncoder()
  let closed = false
  let insightGenerated = false
  let pollCount = 0
  const MAX_POLLS = 60

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

          // If insight already saved in DB, send and stop
          if ((campaign as any).aiInsight) {
            try {
              const cards = JSON.parse((campaign as any).aiInsight)
              send({ type: 'insight_cards', cards })
            } catch (_) {}
            send({ type: 'done' })
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

            // Wait 10 seconds for remaining callbacks (read, clicked) to arrive
            await new Promise(resolve => setTimeout(resolve, 10000))

            // Re-fetch fresh data after waiting
            const fresh = await prisma.campaign.findUnique({
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

            if (!fresh) { close(); return }

            const freshAllEvents = fresh.members.flatMap(m => m.events)
            const fc = (type: string) => freshAllEvents.filter(e => e.eventType === type).length

            const freshEvents = {
              sent: fc('sent'),
              delivered: fc('delivered'),
              read: fc('read'),
              clicked: fc('clicked'),
              order_placed: fc('order_placed'),
              failed: fc('failed'),
            }

            // Send updated stats with fresh data
            send({ type: 'stats', events: freshEvents })

            const freshTotal = fresh.members.length
            const deliveryRate = freshTotal > 0 ? Math.round((freshEvents.delivered / freshTotal) * 100) : 0
            const readRate = freshEvents.delivered > 0 ? Math.round((freshEvents.read / freshEvents.delivered) * 100) : 0
            const clickRate = freshEvents.read > 0 ? Math.round((freshEvents.clicked / freshEvents.read) * 100) : 0

            // Build member statuses from fresh data
            const memberStatuses = fresh.members.map(m => {
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
              id: m.customer.id, name: m.customer.name,
              city: m.customer.city, totalSpend: Number(m.customer.totalSpend)
            }))

            const readers = memberStatuses.filter(m => m.status === 'read').map(m => ({
              id: m.customer.id, name: m.customer.name,
              city: m.customer.city, totalSpend: Number(m.customer.totalSpend)
            }))

            const converters = memberStatuses.filter(m => m.status === 'converted').map(m => ({
              id: m.customer.id, name: m.customer.name,
              city: m.customer.city, totalSpend: Number(m.customer.totalSpend)
            }))

            // Generate insight cards with accurate fresh data
            let insightCards: any[] = []

            try {
              const insightResponse = await anthropic.messages.create({
                model: 'claude-haiku-4-5',
                max_tokens: 400,
                messages: [{
                  role: 'user',
                  content: `Campaign results: ${freshTotal} sent, ${freshEvents.delivered} delivered (${deliveryRate}%), ${freshEvents.read} read (${readRate}%), ${freshEvents.clicked} clicked (${clickRate}%), ${freshEvents.order_placed} converted, ${freshEvents.failed} failed.
WhatsApp benchmarks: 68% read, 22% click, 91% delivery.

Generate exactly 4 insight cards as JSON array. Each card has:
- metric: short label with actual number (e.g. "Read Rate: ${readRate}%")
- status: "good" | "warning" | "bad" (compare actual vs benchmark)
- suggestion: one specific actionable sentence

Return ONLY valid JSON array, no other text:
[{"metric":"...","status":"...","suggestion":"..."},...]`
                }]
              })

              const text = (insightResponse.content[0] as any).text.trim()
              const jsonMatch = text.match(/\[[\s\S]*\]/)
              if (jsonMatch) {
                insightCards = JSON.parse(jsonMatch[0])
              }
            } catch (e) {
              insightCards = []
            }

            // Fallback with accurate data
            if (insightCards.length === 0) {
              insightCards = [
                {
                  metric: `Delivery Rate: ${deliveryRate}%`,
                  status: deliveryRate >= 88 ? 'good' : deliveryRate >= 70 ? 'warning' : 'bad',
                  suggestion: deliveryRate >= 88
                    ? 'Excellent delivery. Your contact list is clean and healthy.'
                    : `${freshEvents.failed} messages failed. Clean your contact list to improve delivery.`
                },
                {
                  metric: `Read Rate: ${readRate}%`,
                  status: readRate >= 68 ? 'good' : readRate >= 50 ? 'warning' : 'bad',
                  suggestion: readRate >= 68
                    ? 'Above 68% benchmark. Your message timing and tone are working well.'
                    : 'Below 68% benchmark. Try sending between 6-8 PM for higher open rates.'
                },
                {
                  metric: `Click Rate: ${clickRate}%`,
                  status: clickRate >= 22 ? 'good' : clickRate >= 12 ? 'warning' : 'bad',
                  suggestion: clickRate >= 22
                    ? 'Strong clicks. Your CTA is resonating with this segment.'
                    : clickers.length > 0
                    ? `${clickers.length} customers clicked. Re-target them with stronger urgency.`
                    : 'Add a single clear CTA and make the offer more prominent.'
                },
                {
                  metric: `Conversions: ${freshEvents.order_placed}`,
                  status: freshEvents.order_placed > 0 ? 'good' : clickers.length > 0 ? 'warning' : 'bad',
                  suggestion: freshEvents.order_placed > 0
                    ? `${freshEvents.order_placed} purchase${freshEvents.order_placed > 1 ? 's' : ''} recorded. Reward buyers with early access to next collection.`
                    : clickers.length > 0
                    ? `${clickers.length} clicked but didn't buy. Re-target with 10% extra off and 24hr deadline.`
                    : 'No conversions yet. Try a stronger discount in your follow-up campaign.'
                },
              ]
            }

            // Save to DB — never generate again
            await prisma.campaign.update({
              where: { id },
              data: { aiInsight: JSON.stringify(insightCards) } as any
            })

            send({ type: 'insight_cards', cards: insightCards })

            // Follow-up options
            const followUpOptions = []

            if (clickers.length > 0) {
              followUpOptions.push({
                type: 'clickers',
                title: `Re-target ${clickers.length} clickers`,
                description: "These customers showed interest but didn't buy. Hit them with extra urgency and a stronger offer.",
                action: `Re-engage ${clickers.length} customers who clicked our WhatsApp campaign but didn't purchase. Offer an additional 10% off valid for 24 hours only.`,
                customers: clickers,
                count: clickers.length,
                color: 'green'
              })
            }

            if (readers.length > 0) {
              followUpOptions.push({
                type: 'readers',
                title: `Win back ${readers.length} readers`,
                description: "They opened but weren't convinced. Try a different angle with social proof.",
                action: `Re-engage ${readers.length} customers who read our WhatsApp message but didn't click. Highlight customer reviews and bestsellers. Offer free shipping.`,
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
                action: `Thank ${converters.length} customers who just purchased. Reward with early access to next collection and loyalty discount.`,
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