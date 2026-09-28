import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const d = new Date()
  d.setDate(d.getDate()+1)
  const target = d.toISOString().slice(0,10)
  const slot = await prisma.venueSlot.findFirst({ where: { venueId: '1', date: target, startTime: '08:00' }})
  if (slot) {
    await prisma.venueSlot.update({ where: { id: slot.id }, data: { status: 'CLOSED' }})
    console.log('Closed slot:', slot.id)
  } else {
    console.log('Slot not found for', target)
  }
}
main().finally(()=>prisma.$disconnect())
