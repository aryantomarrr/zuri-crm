'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Zap, Users, TrendingUp, MessageSquare } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  goalText: string
  channel: string
  status: string
  createdAt: string
  launchedAt: string | null
  memberCount: number
  stats: {
    sent: number
    delivered: number
    read: number
    clicked: number
    order_placed: number
    failed: number
  }
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(data => { setCampaigns(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const totalSent = campaigns.reduce((s, c) => s + c.stats.sent, 0)
  const totalDelivered = campaigns.reduce((s, c) => s + c.stats.delivered, 0)
  const totalClicked = campaigns.reduce((s, c) => s + c.stats.clicked, 0)
  const launched = campaigns.filter(c => c.status === 'launched').length

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <header className="border-b border-white/5 px-4 md:px-6 py-4 flex items-center justify-between backdrop-blur-sm bg-[#0A0A0F]/80 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <a href="/" className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-900/50">Z</a>
          <span className="font-semibold text-lg tracking-tight">Zuri CRM</span>
          <span className="hidden sm:block text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full font-medium">AI-powered</span>
        </div>
        <nav className="flex items-center gap-1">
          <a href="/" className="px-2 md:px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Campaigns</a>
          <a href="/customers" className="px-2 md:px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">Customers</a>
          <a href="/campaigns" className="px-2 md:px-3 py-1.5 text-sm text-white bg-white/5 rounded-lg font-medium">History</a>
        </nav>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Campaign History</h1>
            <p className="text-gray-500 text-sm mt-1">All campaigns created by the AI agent</p>
          </div>
          <a href="/" className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-violet-900/30">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:block">New Campaign</span>
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Total</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{campaigns.length}</div>
            <div className="text-xs text-gray-600 mt-1">{launched} launched</div>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Sent</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{totalSent}</div>
            <div className="text-xs text-gray-600 mt-1">messages</div>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Delivered</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{totalDelivered}</div>
            <div className="text-xs text-gray-600 mt-1">
              {totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0}% rate
            </div>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Clicked</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{totalClicked}</div>
            <div className="text-xs text-gray-600 mt-1">
              {totalDelivered > 0 ? Math.round((totalClicked / totalDelivered) * 100) : 0}% rate
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-2 justify-center py-20">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No campaigns yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => (
              <a key={c.id} href={`/campaigns/${c.id}`}
                className="block bg-white/2 border border-white/6 hover:border-violet-500/30 hover:bg-violet-500/3 rounded-2xl p-4 md:p-5 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className="font-semibold text-white group-hover:text-violet-200 transition-colors truncate">{c.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{c.goalText}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium border ${
                      c.status === 'launched' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      c.status === 'ready' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-white/5 text-gray-400 border-white/10'
                    }`}>{c.status}</span>
                    <span className="hidden sm:block text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-1 rounded-full">{c.channel}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:gap-5 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Users className="w-3 h-3" />
                    <span>{c.memberCount}</span>
                  </div>
                  {c.status === 'launched' && (
                    <>
                      <div className="text-blue-400">Sent: <span className="font-semibold">{c.stats.sent}</span></div>
                      <div className="text-violet-400">Del: <span className="font-semibold">{c.stats.delivered}</span></div>
                      <div className="text-teal-400">Read: <span className="font-semibold">{c.stats.read}</span></div>
                      <div className="text-green-400">Click: <span className="font-semibold">{c.stats.clicked}</span></div>
                    </>
                  )}
                  <div className="ml-auto text-gray-700">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}