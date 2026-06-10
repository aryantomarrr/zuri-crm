import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { totalSpend: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        totalSpend: true,
        orderCount: true,
        lastOrderAt: true,
        createdAt: true,
      }
    })
    return Response.json(customers)
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}