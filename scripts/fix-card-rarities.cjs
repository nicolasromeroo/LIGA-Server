/*
 * One-off: iguala la rareza de cada carta repartida (PlayerCard.rarity) a la
 * rareza real de su jugador en el catálogo (Player.rarity). Necesario porque
 * antes los sobres sorteaban una rareza propia por carta.
 *
 * Uso (desde back/): node scripts/fix-card-rarities.cjs
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const RARITY_BUCKET = {
  comun: 'COMUN',
  common: 'COMUN',
  rara: 'RARA',
  raro: 'RARA',
  rare: 'RARA',
  epica: 'EPICA',
  epico: 'EPICA',
  epic: 'EPICA',
  legendaria: 'LEGENDARIA',
  legendario: 'LEGENDARIA',
  legendary: 'LEGENDARIA',
};

const normalizeRarity = (r) =>
  RARITY_BUCKET[String(r ?? '').toLowerCase().trim()] ?? 'COMUN';

(async () => {
  const cards = await prisma.playerCard.findMany({ include: { player: true } });
  let fixed = 0;
  for (const card of cards) {
    const expected = normalizeRarity(card.player?.rarity);
    if (card.rarity !== expected) {
      await prisma.playerCard.update({
        where: { id: card.id },
        data: { rarity: expected },
      });
      console.log(
        `Carta #${card.id} (${card.player?.name ?? 'sin jugador'}): ${card.rarity} -> ${expected}`,
      );
      fixed++;
    }
  }
  console.log(`\nListo: ${fixed} de ${cards.length} cartas corregidas.`);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
