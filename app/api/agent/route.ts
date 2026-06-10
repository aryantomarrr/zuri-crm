import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import { SYSTEM_PROMPT } from '@/lib/agent/system-prompt'
import { tools } from '@/lib/agent/tools'
import { handleToolCall } from '@/lib/agent/handlers'

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
})

const openRouterTools = tools.map(t => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}))

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        let currentMessages: any[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map((m: any) => ({
            role: m.role,
            content: m.content || '...',
          })),
        ]

        let continueLoop = true
        let loopCount = 0
        const MAX_LOOPS = 8

        while (continueLoop && loopCount < MAX_LOOPS) {
          loopCount++

          const response = await client.chat.completions.create({
            model: 'anthropic/claude-3-haiku',
            messages: currentMessages,
            tools: openRouterTools,
            tool_choice: 'auto',
          })

          const message = response.choices[0].message
          continueLoop = false

          if (message.content) {
            send({ type: 'text', text: message.content })
          }

          if (message.tool_calls && message.tool_calls.length > 0) {
            const toolResults: any[] = []

            for (const toolCall of message.tool_calls) {
              const tc = toolCall as any
              const name = tc.function.name
              let args: any = {}
              try {
                args = JSON.parse(tc.function.arguments)
              } catch (_) {}

              send({ type: 'tool_start', tool: name })
              const result = await handleToolCall(name, args)
              send({ type: 'tool_result', tool: name, result })

              toolResults.push({
                role: 'tool' as const,
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              })
            }

            currentMessages = [
              ...currentMessages,
              message,
              ...toolResults,
            ]
            continueLoop = true
          }
        }

        send({ type: 'done' })
        controller.close()
      } catch (error: any) {
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