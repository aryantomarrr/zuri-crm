'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Zap, Users } from 'lucide-react'

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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
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

      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Campaign History</h1>
            <p className="text-gray-400 text-sm mt-1">All campaigns created by the AI agent</p>
          </div>
          <a href="/" className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
            <Zap className="w-4 h-4" />
            New Campaign
          </a>
        </div>

        {loading ? (
          <div className="flex gap-2 justify-center py-20">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No campaigns yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map(c => (
              <a key={c.id} href={`/campaigns/${c.id}`} className="block bg-gray-900 border border-gray-800 hover:border-purple-700 rounded-2xl p-5 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{c.name}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">{c.goalText}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      c.status === 'launched' ? 'bg-green-900 text-green-300' :
                      c.status === 'ready' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-gray-800 text-gray-400'
                    }`}>{c.status}</span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">{c.channel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{c.memberCount} members</span>
                  </div>
                  {c.status === 'launched' && (
                    <>
                      <div className="text-blue-400">Sent: <span className="font-medium">{c.stats.sent}</span></div>
                      <div className="text-purple-400">Delivered: <span className="font-medium">{c.stats.delivered}</span></div>
                      <div className="text-teal-400">Read: <span className="font-medium">{c.stats.read}</span></div>
                      <div className="text-green-400">Clicked: <span className="font-medium">{c.stats.clicked}</span></div>
                      {c.stats.order_placed > 0 && (
                        <div className="text-amber-400">Converted: <span className="font-medium">{c.stats.order_placed}</span></div>
                      )}
                    </>
                  )}
                  <div className="ml-auto text-gray-600 text-xs">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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