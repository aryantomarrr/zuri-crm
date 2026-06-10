import { prisma } from '@/lib/db/prisma'

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
    const sqlWhere = nlToSql(nl_query)

    const customers = await prisma.$queryRawUnsafe(
      `SELECT id, name, email, city, "totalSpend", "orderCount", "lastOrderAt"
       FROM "customers" WHERE ${sqlWhere} LIMIT 100`
    ) as any[]

    const avgSpend = customers.length > 0
      ? customers.reduce((s: number, c: any) => s + Number(c.totalSpend), 0) / customers.length
      : 0

    const existing = await prisma.segment.findFirst({ where: { nlQuery: nl_query } })

    const segment = existing ?? await prisma.segment.create({
      data: {
        name: segment_name,
        description: nl_query,
        nlQuery: nl_query,
        sqlWhere,
        memberCount: customers.length,
        createdBy: 'ai',
      },
    })

    return {
      segment_id: segment.id,
      segment_name,
      count: customers.length,
      avg_spend: Math.round(avgSpend),
      sql_where: sqlWhere,
      sample_customers: customers.slice(0, 5).map((c: any) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        totalSpend: Number(c.totalSpend),
        lastOrderAt: c.lastOrderAt,
      })),
      all_customers: customers.map((c: any) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        totalSpend: Number(c.totalSpend),
        lastOrderAt: c.lastOrderAt,
      })),
    }
  } catch (error: any) {
    try {
      const customers = await prisma.customer.findMany({ take: 30 })
      const existing = await prisma.segment.findFirst({ where: { nlQuery: nl_query } })
      const segment = existing ?? await prisma.segment.create({
        data: {
          name: segment_name,
          description: nl_query,
          nlQuery: nl_query,
          sqlWhere: '"orderCount" > 0',
          memberCount: customers.length,
          createdBy: 'ai',
        },
      })
      return {
        segment_id: segment.id,
        segment_name,
        count: customers.length,
        avg_spend: Math.round(customers.reduce((s, c) => s + c.totalSpend, 0) / customers.length),
        sql_where: '"orderCount" > 0',
        sample_customers: customers.slice(0, 5).map(c => ({
          id: c.id, name: c.name, city: c.city,
          totalSpend: c.totalSpend, lastOrderAt: c.lastOrderAt,
        })),
        all_customers: customers.map(c => ({
          id: c.id, name: c.name, city: c.city,
          totalSpend: c.totalSpend, lastOrderAt: c.lastOrderAt,
        })),
      }
    } catch (e: any) {
      return { error: e.message }
    }
  }
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

  const daysRecent = q.match(/ordered?\s+in\s+(?:the\s+)?last\s+(\d+)\s+days?/i)
  if (daysRecent) conditions.push(`"lastOrderAt" > NOW() - INTERVAL '${daysRecent[1]} days'`)

  const ordersOver = q.match(/(?:more than|over|above)\s+(\d+)\s+orders?/i)
  if (ordersOver) conditions.push(`"orderCount" > ${ordersOver[1]}`)

  if (/bought once|one.time buyer|ordered once|single order/.test(q)) {
    conditions.push(`"orderCount" = 1`)
  }

  if (/new customer|joined recently|signed up recently/.test(q)) {
    conditions.push(`"createdAt" > NOW() - INTERVAL '30 days'`)
  }

  if (/high.value|vip|premium|top customer/.test(q)) {
    conditions.push(`"totalSpend" > 5000`)
  }

  if (/lapsed|inactive|win.?back|haven'?t.*back/.test(q) && !conditions.some(c => c.includes('lastOrderAt'))) {
    conditions.push(`"lastOrderAt" < NOW() - INTERVAL '60 days'`)
  }

  const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Chandigarh', 'Surat', 'Kochi']
  for (const city of cities) {
    if (q.includes(city.toLowerCase())) {
      conditions.push(`city = '${city}'`)
      break
    }
  }

  return conditions.length > 0 ? conditions.join(' AND ') : '"orderCount" > 0'
}

async function recommendChannel({ campaign_goal, segment_size, avg_spend }: any) {
  const goal = campaign_goal.toLowerCase()
  let channel = 'WhatsApp'
  let reasoning = ''

  if (goal.includes('newsletter') || goal.includes('lookbook') || goal.includes('collection launch')) {
    channel = 'Email'
    reasoning = `Email recommended for content-rich campaigns. More space for visuals. Expected 35% open rate.`
  } else if (goal.includes('flash sale') || goal.includes('urgent') || goal.includes('today only')) {
    channel = 'SMS'
    reasoning = `SMS recommended for urgency. Fastest open time (~3 min). Expected 45% open rate.`
  } else {
    channel = 'WhatsApp'
    reasoning = `WhatsApp recommended. Highest engagement for Zuri's base. Avg spend Rs.${avg_spend} — personal channel fits. Expected 68% read rate.`
  }

  return {
    channel,
    reasoning,
    expected_read_rate: channel === 'WhatsApp' ? '68%' : channel === 'Email' ? '35%' : '45%',
    expected_click_rate: channel === 'WhatsApp' ? '22%' : channel === 'Email' ? '9%' : '12%',
  }
}

async function draftMessages({ campaign_goal, channel, customers }: any) {
  const messages = customers.map((c: any) => {
    const firstName = c.name.split(' ')[0]
    const daysSince = c.lastOrderAt
      ? Math.floor((Date.now() - new Date(c.lastOrderAt).getTime()) / 86400000)
      : 90
    const offer = extractOffer(campaign_goal)

    let message = ''
    if (channel === 'WhatsApp') {
      if (daysSince > 45 || campaign_goal.toLowerCase().includes('win back')) {
        message = `Hi ${firstName}! We have missed you at Zuri. It has been a while - come back and discover what is new. Exclusive for you: ${offer}. Shop now at zuri.in`
      } else {
        message = `Hi ${firstName}! Something special from Zuri - ${offer} - curated picks we think you will love. Limited time! Shop at zuri.in`
      }
    } else if (channel === 'Email') {
      message = `Dear ${firstName}, As one of our valued customers from ${c.city}, we have an exclusive offer: ${offer}. Visit zuri.in to explore. - Team Zuri`
    } else {
      message = `Hi ${firstName}, Zuri: ${offer}. Shop zuri.in. Reply STOP to opt out.`
    }

    return {
      customerId: c.id,
      customerName: c.name,
      message: message.substring(0, channel === 'SMS' ? 160 : 300),
    }
  })

  return { messages, total: messages.length }
}

function extractOffer(goal: string): string {
  const match = goal.match(/(\d+%\s*off|flat\s*(?:rs\.?|inr)?\s*\d+\s*off|free\s+\w+)/i)
  if (match) return match[0]
  if (goal.toLowerCase().includes('discount')) return 'a special discount'
  if (goal.toLowerCase().includes('sale')) return 'exclusive sale prices'
  return 'an exclusive offer'
}

async function createCampaign({ name, goal_text, segment_id, channel, messages, ai_reasoning }: any) {
  try {
    const campaign = await prisma.campaign.create({
      data: {
        name,
        goalText: goal_text,
        segmentId: segment_id,
        channel,
        status: 'ready',
        aiReasoning: ai_reasoning,
        members: {
          create: messages.map((m: any) => ({
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
      message: `Campaign "${name}" created with ${campaign.members.length} members. Ready to launch!`,
    }
  } catch (error: any) {
    return { error: error.message }
  }
}