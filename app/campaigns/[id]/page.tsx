'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { BarChart3, Users, MessageSquare, MousePointer, ShoppingBag, XCircle, Zap } from 'lucide-react'

interface Stats {
  campaign: {
    id: string
    name: string
    goalText: string
    channel: string
    status: string
    aiReasoning: string
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
  insight: string | null
}

export default function CampaignPage() {
  const { id } = useParams()
  const [stats, setStats] = useState<Stats | null>(null)
  const [launching, setLaunching] = useState(false)
  const [launched, setLaunched] = useState(false)
  const [insight, setInsight] = useState<string | null>(null)

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
        startSSE()
      }
    } catch (e) {
      console.error(e)
    }
  }

  function startSSE() {
    const es = new EventSource(`/api/campaigns/${id}/live`)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'stats') {
          setStats(prev => prev ? { ...prev, events: data.events } : prev)
        }
        if (data.type === 'insight') {
          setInsight(data.insight)
        }
        if (data.type === 'done') {
          es.close()
        }
      } catch (_) {}
    }
    es.onerror = () => es.close()
    return () => es.close()
  }

  async function launchCampaign() {
    setLaunching(true)
    try {
      await fetch(`/api/campaigns/${id}/launch`, { method: 'POST' })
      setLaunched(true)
      setStats(prev => prev ? {
        ...prev,
        campaign: { ...prev.campaign, status: 'launched' }
      } : prev)
      startSSE()
    } catch (e) {
      console.error(e)
    } finally {
      setLaunching(false)
    }
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    )
  }

  const { campaign, events } = stats
  const deliveryRate = campaign.memberCount > 0
    ? Math.round((events.delivered / campaign.memberCount) * 100)
    : 0
  const readRate = events.delivered > 0
    ? Math.round((events.read / events.delivered) * 100)
    : 0
  const clickRate = events.read > 0
    ? Math.round((events.clicked / events.read) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-sm">Z</a>
          <span className="font-semibold text-lg">Zuri CRM</span>
          <span className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full">AI-powered</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-gray-400">
          <a href="/" className="hover:text-white transition-colors">Campaigns</a>
          <a href="/customers" className="hover:text-white transition-colors">Customers</a>
          <a href="/campaigns" className="text-white font-medium">History</a>
        </nav>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Campaign header */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">{campaign.name}</h1>
              <p className="text-gray-400 text-sm">{campaign.goalText}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                campaign.status === 'launched' ? 'bg-green-900 text-green-300' :
                campaign.status === 'ready' ? 'bg-yellow-900 text-yellow-300' :
                'bg-gray-800 text-gray-400'
              }`}>
                {campaign.status}
              </span>
              <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full">
                {campaign.channel}
              </span>
            </div>
          </div>

          {campaign.aiReasoning && (
            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-medium uppercase tracking-wide mb-2">
                <Zap className="w-3 h-3" />
                AI Reasoning
              </div>
              <p className="text-sm text-gray-300">{campaign.aiReasoning}</p>
            </div>
          )}

          {campaign.status === 'ready' && !launched && (
            <button
              onClick={launchCampaign}
              disabled={launching}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {launching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Launch Campaign ({campaign.memberCount} members)
                </>
              )}
            </button>
          )}
        </div>

        {/* Live stats */}
        {launched && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Sent" value={events.sent} total={campaign.memberCount} color="blue" />
              <StatCard icon={<Users className="w-5 h-5" />} label="Delivered" value={events.delivered} total={campaign.memberCount} color="purple" rate={`${deliveryRate}%`} />
              <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Read" value={events.read} total={events.delivered} color="teal" rate={`${readRate}%`} />
              <StatCard icon={<MousePointer className="w-5 h-5" />} label="Clicked" value={events.clicked} total={events.read} color="green" rate={`${clickRate}%`} />
              <StatCard icon={<ShoppingBag className="w-5 h-5" />} label="Converted" value={events.order_placed} total={events.clicked} color="amber" />
              <StatCard icon={<XCircle className="w-5 h-5" />} label="Failed" value={events.failed} total={campaign.memberCount} color="red" />
            </div>

            {/* Funnel */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Delivery Funnel</h3>
              <div className="space-y-3">
                <FunnelBar label="Sent" value={events.sent} max={campaign.memberCount} color="bg-blue-500" />
                <FunnelBar label="Delivered" value={events.delivered} max={campaign.memberCount} color="bg-purple-500" />
                <FunnelBar label="Read" value={events.read} max={campaign.memberCount} color="bg-teal-500" />
                <FunnelBar label="Clicked" value={events.clicked} max={campaign.memberCount} color="bg-green-500" />
                <FunnelBar label="Converted" value={events.order_placed} max={campaign.memberCount} color="bg-amber-500" />
              </div>
            </div>

            {/* AI Insight */}
            {insight && (
              <div className="bg-purple-950 border border-purple-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-medium uppercase tracking-wide mb-3">
                  <Zap className="w-3.5 h-3.5" />
                  AI Campaign Insight
                </div>
                <p className="text-gray-200 text-sm leading-relaxed">{insight}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, total, color, rate }: any) {
  const colorMap: any = {
    blue: 'text-blue-400 bg-blue-950 border-blue-800',
    purple: 'text-purple-400 bg-purple-950 border-purple-800',
    teal: 'text-teal-400 bg-teal-950 border-teal-800',
    green: 'text-green-400 bg-green-950 border-green-800',
    amber: 'text-amber-400 bg-amber-950 border-amber-800',
    red: 'text-red-400 bg-red-950 border-red-800',
  }
  return (
    <div className={`border rounded-2xl p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2 opacity-70 text-xs font-medium uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {rate && <div className="text-xs opacity-60 mt-1">{rate} rate</div>}
    </div>
  )
}

function FunnelBar({ label, value, max, color }: any) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-gray-400 text-right">{label}</div>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-12 text-xs text-gray-400">{value} <span className="text-gray-600">({Math.round(pct)}%)</span></div>
    </div>
  )
}