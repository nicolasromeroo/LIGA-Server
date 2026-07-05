const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const user = await prisma.user.create({
      data: { email: 'debug2@example.com', password: '123456', name: 'debug2', role: 'USER', points: 1000 }
    });
    console.log('OK', user);
  } catch (e) {
    console.error('ERR', e);
  } finally {
    await prisma.$disconnect();
  }
})();
