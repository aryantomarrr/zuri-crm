import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const customers = [
  { name: 'Priya Sharma', email: 'priya.sharma@gmail.com', phone: '9876543210', city: 'Mumbai', gender: 'F' },
  { name: 'Ananya Singh', email: 'ananya.singh@gmail.com', phone: '9876543211', city: 'Delhi', gender: 'F' },
  { name: 'Kavya Reddy', email: 'kavya.reddy@gmail.com', phone: '9876543212', city: 'Hyderabad', gender: 'F' },
  { name: 'Meera Nair', email: 'meera.nair@gmail.com', phone: '9876543213', city: 'Bengaluru', gender: 'F' },
  { name: 'Sneha Patel', email: 'sneha.patel@gmail.com', phone: '9876543214', city: 'Ahmedabad', gender: 'F' },
  { name: 'Riya Joshi', email: 'riya.joshi@gmail.com', phone: '9876543215', city: 'Pune', gender: 'F' },
  { name: 'Pooja Gupta', email: 'pooja.gupta@gmail.com', phone: '9876543216', city: 'Jaipur', gender: 'F' },
  { name: 'Divya Menon', email: 'divya.menon@gmail.com', phone: '9876543217', city: 'Chennai', gender: 'F' },
  { name: 'Shruti Verma', email: 'shruti.verma@gmail.com', phone: '9876543218', city: 'Kolkata', gender: 'F' },
  { name: 'Neha Agarwal', email: 'neha.agarwal@gmail.com', phone: '9876543219', city: 'Mumbai', gender: 'F' },
  { name: 'Isha Kapoor', email: 'isha.kapoor@gmail.com', phone: '9876543220', city: 'Delhi', gender: 'F' },
  { name: 'Tanya Malhotra', email: 'tanya.malhotra@gmail.com', phone: '9876543221', city: 'Bengaluru', gender: 'F' },
  { name: 'Simran Kaur', email: 'simran.kaur@gmail.com', phone: '9876543222', city: 'Chandigarh', gender: 'F' },
  { name: 'Anjali Desai', email: 'anjali.desai@gmail.com', phone: '9876543223', city: 'Surat', gender: 'F' },
  { name: 'Nisha Pillai', email: 'nisha.pillai@gmail.com', phone: '9876543224', city: 'Kochi', gender: 'F' },
  { name: 'Aditi Bose', email: 'aditi.bose@gmail.com', phone: '9876543225', city: 'Kolkata', gender: 'F' },
  { name: 'Preeti Saxena', email: 'preeti.saxena@gmail.com', phone: '9876543226', city: 'Lucknow', gender: 'F' },
  { name: 'Swati Rao', email: 'swati.rao@gmail.com', phone: '9876543227', city: 'Hyderabad', gender: 'F' },
  { name: 'Deepika Iyer', email: 'deepika.iyer@gmail.com', phone: '9876543228', city: 'Chennai', gender: 'F' },
  { name: 'Kritika Sharma', email: 'kritika.sharma@gmail.com', phone: '9876543229', city: 'Jaipur', gender: 'F' },
  { name: 'Mansi Trivedi', email: 'mansi.trivedi@gmail.com', phone: '9876543230', city: 'Ahmedabad', gender: 'F' },
  { name: 'Ritika Chauhan', email: 'ritika.chauhan@gmail.com', phone: '9876543231', city: 'Pune', gender: 'F' },
  { name: 'Sonal Mehta', email: 'sonal.mehta@gmail.com', phone: '9876543232', city: 'Mumbai', gender: 'F' },
  { name: 'Pallavi Jain', email: 'pallavi.jain@gmail.com', phone: '9876543233', city: 'Indore', gender: 'F' },
  { name: 'Ankita Das', email: 'ankita.das@gmail.com', phone: '9876543234', city: 'Kolkata', gender: 'F' },
  { name: 'Bhavna Choudhary', email: 'bhavna.choudhary@gmail.com', phone: '9876543235', city: 'Jodhpur', gender: 'F' },
  { name: 'Chandni Khanna', email: 'chandni.khanna@gmail.com', phone: '9876543236', city: 'Delhi', gender: 'F' },
  { name: 'Dimple Arora', email: 'dimple.arora@gmail.com', phone: '9876543237', city: 'Amritsar', gender: 'F' },
  { name: 'Ekta Pandey', email: 'ekta.pandey@gmail.com', phone: '9876543238', city: 'Varanasi', gender: 'F' },
  { name: 'Garima Srivastava', email: 'garima.srivastava@gmail.com', phone: '9876543239', city: 'Lucknow', gender: 'F' },
  { name: 'Harleen Walia', email: 'harleen.walia@gmail.com', phone: '9876543240', city: 'Bengaluru', gender: 'F' },
  { name: 'Ishita Ghosh', email: 'ishita.ghosh@gmail.com', phone: '9876543241', city: 'Mumbai', gender: 'F' },
  { name: 'Juhi Bajaj', email: 'juhi.bajaj@gmail.com', phone: '9876543242', city: 'Nagpur', gender: 'F' },
  { name: 'Kamya Thakur', email: 'kamya.thakur@gmail.com', phone: '9876543243', city: 'Shimla', gender: 'F' },
  { name: 'Lavanya Krishnan', email: 'lavanya.krishnan@gmail.com', phone: '9876543244', city: 'Chennai', gender: 'F' },
  { name: 'Madhuri Patil', email: 'madhuri.patil@gmail.com', phone: '9876543245', city: 'Pune', gender: 'F' },
  { name: 'Namrata Kulkarni', email: 'namrata.kulkarni@gmail.com', phone: '9876543246', city: 'Nashik', gender: 'F' },
  { name: 'Omisha Dubey', email: 'omisha.dubey@gmail.com', phone: '9876543247', city: 'Bhopal', gender: 'F' },
  { name: 'Poonam Yadav', email: 'poonam.yadav@gmail.com', phone: '9876543248', city: 'Agra', gender: 'F' },
  { name: 'Radhika Mishra', email: 'radhika.mishra@gmail.com', phone: '9876543249', city: 'Allahabad', gender: 'F' },
  { name: 'Sakshi Tiwari', email: 'sakshi.tiwari@gmail.com', phone: '9876543250', city: 'Kanpur', gender: 'F' },
  { name: 'Tanvi Bhatt', email: 'tanvi.bhatt@gmail.com', phone: '9876543251', city: 'Vadodara', gender: 'F' },
  { name: 'Uma Venkatesh', email: 'uma.venkatesh@gmail.com', phone: '9876543252', city: 'Bengaluru', gender: 'F' },
  { name: 'Vaishali Hegde', email: 'vaishali.hegde@gmail.com', phone: '9876543253', city: 'Mangalore', gender: 'F' },
  { name: 'Yamini Subramaniam', email: 'yamini.subramaniam@gmail.com', phone: '9876543254', city: 'Coimbatore', gender: 'F' },
  { name: 'Zara Khan', email: 'zara.khan@gmail.com', phone: '9876543255', city: 'Hyderabad', gender: 'F' },
  { name: 'Aishwarya Pillai', email: 'aishwarya.pillai@gmail.com', phone: '9876543256', city: 'Thiruvananthapuram', gender: 'F' },
  { name: 'Bindiya Rawat', email: 'bindiya.rawat@gmail.com', phone: '9876543257', city: 'Dehradun', gender: 'F' },
  { name: 'Charu Oberoi', email: 'charu.oberoi@gmail.com', phone: '9876543258', city: 'Delhi', gender: 'F' },
  { name: 'Disha Nanda', email: 'disha.nanda@gmail.com', phone: '9876543259', city: 'Bhubaneswar', gender: 'F' },
  { name: 'Esha Rathore', email: 'esha.rathore@gmail.com', phone: '9876543260', city: 'Udaipur', gender: 'F' },
  { name: 'Falak Siddiqui', email: 'falak.siddiqui@gmail.com', phone: '9876543261', city: 'Mumbai', gender: 'F' },
  { name: 'Gunjan Tripathi', email: 'gunjan.tripathi@gmail.com', phone: '9876543262', city: 'Patna', gender: 'F' },
  { name: 'Himani Shukla', email: 'himani.shukla@gmail.com', phone: '9876543263', city: 'Gorakhpur', gender: 'F' },
  { name: 'Indu Ramesh', email: 'indu.ramesh@gmail.com', phone: '9876543264', city: 'Mysore', gender: 'F' },
  { name: 'Jaya Narayanan', email: 'jaya.narayanan@gmail.com', phone: '9876543265', city: 'Chennai', gender: 'F' },
  { name: 'Komal Luthra', email: 'komal.luthra@gmail.com', phone: '9876543266', city: 'Gurgaon', gender: 'F' },
  { name: 'Lipika Chatterjee', email: 'lipika.chatterjee@gmail.com', phone: '9876543267', city: 'Kolkata', gender: 'F' },
  { name: 'Monika Sethi', email: 'monika.sethi@gmail.com', phone: '9876543268', city: 'Noida', gender: 'F' },
  { name: 'Nandini Bhat', email: 'nandini.bhat@gmail.com', phone: '9876543269', city: 'Bengaluru', gender: 'F' },
  { name: 'Ojasvi Tomar', email: 'ojasvi.tomar@gmail.com', phone: '9876543270', city: 'Gwalior', gender: 'F' },
]

const products = [
  { name: 'Floral Anarkali Kurta', category: 'Kurtas', minPrice: 1200, maxPrice: 3500 },
  { name: 'Banarasi Silk Saree', category: 'Sarees', minPrice: 3500, maxPrice: 8000 },
  { name: 'Cotton Printed Kurti', category: 'Kurtas', minPrice: 600, maxPrice: 1500 },
  { name: 'Embroidered Lehenga', category: 'Ethnic Wear', minPrice: 4500, maxPrice: 12000 },
  { name: 'Chiffon Palazzo Set', category: 'Western Wear', minPrice: 1800, maxPrice: 3200 },
  { name: 'Silk Blend Dupatta', category: 'Accessories', minPrice: 400, maxPrice: 1200 },
  { name: 'Designer Salwar Suit', category: 'Ethnic Wear', minPrice: 2200, maxPrice: 5500 },
  { name: 'Linen Shirt Dress', category: 'Western Wear', minPrice: 1400, maxPrice: 2800 },
  { name: 'Georgette Saree', category: 'Sarees', minPrice: 1800, maxPrice: 4500 },
  { name: 'Handloom Cotton Saree', category: 'Sarees', minPrice: 1200, maxPrice: 3000 },
  { name: 'Bandhani Print Kurta', category: 'Kurtas', minPrice: 800, maxPrice: 2000 },
  { name: 'Phulkari Dupatta', category: 'Accessories', minPrice: 600, maxPrice: 1800 },
  { name: 'Rayon Wrap Dress', category: 'Western Wear', minPrice: 1200, maxPrice: 2400 },
  { name: 'Zari Work Blouse', category: 'Accessories', minPrice: 800, maxPrice: 2200 },
  { name: 'Chanderi Silk Kurta', category: 'Kurtas', minPrice: 1600, maxPrice: 4000 },
]

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(daysAgo: number) {
  const date = new Date()
  date.setDate(date.getDate() - randomBetween(0, daysAgo))
  return date
}

function randomPrice(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

async function main() {
  console.log('Seeding Zuri CRM database...')

  await prisma.commEvent.deleteMany()
  await prisma.campaignMember.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.segment.deleteMany()
  await prisma.order.deleteMany()
  await prisma.customer.deleteMany()

  for (const c of customers) {
    const orderCount = randomBetween(1, 8)
    const orders = []
    let totalSpend = 0
    let lastOrderAt = new Date(0)

    for (let i = 0; i < orderCount; i++) {
      const product = products[randomBetween(0, products.length - 1)]
      const amount = randomPrice(product.minPrice, product.maxPrice)
      const createdAt = randomDate(365)
      totalSpend += amount
      if (createdAt > lastOrderAt) lastOrderAt = createdAt
      orders.push({
        productName: product.name,
        category: product.category,
        amount,
        createdAt,
      })
    }

    await prisma.customer.create({
      data: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.city,
        gender: c.gender,
        totalSpend,
        orderCount,
        lastOrderAt,
        orders: {
          create: orders,
        },
      },
    })
  }

  console.log(`Seeded ${customers.length} customers with orders.`)
  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())