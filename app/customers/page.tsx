'use client'

import { useEffect, useState } from 'react'
import { Search, Users, TrendingUp, ShoppingBag, MapPin } from 'lucide-react'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  city: string
  totalSpend: number
  orderCount: number
  lastOrderAt: string | null
  createdAt: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filtered, setFiltered] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(data => { setCustomers(data); setFiltered(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    ))
  }, [search, customers])

  const totalSpend = customers.reduce((s, c) => s + c.totalSpend, 0)
  const avgSpend = customers.length > 0 ? totalSpend / customers.length : 0
  const activeCustomers = customers.filter(c => {
    if (!c.lastOrderAt) return false
    return (Date.now() - new Date(c.lastOrderAt).getTime()) < 30 * 86400000
  }).length

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
          <a href="/customers" className="px-2 md:px-3 py-1.5 text-sm text-white bg-white/5 rounded-lg font-medium">Customers</a>
          <a href="/campaigns" className="px-2 md:px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">History</a>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">Zuri's shopper base</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Total</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{customers.length}</div>
            <div className="text-xs text-gray-600 mt-1">customers</div>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Revenue</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-green-400">Rs.{Math.round(totalSpend / 1000)}K</div>
            <div className="text-xs text-gray-600 mt-1">total spend</div>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Avg Spend</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-violet-400">Rs.{Math.round(avgSpend / 100) * 100}</div>
            <div className="text-xs text-gray-600 mt-1">per customer</div>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-3 md:p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2">
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Active</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-amber-400">{activeCustomers}</div>
            <div className="text-xs text-gray-600 mt-1">last 30d</div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, city, or email..."
            className="w-full bg-white/3 border border-white/8 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 placeholder-gray-600 transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex gap-2 justify-center py-20">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="bg-white/2 border border-white/6 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 md:px-5 py-3.5 text-xs font-medium text-gray-600 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 md:px-5 py-3.5 text-xs font-medium text-gray-600 uppercase tracking-wider">City</th>
                  <th className="text-left px-4 md:px-5 py-3.5 text-xs font-medium text-gray-600 uppercase tracking-wider">Orders</th>
                  <th className="text-left px-4 md:px-5 py-3.5 text-xs font-medium text-gray-600 uppercase tracking-wider">Spend</th>
                  <th className="text-left px-4 md:px-5 py-3.5 text-xs font-medium text-gray-600 uppercase tracking-wider">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const daysSince = c.lastOrderAt
                    ? Math.floor((Date.now() - new Date(c.lastOrderAt).getTime()) / 86400000)
                    : null
                  return (
                    <tr key={c.id} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors">
                      <td className="px-4 md:px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-violet-500/15 border border-violet-500/20 rounded-full flex items-center justify-center text-xs font-medium text-violet-400 flex-shrink-0">
                            {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white truncate">{c.name}</div>
                            <div className="text-xs text-gray-600 hidden md:block truncate">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3.5 text-sm text-gray-400">{c.city}</td>
                      <td className="px-4 md:px-5 py-3.5 text-sm text-gray-400">{c.orderCount}</td>
                      <td className="px-4 md:px-5 py-3.5 text-sm font-medium text-green-400">Rs.{Math.round(c.totalSpend).toLocaleString()}</td>
                      <td className="px-4 md:px-5 py-3.5">
                        {daysSince !== null ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            daysSince < 30 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            daysSince < 60 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {daysSince}d ago
                          </span>
                        ) : <span className="text-gray-700">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-600">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No customers found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}