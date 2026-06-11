import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { SYSTEM_PROMPT } from '@/lib/agent/system-prompt'
import { tools } from '@/lib/agent/tools'
import { handleToolCall } from '@/lib/agent/handlers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { messages, segmentId, channel, goalText } = await req.json()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const userMessage = messages[messages.length - 1]
        const lastUserContent = (userMessage?.content || '').trim()

        const isApproval = /^(yes|launch|go|proceed|confirm|ok|sure|do it|launch it|yes launch|yes please|launch campaign|approved|y)$/i.test(lastUserContent)

        const historyStr = JSON.stringify(messages)
        const alreadyHasCampaign = historyStr.includes('"campaign_id"')

        if (alreadyHasCampaign) {
          send({ type: 'text', text: 'Your campaign is already created! Click View Live Stats to track delivery.' })
          send({ type: 'done' })
          controller.close()
          return
        }

        if (isApproval) {
          try {
            if (!segmentId) {
              send({ type: 'text', text: 'Please describe your campaign goal first.' })
              send({ type: 'done' })
              controller.close()
              return
            }

            const { prisma } = await import('@/lib/db/prisma')
            const segment = await prisma.segment.findUnique({ where: { id: segmentId } })

            if (!segment) {
              send({ type: 'text', text: 'Could not find campaign data. Please try again.' })
              send({ type: 'done' })
              controller.close()
              return
            }

            const customers = await prisma.$queryRawUnsafe(
              `SELECT id, name, city, "totalSpend", "lastOrderAt", "orderCount"
               FROM "Customer" WHERE ${segment.sqlWhere} LIMIT 100`
            ) as any[]

            if (customers.length === 0) {
              send({ type: 'text', text: 'No customers found in this segment. Please try a different goal.' })
              send({ type: 'done' })
              controller.close()
              return
            }

            const messagesResult = await handleToolCall('draft_messages', {
              campaign_goal: goalText || 'Marketing campaign',
              channel: channel || 'WhatsApp',
              customers: customers.map((c: any) => ({
                id: c.id,
                name: c.name,
                city: c.city,
                totalSpend: Number(c.totalSpend),
                lastOrderAt: c.lastOrderAt,
                orderCount: c.orderCount,
              }))
            }) as any

            const campaignMessages = messagesResult.messages?.length > 0
              ? messagesResult.messages
              : customers.map((c: any) => ({
                  customerId: c.id,
                  customerName: c.name,
                  message: `Hi ${c.name.split(' ')[0]}! ${goalText} Shop at zuri.in`
                }))

            const result = await handleToolCall('create_campaign', {
              name: (goalText || 'Campaign').slice(0, 60),
              goal_text: goalText || 'Marketing campaign',
              segment_id: segmentId,
              channel: channel || 'WhatsApp',
              messages: campaignMessages,
              ai_reasoning: `${channel || 'WhatsApp'} selected for ${customers.length} customers in "${segment.name}". Messages personalized using real purchase history.`
            }) as any

            send({ type: 'tool_result', tool: 'create_campaign', result })

            if (result?.campaign_id) {
              send({ type: 'text', text: `Campaign launched with ${campaignMessages.length} personalized messages! Click View Live Stats to track delivery in real time.` })
            } else {
              send({ type: 'text', text: result?.error || 'Something went wrong. Please try again.' })
            }
          } catch (e: any) {
            console.error('Approval error:', e.message)
            send({ type: 'error', message: e.message })
          }
          send({ type: 'done' })
          controller.close()
          return
        }

        let currentMessages: any[] = [{
          role: 'user',
          content: lastUserContent
        }]

        let continueLoop = true
        let loopCount = 0
        let campaignCreated = false

        while (continueLoop && loopCount < 10 && !campaignCreated) {
          loopCount++

          const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: tools as any,
            messages: currentMessages,
          })

          const toolResults: any[] = []
          let hasToolUse = false

          for (const block of response.content) {
            if (block.type === 'text' && block.text) {
              const clean = block.text.replace(/<\/?result>/gi, '').trim()
              if (clean) send({ type: 'text', text: clean })
            }
            if (block.type === 'tool_use') {
              hasToolUse = true
              const toolBlock = block as any
              send({ type: 'tool_start', tool: toolBlock.name })
              const result = await handleToolCall(toolBlock.name, toolBlock.input)
              send({ type: 'tool_result', tool: toolBlock.name, result })

              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: JSON.stringify(result),
              })

              if (toolBlock.name === 'create_campaign') {
                campaignCreated = true
              }
            }
          }

          if (hasToolUse && !campaignCreated) {
            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: response.content },
              { role: 'user', content: toolResults },
            ]
            continueLoop = true
          } else if (hasToolUse && campaignCreated) {
            send({ type: 'text', text: 'Campaign launched! Click View Live Stats to track delivery in real time.' })
            continueLoop = false
          } else {
            continueLoop = false
          }
        }

        send({ type: 'done' })
        controller.close()
      } catch (error: any) {
        console.error('Agent error:', error.message)
        send({ type: 'error', message: error.message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}