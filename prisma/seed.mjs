import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // --- Admin user ---
  const adminEmail = 'admin@patilfarm.com'
  const password = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password,
      name: 'Patil Farm Owner',
      role: 'ADMIN',
    },
  })
  console.log('Admin user ready ->', adminEmail, '/ admin123')

  // --- Serviceable areas (Mumbai region) ---
  const areas = [
    { city: 'Mumbai', pincode: '400001' },
    { city: 'Mumbai', pincode: '400002' },
    { city: 'Mumbai', pincode: '400003' },
    { city: 'Mumbai', pincode: '400008' },
    { city: 'Mumbai', pincode: '400010' },
    { city: 'Mumbai', pincode: '400012' },
    { city: 'Mumbai', pincode: '400014' },
    { city: 'Mumbai', pincode: '400015' },
    { city: 'Mumbai', pincode: '400017' },
    { city: 'Mumbai', pincode: '400018' },
    { city: 'Mumbai', pincode: '400019' },
    { city: 'Mumbai', pincode: '400020' },
    { city: 'Mumbai', pincode: '400021' },
    { city: 'Mumbai', pincode: '400022' },
    { city: 'Mumbai', pincode: '400025' },
    { city: 'Mumbai', pincode: '400027' },
    { city: 'Mumbai', pincode: '400028' },
    { city: 'Mumbai', pincode: '400031' },
    { city: 'Mumbai', pincode: '400033' },
    { city: 'Mumbai', pincode: '400037' },
    { city: 'Mumbai', pincode: '400042' },
    { city: 'Mumbai', pincode: '400043' },
    { city: 'Mumbai', pincode: '400050' },
    { city: 'Mumbai', pincode: '400051' },
    { city: 'Mumbai', pincode: '400053' },
    { city: 'Mumbai', pincode: '400055' },
    { city: 'Mumbai', pincode: '400057' },
    { city: 'Mumbai', pincode: '400058' },
    { city: 'Mumbai', pincode: '400060' },
    { city: 'Mumbai', pincode: '400061' },
    { city: 'Mumbai', pincode: '400062' },
    { city: 'Mumbai', pincode: '400063' },
    { city: 'Mumbai', pincode: '400064' },
    { city: 'Mumbai', pincode: '400065' },
    { city: 'Mumbai', pincode: '400066' },
    { city: 'Mumbai', pincode: '400067' },
    { city: 'Mumbai', pincode: '400068' },
    { city: 'Mumbai', pincode: '400069' },
    { city: 'Mumbai', pincode: '400070' },
    { city: 'Mumbai', pincode: '400072' },
    { city: 'Mumbai', pincode: '400074' },
    { city: 'Mumbai', pincode: '400075' },
    { city: 'Mumbai', pincode: '400077' },
    { city: 'Mumbai', pincode: '400078' },
    { city: 'Mumbai', pincode: '400080' },
    { city: 'Mumbai', pincode: '400082' },
    { city: 'Mumbai', pincode: '400083' },
    { city: 'Mumbai', pincode: '400084' },
    { city: 'Mumbai', pincode: '400085' },
    { city: 'Mumbai', pincode: '400086' },
    { city: 'Mumbai', pincode: '400088' },
    { city: 'Mumbai', pincode: '400089' },
    { city: 'Mumbai', pincode: '400091' },
    { city: 'Mumbai', pincode: '400092' },
    { city: 'Mumbai', pincode: '400093' },
    { city: 'Mumbai', pincode: '400094' },
    { city: 'Mumbai', pincode: '400095' },
    { city: 'Mumbai', pincode: '400097' },
    { city: 'Mumbai', pincode: '400099' },
    { city: 'Mumbai', pincode: '400101' },
    { city: 'Mumbai', pincode: '400102' },
    { city: 'Mumbai', pincode: '400103' },
    { city: 'Mumbai', pincode: '400104' },
    { city: 'Mumbai', pincode: '400601' },
    { city: 'Mumbai', pincode: '400602' },
    { city: 'Mumbai', pincode: '400603' },
    { city: 'Mumbai', pincode: '400604' },
    { city: 'Mumbai', pincode: '400606' },
    { city: 'Mumbai', pincode: '400607' },
    { city: 'Mumbai', pincode: '400608' },
    { city: 'Mumbai', pincode: '400612' },
    { city: 'Mumbai', pincode: '400615' },
    { city: 'Mumbai', pincode: '400701' },
    { city: 'Mumbai', pincode: '400702' },
    { city: 'Mumbai', pincode: '400703' },
    { city: 'Mumbai', pincode: '400705' },
    { city: 'Mumbai', pincode: '400706' },
    { city: 'Mumbai', pincode: '400708' },
    { city: 'Mumbai', pincode: '400709' },
    { city: 'Mumbai', pincode: '400710' },
    { city: 'Thane', pincode: '400601' },
    { city: 'Thane', pincode: '400604' },
    { city: 'Thane', pincode: '400606' },
    { city: 'Thane', pincode: '400607' },
    { city: 'Thane', pincode: '400608' },
    { city: 'Thane', pincode: '400610' },
    { city: 'Thane', pincode: '400612' },
    { city: 'Thane', pincode: '400615' },
    { city: 'Thane', pincode: '400703' },
  ]

  // dedupe pincodes (keep first)
  const seen = new Set()
  for (const a of areas) {
    if (seen.has(a.pincode)) continue
    seen.add(a.pincode)
    await prisma.serviceableArea.upsert({
      where: { pincode: a.pincode },
      update: { city: a.city },
      create: a,
    })
  }
  console.log(`Serviceable areas ready -> ${seen.size} pincodes`)

  // --- Products ---
  const products = [
    {
      name: 'Devgad Alphonso',
      variety: 'Alphonso',
      origin: 'Devgad, Konkan',
      description:
        'The king of mangoes. GI-tagged, sun-ripened on the tree, honey-sweet with a rich saffron pulp and thin golden skin. Grown naturally in the coastal soil of Devgad.',
      unitType: 'Dozen',
      price: 850,
      stockInDozens: 40,
      imageUrl: '/images/devgad-alphonso.jpg',
      tag: 'Best Seller',
    },
    {
      name: 'Ratnagiri Alphonso',
      variety: 'Alphonso',
      origin: 'Ratnagiri, Konkan',
      description:
        'Famous Ratnagiri Hapus with unmatched aroma, juicy orange-yellow flesh and a perfect sweet-tart balance. Farm-fresh from our own Konkan orchards.',
      unitType: 'Dozen',
      price: 799,
      stockInDozens: 55,
      imageUrl: '/images/ratnagiri-alphonso.jpg',
      tag: 'Famous',
    },
    {
      name: 'Konkan Kesar',
      variety: 'Kesar',
      origin: 'Konkan Region',
      description:
        'Sweet, fibreless pulp with a distinctive saffron hue. A favourite for desserts and shakes. Delivered ripe and ready to enjoy.',
      unitType: 'Dozen',
      price: 549,
      stockInDozens: 60,
      imageUrl: '/images/kesar-mango.jpg',
      tag: 'Value Pack',
    },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: { ...p },
      create: { ...p },
    })
  }
  console.log(`Products ready -> ${products.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
