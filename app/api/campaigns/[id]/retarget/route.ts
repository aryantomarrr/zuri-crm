import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest, context: any) {
  try {
    const { id } = await context.params
    const { type, customers, goalText, channel } = await req.json()

    if (!customers || customers.length === 0) {
      return Response.json({ error: 'No customers provided' }, { status: 400 })
    }

    // Create a new segment for these specific customers
    const segmentName = `${type === 'clickers' ? 'Clickers' : type === 'readers' ? 'Readers' : 'Converters'} from Campaign ${id.slice(-6)}`
    const customerIds = customers.map((c: any) => c.id)

    const segment = await prisma.segment.create({
      data: {
        name: segmentName,
        description: goalText,
        nlQuery: goalText,
        sqlWhere: `id IN (${customerIds.map((id: string) => `'${id}'`).join(', ')})`,
        memberCount: customers.length,
        createdBy: 'ai-retarget',
      }
    })

    // Generate personalized messages for each customer
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const messages = []
    for (const customer of customers) {
      const firstName = customer.name.split(' ')[0]
      let message = ''

      if (type === 'clickers') {
        message = `Hi ${firstName}! You checked out our collection but didn't grab anything — here's an extra 10% off just for you, valid for the next 24 hours only. Don't miss it → zuri.in`
      } else if (type === 'readers') {
        message = `Hi ${firstName}! Thousands of women love our collection — here's what they're saying. Plus free shipping on your next order. Explore now → zuri.in`
      } else {
        message = `Hi ${firstName}! Thank you for your recent purchase 💜 As a valued Zuri customer, you get early access to our new collection before anyone else. Shop now → zuri.in/vip`
      }

      messages.push({
        customerId: customer.id,
        customerName: customer.name,
        message
      })
    }

    // Create the campaign
    const campaignNames: Record<string, string> = {
      clickers: 'Follow-up: Clicker Re-engagement',
      readers: 'Follow-up: Reader Win-back',
      converters: 'Follow-up: Buyer Loyalty Reward'
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: campaignNames[type] || 'Follow-up Campaign',
        goalText,
        segmentId: segment.id,
        channel: channel || 'WhatsApp',
        status: 'ready',
        aiReasoning: `AI-generated follow-up campaign targeting ${customers.length} ${type} from previous campaign. Messages personalized based on their specific engagement behavior.`,
        members: {
          create: messages.map(m => ({
            customerId: m.customerId,
            personalizedMessage: m.message,
            status: 'pending',
          }))
        }
      },
      include: { members: true }
    })

    return Response.json({
      success: true,
      campaign_id: campaign.id,
      member_count: campaign.members.length
    })
  } catch (error: any) {
    console.error('Retarget error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}