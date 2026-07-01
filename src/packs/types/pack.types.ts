export enum PackType {
    FREE = 'free',
    GOLD = 'gold',
    PREMIUM = 'premium',
    ELITE = 'elite',
    LEGENDARY = 'legendary'
}

export enum Rarity {
    COMMON = 'common',
    RARE = 'rare',
    LEGENDARY = 'legendary'
}

export interface RarityChance {
    common: number;
    rare: number;
    legendary: number;
}

export interface PackConfig {
    cost: number;
    rarityChance: RarityChance;
}