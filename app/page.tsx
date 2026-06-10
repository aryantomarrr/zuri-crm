'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Zap, Users, BarChart3, ChevronRight } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
}

interface ToolCall {
  tool: string
  input: any
  result: any
}

const SUGGESTED_GOALS = [
  "Win back customers who spent over 2000 but haven't ordered in 60 days. Offer 20% off.",
  "Engage high-value customers (spent over 5000) with our new festive collection.",
  "Re-engage one-time buyers with a 15% discount to get their second order.",
  "Target Mumbai and Delhi customers who ordered in the last 30 days with new arrivals.",
]

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const userText = text || input.trim()
    if (!userText || loading) return

    const userMessage: Message = { role: 'user', content: userText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMessage: Message = { role: 'assistant', content: '', toolCalls: [] }
    setMessages([...newMessages, assistantMessage])

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content || '...' })),
        }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
      
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
      
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const data = JSON.parse(raw)
            console.log('SSE:', data.type, data)
      
            if (data.type === 'text') {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + data.text,
                }
                return updated
              })
            } else if (data.type === 'tool_result') {
              if (data.tool === 'create_campaign' && data.result?.campaign_id) {
                setCampaignId(data.result.campaign_id)
              }
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = {
                  ...last,
                  toolCalls: [
                    ...(last.toolCalls || []),
                    { tool: data.tool, input: {}, result: data.result },
                  ],
                }
                return updated
              })
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-sm">Z</div>
          <span className="font-semibold text-lg">Zuri CRM</span>
          <span className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full">AI-powered</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-gray-400">
          <a href="/" className="text-white font-medium">Campaigns</a>
          <a href="/customers" className="hover:text-white transition-colors">Customers</a>
          <a href="/campaigns" className="hover:text-white transition-colors">History</a>
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mb-6 text-3xl font-bold">Z</div>
              <h1 className="text-3xl font-bold mb-3 text-center">What's your campaign goal?</h1>
              <p className="text-gray-400 text-center mb-10 max-w-md">
                Describe your marketing goal in plain English. I will build the audience, write personalized messages, and launch the campaign.
              </p>
              <div className="grid grid-cols-1 gap-3 w-full max-w-2xl">
                {SUGGESTED_GOALS.map((goal, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(goal)}
                    className="text-left p-4 rounded-xl border border-gray-700 hover:border-purple-500 hover:bg-gray-900 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300 group-hover:text-white">{goal}</span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 flex-shrink-0 ml-3" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl w-full ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">Z</div>
                        <div className="flex-1 space-y-3">
                          {msg.toolCalls?.map((tc, j) => (
                            <ToolCard key={j} toolCall={tc} />
                          ))}
                          {msg.content && (
                            <div className="bg-gray-900 rounded-2xl rounded-tl-sm p-4 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </div>
                          )}
                          {loading && i === messages.length - 1 && !msg.content && (msg.toolCalls?.length === 0) && (
                            <div className="flex gap-1 p-4">
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <div className="bg-purple-600 rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-xl">
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {campaignId && (
                <div className="flex justify-center">
                  <a
                    href={`/campaigns/${campaignId}`}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 transition-colors px-6 py-3 rounded-xl text-sm font-medium"
                  >
                    <BarChart3 className="w-4 h-4" />
                    View Live Campaign Stats
                  </a>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-800 p-4">
            <div className="max-w-3xl mx-auto flex gap-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Describe your campaign goal..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolCard({ toolCall }: { toolCall: ToolCall }) {
  const { tool, result } = toolCall

  if (!result) return null

  if (tool === 'build_segment') {
    return (
      <div className="bg-gray-900 border border-purple-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-medium uppercase tracking-wide">
          <Users className="w-3.5 h-3.5" />
          Segment Built
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">{result.count}</span>
          <span className="text-gray-400 text-sm">customers matched</span>
        </div>
        <div className="text-xs text-gray-500 font-mono bg-gray-800 px-3 py-2 rounded-lg overflow-x-auto">
          WHERE {result.sql_where}
        </div>
        {result.sample_customers && (
          <div className="flex flex-wrap gap-2">
            {result.sample_customers.map((c: any) => (
              <span key={c.id} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full">
                {c.name} · {c.city} · Rs.{Number(c.totalSpend).toLocaleString()}
              </span>
            ))}
            {result.count > 5 && (
              <span className="text-xs text-gray-500 px-2 py-1">+{result.count - 5} more</span>
            )}
          </div>
        )}
      </div>
    )
  }

  if (tool === 'recommend_channel') {
    const channelColors: any = {
      WhatsApp: 'text-green-400 border-green-800 bg-green-950',
      Email: 'text-blue-400 border-blue-800 bg-blue-950',
      SMS: 'text-yellow-400 border-yellow-800 bg-yellow-950',
    }
    return (
      <div className={`border rounded-2xl p-4 space-y-2 ${channelColors[result.channel] || 'border-gray-700 bg-gray-900'}`}>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide opacity-70">
          <Zap className="w-3.5 h-3.5" />
          Channel Selected
        </div>
        <div className="text-2xl font-bold">{result.channel}</div>
        <div className="text-xs opacity-70">{result.reasoning}</div>
        <div className="flex gap-4 text-xs opacity-60">
          <span>Read rate: {result.expected_read_rate}</span>
          <span>Click rate: {result.expected_click_rate}</span>
        </div>
      </div>
    )
  }

  if (tool === 'draft_messages') {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide">
          <Zap className="w-3.5 h-3.5" />
          {result.total} Personalized Messages Drafted
        </div>
        <div className="space-y-2">
          {result.messages?.slice(0, 3).map((m: any, i: number) => (
            <div key={i} className="bg-gray-800 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1 font-medium">{m.customerName}</div>
              <div className="text-sm text-gray-200">{m.message}</div>
            </div>
          ))}
          {result.total > 3 && (
            <div className="text-xs text-gray-500 text-center py-1">+{result.total - 3} more messages</div>
          )}
        </div>
      </div>
    )
  }

  if (tool === 'create_campaign') {
    return (
      <div className="bg-green-950 border border-green-800 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-400 text-xs font-medium uppercase tracking-wide">
          <Zap className="w-3.5 h-3.5" />
          Campaign Created
        </div>
        <div className="text-lg font-semibold text-white">{result.name}</div>
        <div className="text-sm text-green-300">{result.member_count} members ready to receive messages</div>
      </div>
    )
  }

  return null
}