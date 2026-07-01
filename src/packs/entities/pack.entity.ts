import { PackType, PackConfig } from '../types/pack.types';

export class Pack {
    static readonly PACK_CONFIGS: Record<PackType, PackConfig> = {
        [PackType.FREE]: {
            cost: 0,
            rarityChance: { common: 0.8, rare: 0.2, legendary: 0.0 }
        },
        [PackType.GOLD]: {
            cost: 100,
            rarityChance: { common: 0.5, rare: 0.4, legendary: 0.1 }
        },
        [PackType.PREMIUM]: {
            cost: 500,
            rarityChance: { common: 0.2, rare: 0.5, legendary: 0.3 }
        },
        [PackType.ELITE]: {
            cost: 1000,
            rarityChance: { common: 0.1, rare: 0.4, legendary: 0.5 }
        },
        [PackType.LEGENDARY]: {
            cost: 5000,
            rarityChance: { common: 0.0, rare: 0.2, legendary: 0.8 }
        }
    };

    id: string;
    type: PackType;
    opened: boolean;
    userId: string;

    constructor(partial: Partial<Pack>) {
        Object.assign(this, partial);
    }

    getConfig(): PackConfig {
        return Pack.PACK_CONFIGS[this.type];
    }
}
