'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BarChart3, Users, MessageSquare, MousePointer, ShoppingBag, XCircle, Zap, ArrowLeft, TrendingUp } from 'lucide-react'

interface Member {
  id: string
  personalizedMessage: string
  status: string
  customer: {
    id: string
    name: string
    city: string
    totalSpend: number
    orderCount: number
  }
}

interface FollowUpOption {
  type: string
  title: string
  description: string
  action: string
  customers: any[]
  count: number
  color: string
}

interface InsightCard {
  metric: string
  status: 'good' | 'warning' | 'bad'
  suggestion: string
}

interface Stats {
  campaign: {
    id: string
    name: string
    goalText: string
    channel: string
    status: string
    aiReasoning: string
    aiInsight: string | null
    launchedAt: string | null
    memberCount: number
  }
  events: {
    sent: number
    delivered: number
    read: number
    clicked: number
    order_placed: number
    failed: number
  }
  members: Member[]
}

export default function CampaignPage() {
  const { id } = useParams()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [launching, setLaunching] = useState(false)
  const [launched, setLaunched] = useState(false)
  const [insightCards, setInsightCards] = useState<InsightCard[]>([])
  const [followUpOptions, setFollowUpOptions] = useState<FollowUpOption[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'clicked' | 'read' | 'delivered' | 'failed'>('all')
  const [launchingFollowUp, setLaunchingFollowUp] = useState<string | null>(null)
  const sseStarted = useRef(false)

  useEffect(() => {
    fetchStats()
  }, [id])

  async function fetchStats() {
    try {
      const res = await fetch(`/api/campaigns/${id}/stats`)
      const data = await res.json()
      setStats(data)
      if (data.campaign.status === 'launched') {
        setLaunched(true)
        // Load saved insight cards from DB — no AI call needed
        if (data.campaign.aiInsight) {
          try {
            const cards = JSON.parse(data.campaign.aiInsight)
            setInsightCards(cards)
          } catch (_) {}
        } else {
          startSSE()
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  function startSSE() {
    if (sseStarted.current) return
    sseStarted.current = true

    const es = new EventSource(`/api/campaigns/${id}/live`)

    const memberPollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/campaigns/${id}/stats`)
        const data = await res.json()
        if (data.members) {
          setStats(prev => prev ? { ...prev, members: data.members } : prev)
        }
      } catch (_) {}
    }, 4000)

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'stats') {
          setStats(prev => prev ? { ...prev, events: data.events } : prev)
        }
        if (data.type === 'insight_cards') {
          setInsightCards(data.cards)
        }
        if (data.type === 'followup_options') {
          setFollowUpOptions(data.options)
        }
        if (data.type === 'done') {
          es.close()
          clearInterval(memberPollInterval)
          fetchStats()
        }
      } catch (_) {}
    }

    es.onerror = () => {
      es.close()
      clearInterval(memberPollInterval)
    }
  }

  async function launchCampaign() {
    setLaunching(true)
    try {
      await fetch(`/api/campaigns/${id}/launch`, { method: 'POST' })
      setLaunched(true)
      setStats(prev => prev ? { ...prev, campaign: { ...prev.campaign, status: 'launched' } } : prev)
      startSSE()
    } catch (e) {
      console.error(e)
    } finally {
      setLaunching(false)
    }
  }

  async function launchFollowUp(option: FollowUpOption) {
    setLaunchingFollowUp(option.type)
    try {
      const res = await fetch(`/api/campaigns/${id}/retarget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: option.type,
          customers: option.customers,
          goalText: option.action,
          channel: stats?.campaign.channel || 'WhatsApp'
        })
      })
      const data = await res.json()
      if (data.campaign_id) {
        router.push(`/campaigns/${data.campaign_id}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLaunchingFollowUp(null)
    }
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  const { campaign, events, members } = stats

  const filteredMembers = (members || []).filter(m => {
    if (activeTab === 'all') return true
    if (activeTab === 'clicked') return m.status === 'clicked' || m.status === 'converted'
    if (activeTab === 'read') return m.status === 'read'
    if (activeTab === 'delivered') return m.status === 'delivered'
    if (activeTab === 'failed') return m.status === 'failed'
    return true
  })

  const statusColor = (status: string) => {
    switch (status) {
      case 'converted': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'clicked': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'read': return 'bg-teal-500/10 text-teal-400 border-teal-500/20'
      case 'delivered': return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
      case 'sent': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const followUpColors: Record<string, string> = {
    green: 'border-green-500/20 bg-green-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    amber: 'border-amber-500/20 bg-amber-500/5',
  }

  const followUpButtonColors: Record<string, string> = {
    green: 'bg-green-600 hover:bg-green-500',
    blue: 'bg-blue-600 hover:bg-blue-500',
    amber: 'bg-amber-600 hover:bg-amber-500',
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <header className="border-b border-white/5 px-4 md:px-6 py-4 flex items-center justify-between backdrop-blur-sm bg-[#0A0A0F]/80 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <a href="/" className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center font-bold text-sm">Z</a>
          <span className="font-semibold text-lg tracking-tight">Zuri CRM</span>
          <span className="hidden sm:block text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">AI-powered</span>
        </div>
        <nav className="flex items-center gap-1">
          <a href="/" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Campaigns</a>
          <a href="/customers" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Customers</a>
          <a href="/campaigns" className="px-3 py-1.5 text-sm text-white bg-white/5 rounded-lg font-medium">History</a>
        </nav>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        <a href="/campaigns" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to campaigns
        </a>

        {/* Campaign header */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-1">{campaign.name}</h1>
              <p className="text-gray-400 text-sm">{campaign.goalText}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs px-3 py-1 rounded-full font-medium border ${
                campaign.status === 'launched'
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>{campaign.status}</span>
              <span className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-3 py-1 rounded-full">{campaign.channel}</span>
            </div>
          </div>

          {campaign.aiReasoning && (
            <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-violet-400 text-xs font-medium uppercase tracking-wider mb-2">
                <Zap className="w-3 h-3" />
                AI Reasoning
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{campaign.aiReasoning}</p>
            </div>
          )}

          {campaign.status === 'ready' && !launched && (
            <button
              onClick={launchCampaign}
              disabled={launching}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              {launching ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Launching...</>
              ) : (
                <><Zap className="w-4 h-4" />Launch Campaign ({campaign.memberCount} members)</>
              )}
            </button>
          )}
        </div>

        {/* Live stats */}
        {launched && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard icon={<MessageSquare className="w-4 h-4" />} label="Sent" value={events.sent} color="blue" />
              <StatCard icon={<Users className="w-4 h-4" />} label="Delivered" value={events.delivered} rate={`${campaign.memberCount > 0 ? Math.round((events.delivered / campaign.memberCount) * 100) : 0}%`} color="violet" />
              <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Read" value={events.read} rate={`${events.delivered > 0 ? Math.round((events.read / events.delivered) * 100) : 0}%`} color="teal" />
              <StatCard icon={<MousePointer className="w-4 h-4" />} label="Clicked" value={events.clicked} rate={`${events.read > 0 ? Math.round((events.clicked / events.read) * 100) : 0}%`} color="green" />
              <StatCard icon={<ShoppingBag className="w-4 h-4" />} label="Converted" value={events.order_placed} color="amber" />
              <StatCard icon={<XCircle className="w-4 h-4" />} label="Failed" value={events.failed} color="red" />
            </div>

            {/* Funnel */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-5">Delivery Funnel</h3>
              <div className="space-y-3">
                <FunnelBar label="Sent" value={events.sent} max={campaign.memberCount} color="bg-blue-500" />
                <FunnelBar label="Delivered" value={events.delivered} max={campaign.memberCount} color="bg-violet-500" />
                <FunnelBar label="Read" value={events.read} max={campaign.memberCount} color="bg-teal-500" />
                <FunnelBar label="Clicked" value={events.clicked} max={campaign.memberCount} color="bg-green-500" />
                <FunnelBar label="Converted" value={events.order_placed} max={campaign.memberCount} color="bg-amber-500" />
              </div>
            </div>

            {/* AI Insight Cards Carousel */}
            {insightCards.length > 0 && (
              <InsightCarousel cards={insightCards} />
            )}

            {/* Follow-up options */}
            {followUpOptions.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  AI Recommended Follow-ups
                </div>
                {followUpOptions.map((option) => (
                  <div
                    key={option.type}
                    className={`border rounded-2xl p-5 ${followUpColors[option.color] || 'border-white/8 bg-white/3'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-semibold text-white mb-1">{option.title}</div>
                        <div className="text-sm text-gray-400 leading-relaxed mb-3">{option.description}</div>
                        <div className="flex flex-wrap gap-1">
                          {option.customers.slice(0, 4).map((c: any) => (
                            <span key={c.id} className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">
                              {c.name.split(' ')[0]} · {c.city}
                            </span>
                          ))}
                          {option.customers.length > 4 && (
                            <span className="text-xs text-gray-600 px-2 py-0.5">+{option.customers.length - 4} more</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => launchFollowUp(option)}
                        disabled={launchingFollowUp === option.type}
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${followUpButtonColors[option.color] || 'bg-violet-600 hover:bg-violet-500'}`}
                      >
                        {launchingFollowUp === option.type ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                        Launch Follow-up
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Per-customer messages */}
            {members && members.length > 0 && (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Customer Messages ({members.length})
                  </h3>
                  <div className="flex gap-1 flex-wrap">
                    {(['all', 'clicked', 'read', 'delivered', 'failed'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                          activeTab === tab
                            ? 'bg-violet-600 text-white'
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {tab === 'all' ? `All (${members.length})` :
                         tab === 'clicked' ? `Clicked (${events.clicked})` :
                         tab === 'read' ? `Read (${events.read})` :
                         tab === 'delivered' ? `Delivered (${events.delivered})` :
                         `Failed (${events.failed})`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredMembers.map((m) => (
                    <div key={m.id} className="bg-black/20 border border-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-violet-500/15 border border-violet-500/20 rounded-full flex items-center justify-center text-xs font-medium text-violet-400 flex-shrink-0">
                            {m.customer?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{m.customer?.name}</div>
                            <div className="text-xs text-gray-500">{m.customer?.city} · Rs.{Math.round(m.customer?.totalSpend || 0).toLocaleString()}</div>
                          </div>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor(m.status)}`}>
                          {m.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 leading-relaxed bg-black/20 px-3 py-2 rounded-lg mt-2">
                        {m.personalizedMessage}
                      </div>
                    </div>
                  ))}

                  {filteredMembers.length === 0 && (
                    <div className="text-center py-8 text-gray-600 text-sm">
                      No customers in this category yet
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}


function InsightCarousel({ cards }: { cards: any[] }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % cards.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [cards.length])

  const card = cards[current]
  if (!card) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-violet-400 text-xs font-medium uppercase tracking-wider">
        <TrendingUp className="w-3.5 h-3.5" />
        AI Campaign Insights
      </div>
      <div className={`border rounded-2xl p-5 transition-all duration-500 ${
        card.status === 'good'
          ? 'border-green-500/20 bg-green-500/5'
          : card.status === 'warning'
          ? 'border-amber-500/20 bg-amber-500/5'
          : 'border-red-500/20 bg-red-500/5'
      }`}>
        <div className={`font-semibold text-base mb-2 ${
          card.status === 'good' ? 'text-green-400'
          : card.status === 'warning' ? 'text-amber-400'
          : 'text-red-400'
        }`}>
          {card.status === 'good' ? '✓' : card.status === 'warning' ? '⚠' : '✗'} {card.metric}
        </div>
        <div className="text-sm text-gray-300 leading-relaxed">{card.suggestion}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setCurrent(prev => (prev - 1 + cards.length) % cards.length)}
            className="text-gray-600 hover:text-white transition-colors text-lg px-2"
          >
            ←
          </button>
          <div className="flex gap-1.5">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === current ? 'bg-white w-4' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrent(prev => (prev + 1) % cards.length)}
            className="text-gray-600 hover:text-white transition-colors text-lg px-2"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}


function StatCard({ icon, label, value, color, rate }: any) {
  const colors: any = {
    blue: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
    violet: 'border-violet-500/20 bg-violet-500/5 text-violet-400',
    teal: 'border-teal-500/20 bg-teal-500/5 text-teal-400',
    green: 'border-green-500/20 bg-green-500/5 text-green-400',
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
    red: 'border-red-500/20 bg-red-500/5 text-red-400',
  }
  return (
    <div className={`border rounded-2xl p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-3 opacity-60 text-xs font-medium uppercase tracking-wider">
        {icon}{label}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {rate && <div className="text-xs opacity-50 mt-1">{rate} rate</div>}
    </div>
  )
}

function FunnelBar({ label, value, max, color }: any) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 text-xs text-gray-500 text-right">{label}</div>
      <div className="flex-1 bg-white/5 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-20 text-xs text-gray-500 font-mono">{value} <span className="text-gray-700">({Math.round(pct)}%)</span></div>
    </div>
  )
}