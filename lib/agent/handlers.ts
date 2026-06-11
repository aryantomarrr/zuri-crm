import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function handleToolCall(toolName: string, toolInput: any) {
  switch (toolName) {
    case 'build_segment': return await buildSegment(toolInput)
    case 'recommend_channel': return await recommendChannel(toolInput)
    case 'draft_messages': return await draftMessages(toolInput)
    case 'create_campaign': return await createCampaign(toolInput)
    default: return { error: `Unknown tool: ${toolName}` }
  }
}

async function buildSegment({ nl_query, segment_name }: any) {
  try {
    // Use Claude to generate SQL
    const sqlResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Convert this to a PostgreSQL WHERE clause for the "Customer" table.

Columns: id, name, email, phone, city, gender, "totalSpend" (float), "orderCount" (int), "lastOrderAt" (timestamp), "createdAt" (timestamp)

Natural language: "${nl_query}"

Rules:
- Return ONLY the WHERE clause, nothing else
- No SELECT, no FROM, no semicolon  
- Use double quotes for column names
- Use NOW() - INTERVAL 'X days' for date math
- For multiple cities use: city IN ('Mumbai', 'Delhi')
- Example output: "totalSpend" > 2000 AND "lastOrderAt" < NOW() - INTERVAL '60 days'

Output only the WHERE clause, nothing else:`
      }]
    })

    let sqlWhere = (sqlResponse.content[0] as any).text
      .trim()
      .replace(/^WHERE\s+/i, '')
      .replace(/;$/, '')
      .trim()

    console.log('Claude SQL:', sqlWhere)

    const customers = await prisma.$queryRawUnsafe(
      `SELECT id, name, email, city, "totalSpend", "orderCount", "lastOrderAt"
       FROM "Customer" WHERE ${sqlWhere} LIMIT 100`
    ) as any[]

    const avgSpend = customers.length > 0
      ? customers.reduce((s: number, c: any) => s + Number(c.totalSpend), 0) / customers.length
      : 0

    // Plain English explanation
    const explanation = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `In one plain English sentence (no SQL, no technical terms), describe this customer segment for a marketer:
Query: "${nl_query}"
Result: ${customers.length} customers found, average spend Rs.${Math.round(avgSpend)}
Example: "58 customers who spent over Rs.2,000 but went quiet for 60+ days"
Output only the sentence:`
      }]
    })

    const plainEnglish = (explanation.content[0] as any).text.trim()

    const existing = await prisma.segment.findFirst({ where: { nlQuery: nl_query } })
    const segment = existing ?? await prisma.segment.create({
      data: {
        name: segment_name || plainEnglish.slice(0, 50),
        description: plainEnglish,
        nlQuery: nl_query,
        sqlWhere,
        memberCount: customers.length,
        createdBy: 'ai',
      },
    })

    return {
      segment_id: segment.id,
      segment_name: segment.name,
      count: customers.length,
      avg_spend: Math.round(avgSpend),
      sql_where: sqlWhere,
      plain_english: plainEnglish,
      top_cities: getTopCities(customers),
      sample_customers: customers.slice(0, 5).map((c: any) => ({
        id: c.id, name: c.name, city: c.city,
        totalSpend: Number(c.totalSpend),
        lastOrderAt: c.lastOrderAt,
      })),
      all_customers: customers.map((c: any) => ({
        id: c.id, name: c.name, city: c.city,
        totalSpend: Number(c.totalSpend),
        lastOrderAt: c.lastOrderAt,
      })),
    }
  } catch (error: any) {
    console.error('buildSegment error:', error.message)
    const sqlWhere = nlToSql(nl_query)
    try {
      const customers = await prisma.$queryRawUnsafe(
        `SELECT id, name, email, city, "totalSpend", "orderCount", "lastOrderAt"
         FROM "Customer" WHERE ${sqlWhere} LIMIT 100`
      ) as any[]
      const avgSpend = customers.length > 0
        ? customers.reduce((s: number, c: any) => s + Number(c.totalSpend), 0) / customers.length
        : 0
      const segment = await prisma.segment.create({
        data: {
          name: segment_name || 'AI Segment',
          description: nl_query,
          nlQuery: nl_query,
          sqlWhere,
          memberCount: customers.length,
          createdBy: 'ai',
        },
      })
      return {
        segment_id: segment.id,
        segment_name: segment.name,
        count: customers.length,
        avg_spend: Math.round(avgSpend),
        sql_where: sqlWhere,
        plain_english: `${customers.length} customers matching your criteria`,
        top_cities: getTopCities(customers),
        sample_customers: customers.slice(0, 5).map((c: any) => ({
          id: c.id, name: c.name, city: c.city,
          totalSpend: Number(c.totalSpend),
          lastOrderAt: c.lastOrderAt,
        })),
        all_customers: customers.map((c: any) => ({
          id: c.id, name: c.name, city: c.city,
          totalSpend: Number(c.totalSpend),
          lastOrderAt: c.lastOrderAt,
        })),
      }
    } catch (e: any) {
      return { error: e.message }
    }
  }
}

function getTopCities(customers: any[]): string {
  const cityCounts: Record<string, number> = {}
  for (const c of customers) {
    if (c.city) cityCounts[c.city] = (cityCounts[c.city] || 0) + 1
  }
  return Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([city, count]) => `${city} (${count})`)
    .join(', ')
}

function nlToSql(query: string): string {
  const q = query.toLowerCase()
  const conditions: string[] = []

  const spendOver = q.match(/spent?\s+(?:over|more than|above|greater than)\s+(?:rs\.?|inr)?\s*(\d+)/i)
  if (spendOver) conditions.push(`"totalSpend" > ${spendOver[1]}`)

  const spendUnder = q.match(/spent?\s+(?:less than|under|below)\s+(?:rs\.?|inr)?\s*(\d+)/i)
  if (spendUnder) conditions.push(`"totalSpend" < ${spendUnder[1]}`)

  const daysInactive = q.match(/(?:haven'?t|not|didn'?t)\s+ordered?\s+(?:in\s+)?(?:the\s+)?(?:last\s+)?(\d+)\s+days?/i)
  if (daysInactive) conditions.push(`"lastOrderAt" < NOW() - INTERVAL '${daysInactive[1]} days'`)

  if (!daysInactive) {
    const daysRecent = q.match(/ordered?\s+in\s+(?:the\s+)?last\s+(\d+)\s+days?/i)
    if (daysRecent) conditions.push(`"lastOrderAt" > NOW() - INTERVAL '${daysRecent[1]} days'`)
  }

  if (/bought once|one.time buyer|ordered once|single order/.test(q)) {
    conditions.push(`"orderCount" = 1`)
  }

  if (/high.value|vip|premium|top customer/.test(q)) {
    conditions.push(`"totalSpend" > 5000`)
  }

  if (/lapsed|inactive|win.?back/.test(q) && !conditions.some(c => c.includes('lastOrderAt'))) {
    conditions.push(`"lastOrderAt" < NOW() - INTERVAL '60 days'`)
  }

  const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Chandigarh', 'Surat', 'Kochi', 'Gurgaon', 'Noida']
  const foundCities: string[] = []
  for (const city of cities) {
    if (q.includes(city.toLowerCase())) foundCities.push(city)
  }
  if (foundCities.length === 1) conditions.push(`city = '${foundCities[0]}'`)
  else if (foundCities.length > 1) conditions.push(`city IN (${foundCities.map(c => `'${c}'`).join(', ')})`)

  return conditions.length > 0 ? conditions.join(' AND ') : '"orderCount" > 0'
}

async function recommendChannel({ campaign_goal, segment_size, avg_spend }: any) {
  const goal = (campaign_goal || '').toLowerCase()
  let channel = 'WhatsApp'
  let reasoning = ''
  let expectedReadRate = '68%'
  let expectedClickRate = '22%'

  if (goal.includes('newsletter') || goal.includes('lookbook') || goal.includes('collection launch')) {
    channel = 'Email'
    reasoning = `Email recommended — content-rich campaigns with product visuals perform better here. Expected 35% open rate.`
    expectedReadRate = '35%'
    expectedClickRate = '9%'
  } else if (goal.includes('flash sale') || goal.includes('urgent') || goal.includes('today only')) {
    channel = 'SMS'
    reasoning = `SMS recommended — flash sales need instant attention. Average open time: 3 minutes. Expected 45% open rate.`
    expectedReadRate = '45%'
    expectedClickRate = '12%'
  } else {
    const spendTier = avg_spend > 8000 ? 'premium' : avg_spend > 4000 ? 'mid' : 'value'
    reasoning = `WhatsApp recommended — ${spendTier} segment responds best to personal messaging. Expected 68% read rate, 2.3x better than email for win-back campaigns.`
  }

  return { channel, reasoning, expected_read_rate: expectedReadRate, expected_click_rate: expectedClickRate }
}

async function draftMessages({ campaign_goal, channel, customers }: any) {
  if (!customers || customers.length === 0) {
    return { messages: [], total: 0 }
  }

  // Fetch real order history
  const customerIds = customers.map((c: any) => c.id)
  const orders = await prisma.order.findMany({
    where: { customerId: { in: customerIds } },
    orderBy: { createdAt: 'desc' },
  })

  const ordersByCustomer: Record<string, any[]> = {}
  for (const order of orders) {
    if (!ordersByCustomer[order.customerId]) ordersByCustomer[order.customerId] = []
    ordersByCustomer[order.customerId].push(order)
  }

  // Generate messages in batches using Claude
  const batchSize = 10
  const allMessages: any[] = []

  for (let i = 0; i < Math.min(customers.length, 50); i += batchSize) {
    const batch = customers.slice(i, i + batchSize)

    const customerProfiles = batch.map((c: any) => {
      const customerOrders = ordersByCustomer[c.id] || []
      const lastOrder = customerOrders[0]
      const categories = [...new Set(customerOrders.map((o: any) => o.category))].slice(0, 3)
      const daysSince = c.lastOrderAt
        ? Math.floor((Date.now() - new Date(c.lastOrderAt).getTime()) / 86400000)
        : 90

      return {
        id: c.id,
        name: c.name,
        city: c.city,
        totalSpend: c.totalSpend,
        daysSinceLastOrder: daysSince,
        lastProduct: lastOrder?.productName || null,
        lastCategory: lastOrder?.category || null,
        favoriteCategories: categories,
        orderCount: customerOrders.length,
      }
    })

    const prompt = `You are writing personalized WhatsApp messages for Zuri, an Indian women's fashion brand.

Campaign goal: "${campaign_goal}"
Channel: ${channel}

Write ONE personalized message for EACH customer below. Use their real purchase history to make it genuinely personal — mention their last product or favorite category. Keep under 280 chars. Warm, friendly tone. No generic "we missed you" — be specific to their purchases.

Customers:
${customerProfiles.map((c, idx) => `${idx + 1}. ${c.name} (${c.city})
   - Last bought: ${c.lastProduct || 'unknown'} (${c.lastCategory || 'unknown category'})
   - Favorite categories: ${c.favoriteCategories.join(', ') || 'unknown'}
   - Days since last order: ${c.daysSinceLastOrder}
   - Total spend: Rs.${c.totalSpend}`).join('\n\n')}

Respond with a JSON array only, no other text:
[
  {"id": "customer_id", "message": "personalized message here"},
  ...
]`

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })

      const text = (response.content[0] as any).text.trim()
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        for (let j = 0; j < parsed.length; j++) {
          const customer = batch[j]
          const msg = parsed[j]
          allMessages.push({
            customerId: customer.id,
            customerName: customer.name,
            lastProduct: customerProfiles[j].lastProduct,
            message: msg.message || `Hi ${customer.name.split(' ')[0]}! Check out our latest collection at zuri.in`,
          })
        }
      }
    } catch (e: any) {
      console.error('Claude message generation error:', e.message)
      // Fallback
      for (const c of batch) {
        allMessages.push({
          customerId: c.id,
          customerName: c.name,
          message: `Hi ${c.name.split(' ')[0]}! ${campaign_goal} Shop at zuri.in`,
        })
      }
    }
  }

  return { messages: allMessages, total: allMessages.length }
}

async function createCampaign({ name, goal_text, segment_id, channel, messages, ai_reasoning }: any) {
  try {
    let validSegmentId = segment_id
    const segmentExists = segment_id ? await prisma.segment.findUnique({ where: { id: segment_id } }) : null

    if (!segmentExists) {
      const latestSegment = await prisma.segment.findFirst({ orderBy: { createdAt: 'desc' } })
      if (!latestSegment) return { error: 'No segment found. Please try again.' }
      validSegmentId = latestSegment.id
    }

    const validMessages = []
    for (const m of (messages || [])) {
      if (!m.customerId) continue
      const customer = await prisma.customer.findUnique({ where: { id: m.customerId } })
      if (customer) validMessages.push(m)
    }

    if (validMessages.length === 0) {
      const segment = await prisma.segment.findUnique({ where: { id: validSegmentId } })
      const fallbackCustomers = await prisma.$queryRawUnsafe(
        `SELECT id, name FROM "Customer" WHERE ${segment?.sqlWhere || '"orderCount" > 0'} LIMIT 10`
      ) as any[]
      for (const c of fallbackCustomers) {
        validMessages.push({
          customerId: c.id,
          message: `Hi ${(c.name || '').split(' ')[0]}! ${goal_text} Shop at zuri.in`
        })
      }
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: name || 'AI Campaign',
        goalText: goal_text || '',
        segmentId: validSegmentId,
        channel: channel || 'WhatsApp',
        status: 'ready',
        aiReasoning: ai_reasoning || 'AI-generated campaign',
        members: {
          create: validMessages.map((m: any) => ({
            customerId: m.customerId,
            personalizedMessage: m.message,
            status: 'pending',
          })),
        },
      },
      include: { members: true },
    })

    return {
      campaign_id: campaign.id,
      name: campaign.name,
      member_count: campaign.members.length,
      status: 'ready',
      message: `Campaign "${campaign.name}" created with ${campaign.members.length} members. Ready to launch!`,
    }
  } catch (error: any) {
    console.error('createCampaign error:', error.message)
    return { error: error.message }
  }
}