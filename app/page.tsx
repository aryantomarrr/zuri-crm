'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Zap, Users, BarChart3, ChevronRight, Sparkles, TrendingUp, MessageSquare, Target } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
}

interface ToolCall {
  tool: string
  result: any
}

const SUGGESTED_GOALS = [
  { icon: '🔄', label: 'Win-back', text: "Win back customers who spent over 2000 but haven't ordered in 60 days. Offer 20% off." },
  { icon: '👑', label: 'High Value', text: "Engage high-value customers (spent over 5000) with our new festive collection." },
  { icon: '🛍️', label: 'Re-engage', text: "Re-engage one-time buyers with a 15% discount to get their second order." },
  { icon: '📍', label: 'Location', text: "Target Mumbai and Delhi customers who ordered in the last 30 days with new arrivals." },
]

function isApprovalMessage(text: string) {
  return /^(yes|launch|go|proceed|confirm|ok|sure|do it|launch it|yes launch|yes please|y|approved|launch campaign)$/i.test(text.trim())
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [segmentId, setSegmentId] = useState<string | null>(null)
  const [channel, setChannel] = useState<string>('WhatsApp')
  const [goalText, setGoalText] = useState<string>('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const userText = text || input.trim()
    if (!userText || loading) return

    if (!isApprovalMessage(userText)) {
      setGoalText(userText)
    }

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
          segmentId,
          channel,
          goalText: isApprovalMessage(userText) ? goalText : userText,
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
              // Store segment and channel in state
              if (data.tool === 'build_segment' && data.result?.segment_id) {
                setSegmentId(data.result.segment_id)
              }
              if (data.tool === 'recommend_channel' && data.result?.channel) {
                setChannel(data.result.channel)
              }
              if (data.tool === 'create_campaign' && data.result?.campaign_id) {
                setCampaignId(data.result.campaign_id)
              }
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = {
                  ...last,
                  toolCalls: [...(last.toolCalls || []), { tool: data.tool, result: data.result }],
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
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      <header className="border-b border-white/5 px-4 md:px-6 py-4 flex items-center justify-between backdrop-blur-sm bg-[#0A0A0F]/80 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-900/50">Z</div>
          <span className="font-semibold text-lg tracking-tight">Zuri CRM</span>
          <span className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full font-medium hidden sm:block">AI-powered</span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          <a href="/" className="px-3 py-1.5 text-sm text-white bg-white/5 rounded-lg font-medium">Campaigns</a>
          <a href="/customers" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Customers</a>
          <a href="/campaigns" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">History</a>
        </nav>
        <div className="flex md:hidden items-center gap-2 text-xs text-gray-400">
          <a href="/customers" className="px-2 py-1 hover:text-white">Customers</a>
          <a href="/campaigns" className="px-2 py-1 hover:text-white">History</a>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-2 md:px-0">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
            <div className="relative mb-6 md:mb-8">
              <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full" />
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-3xl md:text-4xl font-bold shadow-2xl shadow-purple-900/50">
                Z
              </div>
            </div>

            <h1 className="text-2xl md:text-4xl font-bold mb-3 text-center tracking-tight">
              What's your campaign goal?
            </h1>
            <p className="text-gray-400 text-center mb-8 md:mb-10 max-w-lg text-base md:text-lg leading-relaxed px-4">
              Describe your marketing goal in plain English. The AI will build the audience, write personalized messages, and launch the campaign.
            </p>

            <div className="hidden md:flex items-center gap-8 mb-8 px-6 py-3 bg-white/3 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-violet-400" />
                <span className="text-gray-400">61 customers</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-gray-400">Rs.7,32,769 revenue</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-gray-400">AI-powered segmentation</span>
              </div>
            </div>

            <div className="flex md:hidden items-center gap-4 mb-6 text-xs text-gray-500">
              <span>61 customers</span>
              <span>•</span>
              <span>Rs.7,32,769 revenue</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mb-8">
              {SUGGESTED_GOALS.map((goal, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(goal.text)}
                  className="text-left p-4 rounded-xl border border-white/8 hover:border-violet-500/50 bg-white/2 hover:bg-violet-500/5 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{goal.icon}</span>
                    <div>
                      <div className="text-xs text-violet-400 font-medium mb-1">{goal.label}</div>
                      <div className="text-sm text-gray-300 group-hover:text-white leading-relaxed">{goal.text}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-full md:max-w-3xl w-full">
                  {msg.role === 'assistant' && (
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs md:text-sm font-bold flex-shrink-0 mt-1 shadow-lg shadow-purple-900/30">Z</div>
                      <div className="flex-1 space-y-3 min-w-0">
                        {msg.toolCalls?.map((tc, j) => (
                          <ToolCard key={j} toolCall={tc} />
                        ))}
                        {msg.content && (
                          <div className="bg-white/4 border border-white/8 rounded-2xl rounded-tl-sm p-3 md:p-4 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        )}
                        {loading && i === messages.length - 1 && !msg.content && (msg.toolCalls?.length === 0) && (
                          <div className="flex gap-1.5 p-4">
                            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="flex justify-end">
                      <div className="bg-violet-600 rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-xs md:max-w-xl shadow-lg shadow-violet-900/30">
                        {msg.content}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {campaignId && (
              <div className="flex justify-center py-2">
                
                <a href={`/campaigns/${campaignId}`}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 transition-all px-5 py-3 rounded-xl text-sm font-medium shadow-lg shadow-green-900/30"
                >
                  <BarChart3 className="w-4 h-4" />
                  View Live Campaign Stats
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        <div className="border-t border-white/5 p-3 md:p-4 bg-[#0A0A0F]/80 backdrop-blur-sm">
          <div className="flex gap-2 md:gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={segmentId && !campaignId ? "Type 'yes' to launch the campaign..." : "Describe your campaign goal..."}
              className="flex-1 bg-white/4 border border-white/8 rounded-xl px-3 md:px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 placeholder-gray-600 transition-colors"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed px-3 md:px-4 py-3 rounded-xl transition-all shadow-lg shadow-violet-900/30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {segmentId && !campaignId && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => sendMessage('yes')}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-30 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Launch Campaign
              </button>
            </div>
          )}
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
      <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-3 md:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-violet-400 text-xs font-medium uppercase tracking-wider">
            <Target className="w-3.5 h-3.5" />
            Audience Built
          </div>
          <div className="text-xs text-gray-500 bg-black/20 px-2 py-1 rounded-lg">AI Generated</div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-violet-300 bg-clip-text text-transparent">{result.count}</span>
          <span className="text-gray-400 text-sm">customers</span>
        </div>
        {result.plain_english && (
          <div className="text-sm text-gray-300 leading-relaxed bg-violet-500/5 px-3 py-2 rounded-lg border border-violet-500/10">
            {result.plain_english}
          </div>
        )}
        {result.top_cities && (
          <div className="text-xs text-gray-500">Top cities: {result.top_cities}</div>
        )}
        {result.sample_customers && (
          <div className="flex flex-wrap gap-2">
            {result.sample_customers.map((c: any) => (
              <span key={c.id} className="text-xs bg-white/4 border border-white/8 text-gray-300 px-2.5 py-1 rounded-full">
                {c.name} · {c.city} · Rs.{Number(c.totalSpend).toLocaleString()}
              </span>
            ))}
            {result.count > 5 && (
              <span className="text-xs text-gray-600 px-2 py-1">+{result.count - 5} more</span>
            )}
          </div>
        )}
      </div>
    )
  }

  if (tool === 'recommend_channel') {
    const configs: any = {
      WhatsApp: { bg: 'bg-green-500/5', border: 'border-green-500/20', text: 'text-green-400', badge: 'bg-green-500/10' },
      Email: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400', badge: 'bg-blue-500/10' },
      SMS: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400', badge: 'bg-amber-500/10' },
    }
    const config = configs[result.channel] || configs.WhatsApp
    return (
      <div className={`${config.bg} border ${config.border} rounded-2xl p-3 md:p-4 space-y-2`}>
        <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wider ${config.text} opacity-70`}>
          <Zap className="w-3.5 h-3.5" />
          Channel Recommended
        </div>
        <div className={`text-xl md:text-2xl font-bold ${config.text}`}>{result.channel}</div>
        <div className="text-xs text-gray-400 leading-relaxed">{result.reasoning}</div>
        <div className="flex gap-3 pt-1">
          <span className={`text-xs ${config.badge} ${config.text} px-2.5 py-1 rounded-full font-medium`}>Read {result.expected_read_rate}</span>
          <span className={`text-xs ${config.badge} ${config.text} px-2.5 py-1 rounded-full font-medium`}>Click {result.expected_click_rate}</span>
        </div>
      </div>
    )
  }

  if (tool === 'draft_messages') {
    return (
      <div className="bg-white/3 border border-white/8 rounded-2xl p-3 md:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5" />
            {result.total} Personalized Messages
          </div>
          <span className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">AI Written</span>
        </div>
        <div className="space-y-2">
          {result.messages?.slice(0, 3).map((m: any, i: number) => (
            <div key={i} className="bg-black/20 border border-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs text-violet-400 font-medium">{m.customerName}</div>
                {m.lastProduct && (
                  <div className="text-xs text-gray-600">Last: {m.lastProduct}</div>
                )}
              </div>
              <div className="text-sm text-gray-300 leading-relaxed">{m.message}</div>
            </div>
          ))}
          {result.total > 3 && (
            <div className="text-xs text-gray-600 text-center py-1">+{result.total - 3} more personalized messages</div>
          )}
        </div>
      </div>
    )
  }

  if (tool === 'create_campaign') {
    return (
      <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-3 md:p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-400 text-xs font-medium uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Campaign Created
        </div>
        <div className="text-base md:text-lg font-semibold text-white">{result.name}</div>
        <div className="text-sm text-green-400">{result.member_count} members ready to receive messages</div>
      </div>
    )
  }

  return null
}