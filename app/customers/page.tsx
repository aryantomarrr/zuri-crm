'use client'

import { useEffect, useState } from 'react'
import { Search, Users } from 'lucide-react'

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
      .then(data => {
        setCustomers(data)
        setFiltered(data)
        setLoading(false)
      })
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
          <a href="/customers" className="text-white font-medium">Customers</a>
          <a href="/campaigns" className="hover:text-white transition-colors">History</a>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-gray-400 text-sm mt-1">Zuri's shopper base</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center">
              <div className="text-xl font-bold text-purple-400">{customers.length}</div>
              <div className="text-xs text-gray-500">Total customers</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center">
              <div className="text-xl font-bold text-green-400">Rs.{Math.round(avgSpend).toLocaleString()}</div>
              <div className="text-xs text-gray-500">Avg spend</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-center">
              <div className="text-xl font-bold text-blue-400">Rs.{Math.round(totalSpend).toLocaleString()}</div>
              <div className="text-xs text-gray-500">Total revenue</div>
            </div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, city, or email..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500"
          />
        </div>

        {loading ? (
          <div className="flex gap-2 justify-center py-20">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">City</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Orders</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total Spend</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const daysSince = c.lastOrderAt
                    ? Math.floor((Date.now() - new Date(c.lastOrderAt).getTime()) / 86400000)
                    : null
                  return (
                    <tr key={c.id} className={`border-b border-gray-800 last:border-0 hover:bg-gray-800 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-900'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-900 rounded-full flex items-center justify-center text-xs font-medium text-purple-300">
                            {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{c.name}</div>
                            <div className="text-xs text-gray-500">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{c.city}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{c.orderCount}</td>
                      <td className="px-4 py-3 text-sm font-medium text-green-400">Rs.{Math.round(c.totalSpend).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">
                        {daysSince !== null ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            daysSince < 30 ? 'bg-green-900 text-green-300' :
                            daysSince < 60 ? 'bg-yellow-900 text-yellow-300' :
                            'bg-red-900 text-red-300'
                          }`}>
                            {daysSince}d ago
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No customers found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}