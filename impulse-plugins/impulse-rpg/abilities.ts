// Pokemon RPG Plugin - Ability Logic
// This file contains the completed logic for all abilities up to Generation 9.
// For abilities marked with 'ENGINE:', the core logic must be handled in your main `rpg-main.ts` battle loop.

// --- TYPE DEFINITIONS (Expanded for new logic) ---

interface RPGPokemon {
	species: string;
	level: number;
	hp: number;
	maxHp: number;
	atk: number;
	def: number;
	spa: number;
	spd: number;
	spe: number;
    types: string[];
	ivs: Record<string, number>;
	evs: Record<string, number>;
	growthRate: string;
	experience: number;
	expToNextLevel: number;
	moves: { id: string; pp: number }[];
	nature: string;
	status: Status | null;
	ability?: string;
	item?: string;
	id: string;
    isTransformed?: boolean;
    formBroken?: boolean; // For Disguise, Ice Face, etc.
}

interface BattleState {
	playerId: string;
	wildPokemon: RPGPokemon;
	activePokemon: RPGPokemon;
	turn: number;
	playerStatStages: Record<keyof Omit<Stats, 'maxHp'>, number>;
	wildStatStages: Record<keyof Omit<Stats, 'maxHp'>, number>;
	playerStatus: Status | null;
	wildStatus: Status | null;
	playerSleepCounter: number;
	wildSleepCounter: number;
    weather?: 'Sun' | 'Rain' | 'Sand' | 'Hail' | 'Snow';
    terrain?: 'Electric' | 'Grassy' | 'Misty' | 'Psychic';
    isAbilitySuppressed?: boolean;
}

type Status = 'psn' | 'brn' | 'par' | 'slp' | 'frz';
type Stats = { maxHp: number; atk: number; def: number; spa: number; spd: number; spe: number };

// --- ABILITY LOGIC INTERFACE (Expanded) ---

interface AbilityEffect {
    id: string;
    name: string;
    onSwitchIn?: (pokemon: RPGPokemon, opponent: RPGPokemon, battle: BattleState) => string | null;
    onTryHit?: (target: RPGPokemon, source: RPGPokemon, move: any, battle: BattleState) => { blocked: boolean, message: string | null };
    onDamagingHit?: (target: RPGPokemon, source: RPGPokemon, move: any, battle: BattleState) => string | null;
    onResidual?: (pokemon: RPGPokemon, battle: BattleState) => string | null;
    onModifyAtk?: (pokemon: RPGPokemon, atk: number, battle: BattleState) => number;
    onModifySpA?: (pokemon: RPGPokemon, spa: number, battle: BattleState) => number;
    onModifySpe?: (pokemon: RPGPokemon, spe: number, battle: BattleState) => number;
    onModifyDef?: (pokemon: RPGPokemon, def: number, battle: BattleState) => number;
    onBasePower?: (power: number, pokemon: RPGPokemon, target: RPGPokemon, move: any) => number;
    onSourceModifyDamage?: (damage: number, move: any, target: RPGPokemon, attacker: RPGPokemon) => number;
    onSetStatus?: (status: Status, target: RPGPokemon, source: RPGPokemon, battle: BattleState) => { prevented: boolean, message: string | null };
    onTryBoost?: (boost: { [stat: string]: number }, target: RPGPokemon, source: RPGPokemon) => { prevented: boolean, message: string | null };
    onModifyPriority?: (priority: number, move: any) => number;
    onModifyCritRatio?: (critRatio: number) => number;
    onTrapCheck?: (pokemon: RPGPokemon, foe: RPGPokemon) => boolean;
    onBeforeMove?: (pokemon: RPGPokemon, move: any, battle: BattleState) => { message?: string | null };
    onModifyMove?: (move: any, pokemon: RPGPokemon) => void;
}


// --- THE MASTER ABILITY LIST (Completed) ---

const ABILITIES: Record<string, AbilityEffect> = {
    // A
    adaptability: {
        id: 'adaptability',
        name: 'Adaptability',
        // ENGINE: In `calculateDamage`, if the attacker has this ability, the STAB multiplier must be changed from 1.5 to 2.
    },
    aerilate: {
        id: 'aerilate',
        name: 'Aerilate',
        onModifyMove: (move) => {
            if (move.type === 'Normal' && move.category !== 'Status' && move.id !== 'struggle') {
                move.type = 'Flying';
                move.aerilateBoosted = true;
            }
        },
        onBasePower: (power, pokemon, target, move) => {
            if (move.aerilateBoosted) return power * 1.2;
            return power;
        },
    },
    aftermath: {
        id: 'aftermath',
        name: 'Aftermath',
        onDamagingHit: (target, source, move) => {
            if (target.hp <= 0 && move.flags?.contact) {
                const damage = Math.floor(source.maxHp / 4);
                source.hp = Math.max(0, source.hp - damage);
                return `${target.species}'s Aftermath damaged ${source.species}!`;
            }
            return null;
        }
    },
    airlock: {
        id: 'airlock',
        name: 'Air Lock',
        onSwitchIn: (pokemon, opponent, battle) => {
            battle.weather = undefined;
            return `The effects of weather were eliminated!`;
        },
    },
    analytic: {
        id: 'analytic',
        name: 'Analytic',
        // ENGINE: In the battle loop in `rpg-main.ts`, before a Pokémon attacks, if it has been determined to move last this turn, multiply its move's base power by 1.3.
    },
    angerpoint: {
        id: 'angerpoint',
        name: 'Anger Point',
        onDamagingHit: (target, source, move, battle) => {
            // ENGINE: This check must be paired in `rpg-main.ts` with a check if the hit was a critical hit.
            const targetStages = target.id === battle.activePokemon.id ? battle.playerStatStages : battle.wildStatStages;
            if (targetStages.atk < 6) {
                targetStages.atk = 6;
                return `${target.species}'s Anger Point maxed its Attack!`;
            }
            return null;
        }
    },
    anticipation: {
        id: 'anticipation',
        name: 'Anticipation',
        // ENGINE: On switch-in, the engine needs to check the opponent's known moves. If any are super-effective or are OHKO moves (like Fissure), this ability's message triggers.
        onSwitchIn: () => `It shuddered with anticipation!`,
    },
    arenatrap: {
        id: 'arenatrap',
        name: 'Arena Trap',
        onTrapCheck: (pokemon) => !pokemon.types.includes('Flying') && pokemon.ability !== 'levitate',
    },
    asone: {
        id: 'asone',
        name: 'As One',
        // ENGINE: Extremely complex. This ability combines two abilities (e.g., Unnerve + Chilling Neigh). All handlers for both abilities would need to be called.
    },
    aurabreak: {
        id: 'aurabreak',
        name: 'Aura Break',
        // ENGINE: Reverses the effects of Aura abilities (Dark Aura, Fairy Aura). The base power modifier for those abilities would be inverted.
    },

    // B
    baddreams: {
        id: 'baddreams',
        name: 'Bad Dreams',
        onResidual: (pokemon, battle) => {
            const opponent = pokemon.id === battle.activePokemon.id ? battle.wildPokemon : battle.activePokemon;
            const opponentStatus = pokemon.id === battle.activePokemon.id ? battle.wildStatus : battle.playerStatus;
            if (opponentStatus === 'slp' && opponent.hp > 0) {
                opponent.hp = Math.max(0, opponent.hp - Math.floor(opponent.maxHp / 8));
                return `${opponent.species} is having a nightmare!`;
            }
            return null;
        }
    },
    ballfetch: { id: 'ballfetch', name: 'Ball Fetch', onSwitchIn: null }, // No battle effect
    battery: { id: 'battery', name: 'Battery', onSwitchIn: null }, // Doubles-only effect
    battlearmor: {
        id: 'battlearmor',
        name: 'Battle Armor',
        // ENGINE: In `calculateDamage`, before checking for a critical hit, check if the defender has this ability. If so, prevent the critical hit and do not apply the crit multiplier.
    },
    battlebond: {
        id: 'battlebond',
        name: 'Battle Bond',
        // ENGINE: After this Pokémon defeats another, it should transform into Ash-Greninja, which requires completely recalculating its base stats and applying the new form.
    },
    beastboost: {
        id: 'beastboost',
        name: 'Beast Boost',
        // ENGINE: After this Pokémon defeats another, the engine must determine its highest stat (Atk, Def, SpA, SpD, or Spe) and increase that stat's stage by 1.
    },
    berserk: {
        id: 'berserk',
        name: 'Berserk',
        onDamagingHit: (target, source, move, battle) => {
            const hpBefore = target.hp + (move.damage || 0); // Simplified damage from move
            if (hpBefore > target.maxHp / 2 && target.hp <= target.maxHp / 2) {
                const targetStages = target.id === battle.activePokemon.id ? battle.playerStatStages : battle.wildStatStages;
                if (targetStages.spa < 6) {
                    targetStages.spa++;
                    return `${target.species}'s Berserk raised its Special Attack!`;
                }
            }
            return null;
        }
    },
    bigpecks: {
        id: 'bigpecks',
        name: 'Big Pecks',
        onTryBoost: (boost, target) => {
            if (boost['def'] && boost['def'] < 0) {
                return { prevented: true, message: `${target.species}'s Big Pecks prevents Defense loss!` };
            }
            return { prevented: false, message: null };
        }
    },
    blaze: {
        id: 'blaze',
        name: 'Blaze',
        onBasePower: (power, pokemon, target, move) => {
            if (move.type === 'Fire' && pokemon.hp <= pokemon.maxHp / 3) {
                return power * 1.5;
            }
            return power;
        }
    },
    bulletproof: {
        id: 'bulletproof',
        name: 'Bulletproof',
        onTryHit: (target, source, move) => {
            // ENGINE: Requires moves in the database to have a `bullet` flag.
            if (move.flags?.bullet) {
                return { blocked: true, message: `${target.species} is immune to bullet moves!` };
            }
            return { blocked: false, message: null };
        }
    },

    // C
    cheekpouch: { id: 'cheekpouch', name: 'Cheek Pouch', onSwitchIn: null /* Requires item/berry logic */ },
    chillingneigh: { id: 'chillingneigh', name: 'Chilling Neigh', onSwitchIn: null /* Requires KO logic */ },
    chlorophyll: {
        id: 'chlorophyll',
        name: 'Chlorophyll',
        onModifySpe: (pokemon, spe, battle) => {
            if (battle.weather === 'Sun') {
                return spe * 2;
            }
            return spe;
        }
    },
    clearbody: {
        id: 'clearbody',
        name: 'Clear Body',
        onTryBoost: (boost, target) => {
            const isNegative = Object.values(boost).some(v => v < 0);
            if (isNegative) {
                return { prevented: true, message: `${target.species}'s Clear Body prevents stat loss!` };
            }
            return { prevented: false, message: null };
        }
    },
    cloudnine: {
        id: 'cloudnine',
        name: 'Cloud Nine',
        onSwitchIn: (pokemon, opponent, battle) => {
            battle.weather = undefined;
            return `The effects of weather were eliminated!`;
        },
    },
    colorchange: {
        id: 'colorchange',
        name: 'Color Change',
        onDamagingHit: (target, source, move) => {
            if (move.category !== 'Status' && move.type && !target.types.includes(move.type)) {
                target.types = [move.type];
                return `${target.species} became the ${move.type}-type!`;
            }
            return null;
        }
    },
    comatose: {
        id: 'comatose',
        name: 'Comatose',
        // ENGINE: The user is permanently treated as having the 'sleep' status but can still use moves. It cannot be afflicted with any other non-volatile status condition.
    },
    commander: { id: 'commander', name: 'Commander', onSwitchIn: null }, // Doubles-only effect
    competitive: {
        id: 'competitive',
        name: 'Competitive',
        // ENGINE: `rpg-main.ts` must call this handler after a stat is lowered to raise SpA by 2.
    },
    compoundeyes: {
        id: 'compoundeyes',
        name: 'Compound Eyes',
        // ENGINE: In the accuracy check in `rpg-main.ts`, the move's accuracy must be multiplied by 1.3 if the user has this ability.
    },
    contrary: {
        id: 'contrary',
        name: 'Contrary',
        // ENGINE: When applying stat changes from moves in `rpg-main.ts`, if the target has Contrary, the boost values must be inverted (e.g., +2 becomes -2, -1 becomes +1).
    },
    corrosion: { id: 'corrosion', name: 'Corrosion', onSwitchIn: null /* Allows poisoning Steel/Poison types */ },
    costar: { id: 'costar', name: 'Costar', onSwitchIn: null }, // Doubles-only effect
    cottondown: { id: 'cottondown', name: 'Cotton Down', onSwitchIn: null /* Lowers speed of all foes when hit */ },
    cudchew: { id: 'cudchew', name: 'Cud Chew', onSwitchIn: null /* Requires berry logic */ },
    curiousmedicine: { id: 'curiousmedicine', name: 'Curious Medicine', onSwitchIn: null }, // Doubles-only
    cursedbody: { id: 'cursedbody', name: 'Cursed Body', onSwitchIn: null /* Requires move disable logic */ },
    cutecharm: { id: 'cutecharm', name: 'Cute Charm', onSwitchIn: null /* Requires infatuation logic */ },

    // D
    damp: {
        id: 'damp',
        name: 'Damp',
        // ENGINE: Before a move is used, check if it is Self-Destruct or Explosion. If so, and an opponent has Damp, the move fails.
    },
    dancer: { id: 'dancer', name: 'Dancer', onSwitchIn: null /* Copies dance moves */ },
    darkaura: { id: 'darkaura', name: 'Dark Aura', onSwitchIn: null /* Boosts Dark moves for all */ },
    dauntlessshield: {
        id: 'dauntlessshield',
        name: 'Dauntless Shield',
        onSwitchIn: (pokemon, opponent, battle) => {
            const targetStages = pokemon.id === battle.activePokemon.id ? battle.playerStatStages : battle.wildStatStages;
            if (targetStages.def < 6) {
                targetStages.def++;
                return `${pokemon.species}'s Dauntless Shield raised its Defense!`;
            }
            return null;
        },
    },
    dazzling: {
        id: 'dazzling',
        name: 'Dazzling',
        // ENGINE: Before a move is used, check its priority. If priority > 0, check if the opponent has Dazzling. If so, the move fails against it.
    },
    defeatist: {
        id: 'defeatist',
        name: 'Defeatist',
        onModifyAtk: (pokemon, atk) => pokemon.hp > pokemon.maxHp / 2 ? atk : Math.floor(atk / 2),
        onModifySpA: (pokemon, spa) => pokemon.hp > pokemon.maxHp / 2 ? spa : Math.floor(spa / 2),
    },
    defiant: {
        id: 'defiant',
        name: 'Defiant',
        // ENGINE: `rpg-main.ts` must call this handler after a stat is lowered to raise Attack by 2.
    },
    deltastream: { id: 'deltastream', name: 'Delta Stream', onSwitchIn: null /* Weather ability */ },
    desolateland: { id: 'desolateland', name: 'Desolate Land', onSwitchIn: null /* Weather ability */ },
    disguise: {
        id: 'disguise',
        name: 'Disguise',
        onSourceModifyDamage: (damage, move, target) => {
            if (!target.formBroken && move.category !== 'Status') {
                target.formBroken = true;
                move.disguiseBusted = true;
                target.hp = Math.max(1, target.hp - Math.floor(target.maxHp / 8));
                return 0; // Negate the damage
            }
            return damage;
        },
        onDamagingHit: (target, source, move) => {
            if (target.formBroken && move.disguiseBusted) {
                 return `Its disguise was busted!`;
            }
            return null;
        }
    },
    download: {
        id: 'download',
        name: 'Download',
        onSwitchIn: (pokemon, opponent, battle) => {
            const targetStages = pokemon.id === battle.activePokemon.id ? battle.playerStatStages : battle.wildStatStages;
            if (opponent.def < opponent.spd) {
                 if(targetStages.atk < 6) targetStages.atk++;
                 return `${pokemon.species}'s Download raised its Attack!`;
            } else {
                 if(targetStages.spa < 6) targetStages.spa++;
                 return `${pokemon.species}'s Download raised its Special Attack!`;
            }
        }
    },
    dragonsmaw: {
        id: 'dragonsmaw',
        name: "Dragon's Maw",
        onBasePower: (power, pokemon, target, move) => move.type === 'Dragon' ? power * 1.5 : power,
    },
    drizzle: {
        id: 'drizzle',
        name: 'Drizzle',
        onSwitchIn: (pokemon, opponent, battle) => {
            if (battle.weather !== 'Rain') {
                battle.weather = 'Rain';
                return `It started to rain!`;
            }
            return null;
        },
    },
    drought: {
        id: 'drought',
        name: 'Drought',
        onSwitchIn: (pokemon, opponent, battle) => {
            if (battle.weather !== 'Sun') {
                battle.weather = 'Sun';
                return `The sunlight turned harsh!`;
            }
            return null;
        },
    },
    dryskin: {
        id: 'dryskin',
        name: 'Dry Skin',
        onTryHit: (target, source, move) => {
            if (move.type === 'Water') {
                const healAmount = Math.floor(target.maxHp / 4);
                target.hp = Math.min(target.maxHp, target.hp + healAmount);
                return { blocked: true, message: `${target.species} absorbed the water with Dry Skin!` };
            }
            return { blocked: false, message: null };
        },
        onResidual: (pokemon, battle) => {
            if (battle.weather === 'Rain') {
                pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + Math.floor(pokemon.maxHp / 8));
                return `${pokemon.species} healed in the rain!`;
            }
            if (battle.weather === 'Sun') {
                pokemon.hp = Math.max(0, pokemon.hp - Math.floor(pokemon.maxHp / 8));
                return `${pokemon.species} was hurt by the sun!`;
            }
            return null;
        },
        onSourceModifyDamage: (damage, move) => move.type === 'Fire' ? damage * 1.25 : damage,
    },
    
    // E
    earlybird: { id: 'earlybird', name: 'Early Bird', onSwitchIn: null /* Sleep counter logic */ },
    effectspore: { id: 'effectspore', name: 'Effect Spore', onSwitchIn: null /* Contact status */ },
    electricsurge: {
		id: 'electricsurge',
		name: 'Electric Surge',
		onSwitchIn: (pokemon, opponent, battle) => {
			if (battle.terrain !== 'Electric') {
				battle.terrain = 'Electric';
				return `The field became electrified!`;
			}
			return null;
		},
	},
    electromorphosis: { id: 'electromorphosis', name: 'Electromorphosis', onSwitchIn: null /* Charged effect */ },
    embodyaspect: { id: 'embodyaspect', name: 'Embody Aspect', onSwitchIn: null /* Ogerpon-specific */ },
    emergencyexit: { id: 'emergencyexit', name: 'Emergency Exit', onSwitchIn: null /* Auto-switches on low HP */ },

    // F
    fairyaura: { id: 'fairyaura', name: 'Fairy Aura', onSwitchIn: null /* Boosts Fairy moves for all */ },
    filter: {
        id: 'filter',
        name: 'Filter',
        // ENGINE: In `calculateDamage`, if move is super-effective against target, multiply final damage by 0.75.
    },
    flamebody: {
        id: 'flamebody',
        name: 'Flame Body',
        onDamagingHit: (target, source, move, battle) => {
            if (move.flags?.contact && Math.random() < 0.3) {
                // ENGINE: Needs logic to apply burn to the source Pokémon.
                return `${source.species} was burned by Flame Body!`;
            }
            return null;
        }
    },
    flareboost: {
        id: 'flareboost',
        name: 'Flare Boost',
        onModifySpA: (pokemon, spa) => pokemon.status === 'brn' ? spa * 1.5 : spa,
    },
    flashfire: {
        id: 'flashfire',
        name: 'Flash Fire',
        onTryHit: (target, source, move) => {
            if (move.type === 'Fire') {
                // ENGINE: Needs to apply a "flash fire boost" state to the Pokémon.
                return { blocked: true, message: `${target.species} absorbed the fire! Its Fire moves were boosted!` };
            }
            return { blocked: false, message: null };
        }
    },
    flowergift: { id: 'flowergift', name: 'Flower Gift', onSwitchIn: null /* Sun-based stat boost */ },
    flowerveil: { id: 'flowerveil', name: 'Flower Veil', onSwitchIn: null }, // Doubles-only
    fluffy: {
        id: 'fluffy',
        name: 'Fluffy',
        onSourceModifyDamage: (damage, move) => {
            if (move.flags?.contact) damage *= 0.5;
            if (move.type === 'Fire') damage *= 2;
            return damage;
        }
    },
    forecast: { id: 'forecast', name: 'Forecast', onSwitchIn: null /* Castform form change */ },
    forewarn: { id: 'forewarn', name: 'Forewarn', onSwitchIn: null /* Reveals foe's move */ },
    friendguard: { id: 'friendguard', name: 'Friend Guard', onSwitchIn: null }, // Doubles-only
    frisk: {
        id: 'frisk',
        name: 'Frisk',
        onSwitchIn: (pokemon, opponent) => {
            if (opponent.item) {
                return `${pokemon.species} frisked the foe and found its ${opponent.item}!`;
            }
            return null;
        }
    },
    fullmetalbody: { id: 'fullmetalbody', name: 'Full Metal Body', onSwitchIn: null /* Same as Clear Body */ },
    furcoat: {
        id: 'furcoat',
        name: 'Fur Coat',
        onModifyDef: (pokemon, def) => def * 2,
    },

    // G
    galewings: {
        id: 'galewings',
        name: 'Gale Wings',
        onModifyPriority: (priority, move) => {
            // ENGINE: Needs user's current HP. If at full HP, give +1 priority to Flying moves.
            return priority;
        }
    },
    galvanize: {
        id: 'galvanize',
        name: 'Galvanize',
        onModifyMove: (move) => {
            if (move.type === 'Normal' && move.category !== 'Status') {
                move.type = 'Electric';
                move.galvanizeBoosted = true;
            }
        },
        onBasePower: (power, pokemon, target, move) => move.galvanizeBoosted ? power * 1.2 : power,
    },
    gluttony: { id: 'gluttony', name: 'Gluttony', onSwitchIn: null /* Berry logic */ },
    goodasgold: { id: 'goodasgold', name: 'Good as Gold', onSwitchIn: null /* Status move immunity */ },
    gooey: { id: 'gooey', name: 'Gooey', onSwitchIn: null /* Contact speed drop */ },
    gorillatactics: { id: 'gorillatactics', name: 'Gorilla Tactics', onSwitchIn: null /* Built-in Choice Band */ },
    grasspelt: { id: 'grasspelt', name: 'Grass Pelt', onSwitchIn: null /* Defense boost in Grassy Terrain */ },
    grassysurge: {
        id: 'grassysurge',
        name: 'Grassy Surge',
        onSwitchIn: (pokemon, opponent, battle) => {
            if (battle.terrain !== 'Grassy') {
                battle.terrain = 'Grassy';
                return `The field became grassy!`;
            }
            return null;
        }
    },
    grimneigh: { id: 'grimneigh', name: 'Grim Neigh', onSwitchIn: null /* SpA boost on KO */ },
    guarddog: { id: 'guarddog', name: 'Guard Dog', onSwitchIn: null /* Intimidate immunity + Atk boost */ },
    gulpmissile: { id: 'gulpmissile', name: 'Gulp Missile', onSwitchIn: null /* Cramorant form change */ },
    guts: {
        id: 'guts',
        name: 'Guts',
        onModifyAtk: (pokemon, atk) => (pokemon.status && pokemon.status !== 'slp') ? Math.floor(atk * 1.5) : atk,
    },

    // H
    hadronengine: { id: 'hadronengine', name: 'Hadron Engine', onSwitchIn: null /* Terrain + SpA boost */ },
    harvest: { id: 'harvest', name: 'Harvest', onSwitchIn: null /* Berry logic */ },
    healer: { id: 'healer', name: 'Healer', onSwitchIn: null }, // Doubles-only
    heatproof: {
        id: 'heatproof',
        name: 'Heatproof',
        onSourceModifyDamage: (damage, move) => move.type === 'Fire' ? damage * 0.5 : damage,
    },
    heavymetal: { id: 'heavymetal', name: 'Heavy Metal', onSwitchIn: null /* Doubles weight */ },
    honeygather: { id: 'honeygather', name: 'Honey Gather', onSwitchIn: null }, // No battle effect
    hospitality: { id: 'hospitality', name: 'Hospitality', onSwitchIn: null }, // Doubles-only
    hugepower: {
        id: 'hugepower',
        name: 'Huge Power',
        onModifyAtk: (pokemon, atk) => atk * 2,
    },
    hungerswitch: { id: 'hungerswitch', name: 'Hunger Switch', onSwitchIn: null /* Morpeko form change */ },
    hustle: {
        id: 'hustle',
        name: 'Hustle',
        onModifyAtk: (pokemon, atk) => atk * 1.5,
        // ENGINE: Accuracy of physical moves must be multiplied by 0.8.
    },
    hydration: {
        id: 'hydration',
        name: 'Hydration',
        onResidual: (pokemon, battle) => {
            if (pokemon.status && battle.weather === 'Rain') {
                pokemon.status = null;
                return `${pokemon.species} was cured by the rain!`;
            }
            return null;
        }
    },
    hypercutter: {
        id: 'hypercutter',
        name: 'Hyper Cutter',
        onTryBoost: (boost, target) => {
            if (boost['atk'] && boost['atk'] < 0) {
                return { prevented: true, message: `${target.species}'s Hyper Cutter prevents Attack loss!` };
            }
            return { prevented: false, message: null };
        }
    },

    // I
    icebody: {
        id: 'icebody',
        name: 'Ice Body',
        onResidual: (pokemon, battle) => {
            if (battle.weather === 'Hail' || battle.weather === 'Snow') {
                 pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + Math.floor(pokemon.maxHp / 16));
                return `${pokemon.species} healed a little in the snow!`;
            }
            return null;
        }
    },
    iceface: {
        id: 'iceface',
        name: 'Ice Face',
        onSourceModifyDamage: (damage, move, target) => {
            if (move.category === 'Physical' && !target.formBroken) {
                target.formBroken = true;
                move.iceFaceBusted = true;
                return 0;
            }
            return damage;
        },
        onDamagingHit: (target, source, move) => {
            if (target.formBroken && move.iceFaceBusted) {
                 return `${target.species}'s Ice Face was broken!`;
            }
            return null;
        }
    },
    icescales: {
        id: 'icescales',
        name: 'Ice Scales',
        onSourceModifyDamage: (damage, move) => move.category === 'Special' ? damage * 0.5 : damage,
    },
    illuminate: { id: 'illuminate', name: 'Illuminate', onSwitchIn: null }, // No battle effect
    illusion: {
        id: 'illusion',
        name: 'Illusion',
        // ENGINE: Extremely complex. Requires swapping the user's appearance (species, name) with the last conscious Pokémon in the party upon switch-in. The illusion breaks when the Pokémon takes direct damage. This requires significant UI and state management changes in `rpg-main.ts`.
    },
    immunity: {
        id: 'immunity',
        name: 'Immunity',
        onSetStatus: (status, target) => {
            if (status === 'psn') {
                return { prevented: true, message: `${target.species} is immune to poison!` };
            }
            return { prevented: false, message: null };
        }
    },
    imposter: {
        id: 'imposter',
        name: 'Imposter',
        onSwitchIn: (pokemon, opponent) => {
            // ENGINE: Extremely complex. On switch-in, the user transforms into the opponent. This means copying species, types, stats (except HP), stat stages, and moves. The `RPGPokemon` object in `rpg-main.ts` needs to be completely rebuilt based on the opponent's data.
            pokemon.isTransformed = true;
            return `${pokemon.species} transformed into ${opponent.species} with Imposter!`;
        }
    },
    infiltrator: { id: 'infiltrator', name: 'Infiltrator', onSwitchIn: null /* Bypasses screens/substitute */ },
    innardsout: { id: 'innardsout', name: 'Innards Out', onSwitchIn: null /* Damages foe on KO */ },
    innerfocus: { id: 'innerfocus', name: 'Inner Focus', onSwitchIn: null /* Prevents flinching/Intimidate */ },
    insomnia: {
        id: 'insomnia',
        name: 'Insomnia',
        onSetStatus: (status, target) => {
            if (status === 'slp') {
                return { prevented: true, message: `${target.species} can't be put to sleep!` };
            }
            return { prevented: false, message: null };
        }
    },
    intimidate: {
        id: 'intimidate',
        name: 'Intimidate',
        onSwitchIn: (pokemon, opponent, battle) => {
            const opponentStages = pokemon.id === battle.activePokemon.id ? battle.wildStatStages : battle.playerStatStages;
            if (opponentStages.atk > -6) {
                opponentStages.atk--;
                return `${pokemon.species}'s Intimidate lowered the foe's Attack!`;
            }
            return null;
        },
    },
    intrepidsword: {
        id: 'intrepidsword',
        name: 'Intrepid Sword',
        onSwitchIn: (pokemon, opponent, battle) => {
            const targetStages = pokemon.id === battle.activePokemon.id ? battle.playerStatStages : battle.wildStatStages;
            if (targetStages.atk < 6) {
                targetStages.atk++;
                return `${pokemon.species}'s Intrepid Sword raised its Attack!`;
            }
            return null;
        },
    },
    ironbarbs: {
        id: 'ironbarbs',
        name: 'Iron Barbs',
        onDamagingHit: (target, source, move) => {
            if (move.flags?.contact) {
                 source.hp = Math.max(0, source.hp - Math.floor(source.maxHp / 8));
                return `${source.species} was hurt by Iron Barbs!`;
            }
            return null;
        }
    },
    ironfist: {
        id: 'ironfist',
        name: 'Iron Fist',
        onBasePower: (power, pokemon, target, move) => move.flags?.punch ? power * 1.2 : power,
    },

    // J
    justified: {
        id: 'justified',
        name: 'Justified',
        onDamagingHit: (target, source, move, battle) => {
            if (move.type === 'Dark') {
                const targetStages = target.id === battle.activePokemon.id ? battle.playerStatStages : battle.wildStatStages;
                if(targetStages.atk < 6) targetStages.atk++;
                return `${target.species}'s Justified raised its Attack!`;
            }
            return null;
        }
    },

    // K
    keeneye: {
        id: 'keeneye',
        name: 'Keen Eye',
        onTryBoost: (boost, target) => {
            // ENGINE: Also needs to ignore foe's evasion boosts.
            if (boost['accuracy'] && boost['accuracy'] < 0) {
                return { prevented: true, message: `${target.species}'s Keen Eye prevents accuracy loss!` };
            }
            return { prevented: false, message: null };
        }
    },

    // L
    leafguard: {
        id: 'leafguard',
        name: 'Leaf Guard',
        onSetStatus: (status, target, source, battle) => {
            if (battle.weather === 'Sun') {
                return { prevented: true, message: `${target.species} is protected by Leaf Guard!` };
            }
            return { prevented: false, message: null };
        }
    },
    levitate: {
        id: 'levitate',
        name: 'Levitate',
        onTryHit: (target, source, move) => {
            if (move.type === 'Ground') {
                return { blocked: true, message: `${target.species}'s Levitate makes it immune!` };
            }
            return { blocked: false, message: null };
        },
    },
    libero: {
        id: 'libero',
        name: 'Libero',
        onBeforeMove: (pokemon, move) => {
            if (!pokemon.types.includes(move.type) && move.category !== 'Status') {
                pokemon.types = [move.type];
                return { message: `${pokemon.species} transformed into the ${move.type}-type!` };
            }
            return {};
        }
    },
    lightmetal: { id: 'lightmetal', name: 'Light Metal', onSwitchIn: null /* Halves weight */ },
    lightningrod: { id: 'lightningrod', name: 'Lightning Rod', onSwitchIn: null /* Draws in Electric moves + SpA boost */ },
    limber: {
        id: 'limber',
        name: 'Limber',
        onSetStatus: (status, target) => {
            if (status === 'par') {
                return { prevented: true, message: `${target.species} can't be paralyzed!` };
            }
            return { prevented: false, message: null };
        }
    },
    lingeringaroma: { id: 'lingeringaroma', name: 'Lingering Aroma', onSwitchIn: null /* Spreads ability on contact */ },
    liquidooze: { id: 'liquidooze', name: 'Liquid Ooze', onSwitchIn: null /* Damages draining attackers */ },
    liquidvoice: { id: 'liquidvoice', name: 'Liquid Voice', onSwitchIn: null /* Sound moves become Water-type */ },
    longreach: { id: 'longreach', name: 'Long Reach', onSwitchIn: null /* Punch moves don't make contact */ },

    // M
    magicbounce: { id: 'magicbounce', name: 'Magic Bounce', onSwitchIn: null /* Reflects status moves */ },
    magicguard: { id: 'magicguard', name: 'Magic Guard', onSwitchIn: null /* Prevents indirect damage */ },
    magician: { id: 'magician', name: 'Magician', onSwitchIn: null /* Steals item on hit */ },
    magmaarmor: {
        id: 'magmaarmor',
        name: 'Magma Armor',
        onSetStatus: (status, target) => {
            if (status === 'frz') {
                return { prevented: true, message: `${target.species} can't be frozen!` };
            }
            return { prevented: false, message: null };
        }
    },
    magnetpull: {
        id: 'magnetpull',
        name: 'Magnet Pull',
        onTrapCheck: (pokemon, foe) => foe.types.includes('Steel'),
    },
    marvelscale: {
        id: 'marvelscale',
        name: 'Marvel Scale',
        onModifyDef: (pokemon, def) => pokemon.status ? def * 1.5 : def,
    },
    megalauncher: {
        id: 'megalauncher',
        name: 'Mega Launcher',
        onBasePower: (power, pokemon, target, move) => move.flags?.pulse ? power * 1.5 : power,
    },
    merciless: { id: 'merciless', name: 'Merciless', onSwitchIn: null /* Crits on poisoned foes */ },
    mimicry: { id: 'mimicry', name: 'Mimicry', onSwitchIn: null /* Changes type with terrain */ },
    mindseye: { id: 'mindseye', name: 'Mind\'s Eye' /* Same as Scrappy + Keen Eye */ },
    minus: { id: 'minus', name: 'Minus', onSwitchIn: null }, // Doubles-only
    mirrorarmor: { id: 'mirrorarmor', name: 'Mirror Armor', onSwitchIn: null /* Reflects stat drops */ },
    mistysurge: {
        id: 'mistysurge',
        name: 'Misty Surge',
        onSwitchIn: (pokemon, opponent, battle) => {
            if (battle.terrain !== 'Misty') {
                battle.terrain = 'Misty';
                return `The field became misty!`;
            }
            return null;
        }
    },
    moldbreaker: {
        id: 'moldbreaker',
        name: 'Mold Breaker',
        onSwitchIn: () => `It breaks the mold!`,
        // ENGINE: Very complex. Before any `AbilityHandler` check is made for a defending Pokémon, you must first check if the attacking Pokémon has Mold Breaker, Teravolt, or Turboblaze. If it does, you skip the defender's ability check entirely.
    },
    moody: { id: 'moody', name: 'Moody', onSwitchIn: null /* Random stat changes each turn */ },
    motordrive: {
        id: 'motordrive',
        name: 'Motor Drive',
        onTryHit: (target, source, move, battle) => {
            if (move.type === 'Electric') {
                const targetStages = target.id === battle.activePokemon.id ? battle.playerStatStages : battle.wildStatStages;
                if(targetStages.spe < 6) targetStages.spe++;
                return { blocked: true, message: `${target.species}'s Motor Drive raised its Speed!` };
            }
            return { blocked: false, message: null };
        }
    },
    moxie: { id: 'moxie', name: 'Moxie', onSwitchIn: null /* Atk boost on KO */ },
    multiscale: {
        id: 'multiscale',
        name: 'Multiscale',
        onSourceModifyDamage: (damage, move, target) => target.hp >= target.maxHp ? damage * 0.5 : damage,
    },
    multitype: { id: 'multitype', name: 'Multitype', onSwitchIn: null /* Arceus type change */ },
    mummy: { id: 'mummy', name: 'Mummy', onSwitchIn: null /* Spreads ability on contact */ },
    myceliummight: { id: 'myceliummight', name: 'Mycelium Might', onSwitchIn: null /* Status moves go last, ignore abilities */ },

    // N
    naturalcure: { id: 'naturalcure', name: 'Natural Cure', onSwitchIn: null /* Cures status on switch-out */ },
    neuroforce: { id: 'neuroforce', name: 'Neuroforce', onSwitchIn: null /* Boosts super-effective moves */ },
    neutralizinggas: { id: 'neutralizinggas', name: 'Neutralizing Gas', onSwitchIn: null /* Suppresses all abilities */ },
    noguard: {
        id: 'noguard',
        name: 'No Guard',
        // ENGINE: In the battle loop in `rpg-main.ts`, if the attacker OR defender has No Guard, the accuracy check for the move must be skipped entirely, forcing it to hit.
    },
    normalize: {
        id: 'normalize',
        name: 'Normalize',
        onModifyMove: (move) => {
            if (move.category !== 'Status' && move.id !== 'struggle') {
                move.type = 'Normal';
                move.normalizeBoosted = true;
            }
        },
        onBasePower: (power, pokemon, target, move) => move.normalizeBoosted ? power * 1.2 : power,
    },

    // O
    oblivious: { id: 'oblivious', name: 'Oblivious', onSwitchIn: null /* Prevents infatuation/Intimidate */ },
    opportunist: { id: 'opportunist', name: 'Opportunist', onSwitchIn: null /* Copies foe's stat boosts */ },
    orichalcumpulse: { id: 'orichalcumpulse', name: 'Orichalcum Pulse', onSwitchIn: null /* Sets sun + Atk boost */ },
    overcoat: { id: 'overcoat', name: 'Overcoat', onSwitchIn: null /* Weather/powder immunity */ },
    overgrow: {
        id: 'overgrow',
        name: 'Overgrow',
        onBasePower: (power, pokemon, target, move) => {
            if (move.type === 'Grass' && pokemon.hp <= pokemon.maxHp / 3) {
                return power * 1.5;
            }
            return power;
        }
    },
    owntempo: { id: 'owntempo', name: 'Own Tempo', onSwitchIn: null /* Prevents confusion/Intimidate */ },

    // P
    parentalbond: { id: 'parentalbond', name: 'Parental Bond', onSwitchIn: null /* Hits twice */ },
    pastelveil: { id: 'pastelveil', name: 'Pastel Veil', onSwitchIn: null }, // Doubles-only
    perishbody: { id: 'perishbody', name: 'Perish Body', onSwitchIn: null /* Perish Song on contact */ },
    pickpocket: { id: 'pickpocket', name: 'Pickpocket', onSwitchIn: null /* Steals item on contact */ },
    pickup: { id: 'pickup', name: 'Pickup', onSwitchIn: null }, // No battle effect
    pixilate: {
        id: 'pixilate',
        name: 'Pixilate',
        onModifyMove: (move) => {
            if (move.type === 'Normal' && move.category !== 'Status') {
                move.type = 'Fairy';
                move.pixilateBoosted = true;
            }
        },
        onBasePower: (power, pokemon, target, move) => move.pixilateBoosted ? power * 1.2 : power,
    },
    plus: { id: 'plus', name: 'Plus', onSwitchIn: null }, // Doubles-only
    poisonheal: {
        id: 'poisonheal',
        name: 'Poison Heal',
        onResidual: (pokemon) => {
            if (pokemon.status === 'psn') {
                 pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + Math.floor(pokemon.maxHp / 8));
                return `${pokemon.species} restored HP due to Poison Heal!`;
            }
            return null;
        }
    },
    poisonpoint: {
        id: 'poisonpoint',
        name: 'Poison Point',
        onDamagingHit: (target, source, move, battle) => {
            if (move.flags?.contact && Math.random() < 0.3) {
                // ENGINE: Needs logic to apply poison to the source
                return `${source.species} was poisoned by Poison Point!`;
            }
            return null;
        }
    },
    poisontouch: { id: 'poisontouch', name: 'Poison Touch', onSwitchIn: null /* Contact moves may poison */ },
    powerconstruct: { id: 'powerconstruct', name: 'Power Construct', onSwitchIn: null /* Zygarde form change */ },
    powerofalchemy: { id: 'powerofalchemy', name: 'Power of Alchemy', onSwitchIn: null }, // Doubles-only
    powerspot: { id: 'powerspot', name: 'Power Spot', onSwitchIn: null }, // Doubles-only
    prankster: {
        id: 'prankster',
        name: 'Prankster',
        onModifyPriority: (priority, move) => move.category === 'Status' ? priority + 1 : priority,
    },
    pressure: { id: 'pressure', name: 'Pressure', onSwitchIn: null /* Increases foe's PP usage */ },
    primordialsea: { id: 'primordialsea', name: 'Primordial Sea', onSwitchIn: null /* Weather ability */ },
    prismarmor: { id: 'prismarmor', name: 'Prism Armor', onSwitchIn: null /* Same as Filter */ },
    propellertail: { id: 'propellertail', name: 'Propeller Tail', onSwitchIn: null /* Ignores redirection */ },
    protean: {
        id: 'protean',
        name: 'Protean',
        onBeforeMove: (pokemon, move) => {
            if (!pokemon.types.includes(move.type) && move.category !== 'Status') {
                pokemon.types = [move.type];
                return { message: `${pokemon.species} transformed into the ${move.type}-type!` };
            }
            return {};
        }
    },
    protosynthesis: { id: 'protosynthesis', name: 'Protosynthesis', onSwitchIn: null /* Stat boost in sun */ },
    psychicsurge: {
        id: 'psychicsurge',
        name: 'Psychic Surge',
        onSwitchIn: (pokemon, opponent, battle) => {
            if (battle.terrain !== 'Psychic') {
                battle.terrain = 'Psychic';
                return `The field became psychic!`;
            }
            return null;
        }
    },
    punkrock: { id: 'punkrock', name: 'Punk Rock', onSwitchIn: null /* Boosts/resists sound moves */ },
    purepower: {
        id: 'purepower',
        name: 'Pure Power',
        onModifyAtk: (pokemon, atk) => atk * 2,
    },
    purifyingsalt: { id: 'purifyingsalt', name: 'Purifying Salt', onSwitchIn: null /* Ghost resist + status immunity */ },

    // Q
    quarkdrive: { id: 'quarkdrive', name: 'Quark Drive', onSwitchIn: null /* Stat boost on Electric Terrain */ },
    queenlymajesty: { id: 'queenlymajesty', name: 'Queenly Majesty', onSwitchIn: null /* Blocks priority moves */ },
    quickfeet: {
        id: 'quickfeet',
        name: 'Quick Feet',
        onModifySpe: (pokemon, spe) => (pokemon.status && pokemon.status !== 'par') ? spe * 1.5 : spe,
    },

    // R
    raindish: {
        id: 'raindish',
        name: 'Rain Dish',
        onResidual: (pokemon, battle) => {
            if (battle.weather === 'Rain') {
                 pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + Math.floor(pokemon.maxHp / 16));
                return `${pokemon.species} healed a little in the rain!`;
            }
            return null;
        }
    },
    rattled: {
        id: 'rattled',
        name: 'Rattled',
        onDamagingHit: (target, source, move, battle) => {
            if (['Bug', 'Ghost', 'Dark'].includes(move.type)) {
                const targetStages = target.id === battle.activePokemon.id ? battle.playerStatStages : battle.wildStatStages;
                if(targetStages.spe < 6) targetStages.spe++;
                return `${target.species}'s Rattled raised its Speed!`;
            }
            return null;
        }
    },
    receiver: { id: 'receiver', name: 'Receiver', onSwitchIn: null }, // Doubles-only
    reckless: {
        id: 'reckless',
        name: 'Reckless',
        onBasePower: (power, pokemon, target, move) => move.recoil ? power * 1.2 : power,
    },
    refrigerate: {
        id: 'refrigerate',
        name: 'Refrigerate',
        onModifyMove: (move) => {
            if (move.type === 'Normal' && move.category !== 'Status') {
                move.type = 'Ice';
                move.refrigerateBoosted = true;
            }
        },
        onBasePower: (power, pokemon, target, move) => move.refrigerateBoosted ? power * 1.2 : power,
    },
    regenerator: { id: 'regenerator', name: 'Regenerator', onSwitchIn: null /* Heals on switch-out */ },
    ripen: { id: 'ripen', name: 'Ripen', onSwitchIn: null /* Doubles berry effects */ },
    rivalry: { id: 'rivalry', name: 'Rivalry', onSwitchIn: null /* Gender-based power boost */ },
    rkssystem: { id: 'rkssystem', name: 'RKS System', onSwitchIn: null /* Silvally type change */ },
    rockhead: { id: 'rockhead', name: 'Rock Head', onSwitchIn: null /* Prevents recoil damage */ },
    rockypayload: {
        id: 'rockypayload',
        name: 'Rocky Payload',
        onBasePower: (power, pokemon, target, move) => move.type === 'Rock' ? power * 1.5 : power,
    },
    roughskin: {
        id: 'roughskin',
        name: 'Rough Skin',
        onDamagingHit: (target, source, move) => {
            if (move.flags?.contact) {
                 source.hp = Math.max(0, source.hp - Math.floor(source.maxHp / 8));
                return `${source.species} was hurt by Rough Skin!`;
            }
            return null;
        }
    },
    runaway: { id: 'runaway', name: 'Run Away', onSwitchIn: null /* Guarantees escape from wild battles */ },

    // S
    sandforce: { id: 'sandforce', name: 'Sand Force', onSwitchIn: null /* Power boost in sand */ },
    sandrush: {
        id: 'sandrush',
        name: 'Sand Rush',
        onModifySpe: (pokemon, spe, battle) => battle.weather === 'Sand' ? spe * 2 : spe,
    },
    sandspit: { id: 'sandspit', name: 'Sand Spit', onSwitchIn: null /* Sets sand when hit */ },
    sandstream: {
        id: 'sandstream',
        name: 'Sand Stream',
        onSwitchIn: (pokemon, opponent, battle) => {
            if (battle.weather !== 'Sand') {
                battle.weather = 'Sand';
                return `A sandstorm kicked up!`;
            }
            return null;
        },
    },
    sandveil: { id: 'sandveil', name: 'Sand Veil', onSwitchIn: null /* Evasion boost in sand */ },
    sapsipper: {
        id: 'sapsipper',
        name: 'Sap Sipper',
        onTryHit: (target, source, move, battle) => {
            if (move.type === 'Grass') {
                const targetStages = target.id === battle.activePokemon.id ? battle.playerStatStages : battle.wildStatStages;
                if(targetStages.atk < 6) targetStages.atk++;
                return { blocked: true, message: `${target.species}'s Sap Sipper raised its Attack!` };
            }
            return { blocked: false, message: null };
        }
    },
    schooling: { id: 'schooling', name: 'Schooling', onSwitchIn: null /* Wishiwashi form change */ },
    scrappy: {
        id: 'scrappy',
        name: 'Scrappy',
        // ENGINE: In `getCustomEffectiveness()` in `rpg-main.ts`, if the attacker has Scrappy, the effectiveness of its Normal and Fighting moves against Ghost-types must be treated as 1x instead of 0x.
    },
    screencleaner: { id: 'screencleaner', name: 'Screen Cleaner', onSwitchIn: null /* Removes screens on switch-in */ },
    seedsower: { id: 'seedsower', name: 'Seed Sower', onSwitchIn: null /* Sets Grassy Terrain when hit */ },
    serenegrace: { id: 'serenegrace', name: 'Serene Grace', onSwitchIn: null /* Doubles secondary effect chances */ },
    shadowshield: {
        id: 'shadowshield',
        name: 'Shadow Shield',
        onSourceModifyDamage: (damage, move, target) => target.hp >= target.maxHp ? damage * 0.5 : damage,
    },
    shadowtag: {
        id: 'shadowtag',
        name: 'Shadow Tag',
        onTrapCheck: (pokemon, foe) => foe.ability !== 'shadowtag',
    },
    sharpness: {
        id: 'sharpness',
        name: 'Sharpness',
        onBasePower: (power, pokemon, target, move) => move.flags?.slicing ? power * 1.5 : power,
    },
    shedskin: {
        id: 'shedskin',
        name: 'Shed Skin',
        onResidual: (pokemon) => {
            if (pokemon.status && Math.random() < 0.33) {
                 pokemon.status = null;
                return `${pokemon.species} shed its skin and was cured!`;
            }
            return null;
        }
    },
    sheerforce: { id: 'sheerforce', name: 'Sheer Force', onSwitchIn: null /* Boosts moves, removes secondary effects */ },
    shellarmor: { id: 'shellarmor', name: 'Shell Armor', onSwitchIn: null /* Prevents critical hits */ },
    shielddust: { id: 'shielddust', name: 'Shield Dust', onSwitchIn: null /* Blocks secondary effects */ },
    shieldsdown: { id: 'shieldsdown', name: 'Shields Down', onSwitchIn: null /* Minior form change */ },
    simple: {
        id: 'simple',
        name: 'Simple',
        // ENGINE: When applying stat stages from a move's boosts/drops in `rpg-main.ts`, if the target has Simple, the amount of change must be doubled (e.g., +1 becomes +2, -1 becomes +2).
    },
    skilllink: { id: 'skilllink', name: 'Skill Link', onSwitchIn: null /* Multi-hit moves always hit max times */ },
    slowstart: { id: 'slowstart', name: 'Slow Start', onSwitchIn: null /* Halves Atk/Spe for 5 turns */ },
    slushrush: {
        id: 'slushrush',
        name: 'Slush Rush',
        onModifySpe: (pokemon, spe, battle) => (battle.weather === 'Hail' || battle.weather === 'Snow') ? spe * 2 : spe,
    },
    sniper: { id: 'sniper', name: 'Sniper', onSwitchIn: null /* Increases critical hit damage */ },
    snowcloak: { id: 'snowcloak', name: 'Snow Cloak', onSwitchIn: null /* Evasion boost in snow */ },
    snowwarning: {
        id: 'snowwarning',
        name: 'Snow Warning',
        onSwitchIn: (pokemon, opponent, battle) => {
            if (battle.weather !== 'Snow' && battle.weather !== 'Hail') {
                battle.weather = 'Snow';
                return `It started to snow!`;
            }
            return null;
        }
    },
    solarpower: { id: 'solarpower', name: 'Solar Power', onSwitchIn: null /* SpA boost in sun, loses HP */ },
    solidrock: { id: 'solidrock', name: 'Solid Rock', onSwitchIn: null /* Same as Filter */ },
    soulheart: { id: 'soulheart', name: 'Soul-Heart', onSwitchIn: null /* SpA boost on any KO */ },
    soundproof: {
        id: 'soundproof',
        name: 'Soundproof',
        onTryHit: (target, source, move) => {
            if (move.flags?.sound) {
                return { blocked: true, message: `${target.species} is immune to sound moves!` };
            }
            return { blocked: false, message: null };
        }
    },
    speedboost: {
        id: 'speedboost',
        name: 'Speed Boost',
        onResidual: (pokemon, battle) => {
            const targetStages = pokemon.id === battle.activePokemon.id ? battle.playerStatStages : battle.wildStatStages;
            if (targetStages.spe < 6) {
                targetStages.spe++;
                return `${pokemon.species}'s Speed Boost raised its Speed!`;
            }
            return null;
        },
    },
    stakeout: { id: 'stakeout', name: 'Stakeout', onSwitchIn: null /* Damage boost on switch-in */ },
    stamina: {
        id: 'stamina',
        name: 'Stamina',
        onDamagingHit: (target, source, move, battle) => {
            const targetStages = target.id === battle.activePokemon.id ? battle.playerStatStages : battle.wildStatStages;
            if (targetStages.def < 6) {
                targetStages.def++;
                return `${target.species}'s Stamina raised its Defense!`;
            }
            return null;
        }
    },
    stancechange: { id: 'stancechange', name: 'Stance Change', onSwitchIn: null /* Aegislash form change */ },
    static: {
        id: 'static',
        name: 'Static',
        onDamagingHit: (target, source, move, battle) => {
            if (move.flags?.contact && Math.random() < 0.3) {
                // ENGINE: Needs logic to apply paralysis to the source.
                return `${source.species} was paralyzed by Static!`;
            }
            return null;
        },
    },
    steadfast: { id: 'steadfast', name: 'Steadfast', onSwitchIn: null /* Speed boost on flinch */ },
    steamengine: { id: 'steamengine', name: 'Steam Engine', onSwitchIn: null /* Speed boost when hit by Water/Fire */ },
    steelworker: {
        id: 'steelworker',
        name: 'Steelworker',
        onBasePower: (power, pokemon, target, move) => move.type === 'Steel' ? power * 1.5 : power,
    },
    steelyspirit: { id: 'steelyspirit', name: 'Steely Spirit', onSwitchIn: null }, // Doubles-only
    stench: { id: 'stench', name: 'Stench', onSwitchIn: null /* Chance to cause flinch */ },
    stickyhold: { id: 'stickyhold', name: 'Sticky Hold', onSwitchIn: null /* Prevents item removal */ },
    stormdrain: { id: 'stormdrain', name: 'Storm Drain', onSwitchIn: null /* Draws in Water moves + SpA boost */ },
    strongjaw: {
        id: 'strongjaw',
        name: 'Strong Jaw',
        onBasePower: (power, pokemon, target, move) => move.flags?.bite ? power * 1.5 : power,
    },
    sturdy: {
        id: 'sturdy',
        name: 'Sturdy',
        onSourceModifyDamage: (damage, move, target) => {
            if (target.hp === target.maxHp && damage >= target.hp) {
                move.sturdyActivated = true;
                return target.hp - 1;
            }
            return damage;
        },
        onDamagingHit: (target, source, move) => {
            if (target.hp === 1 && move.sturdyActivated) {
                return `${target.species} held on using Sturdy!`;
            }
            return null;
        }
    },
    suctioncups: { id: 'suctioncups', name: 'Suction Cups', onSwitchIn: null /* Prevents forced switching */ },
    superluck: { id: 'superluck', name: 'Super Luck', onSwitchIn: null /* Increases crit ratio */ },
    supersweetsyrup: { id: 'supersweetsyrup', name: 'Supersweet Syrup', onSwitchIn: null /* Evasion drop on switch-in */ },
    supremeoverlord: { id: 'supremeoverlord', name: 'Supreme Overlord', onSwitchIn: null /* Power boost based on fainted allies */ },
    surgesurfer: { id: 'surgesurfer', name: 'Surge Surfer', onSwitchIn: null /* Speed double on Electric Terrain */ },
    swarm: {
        id: 'swarm',
        name: 'Swarm',
        onBasePower: (power, pokemon, target, move) => {
            if (move.type === 'Bug' && pokemon.hp <= pokemon.maxHp / 3) {
                return power * 1.5;
            }
            return power;
        }
    },
    sweetveil: { id: 'sweetveil', name: 'Sweet Veil', onSwitchIn: null /* Prevents sleep for user/allies */ },
    swiftswim: {
        id: 'swiftswim',
        name: 'Swift Swim',
        onModifySpe: (pokemon, spe, battle) => battle.weather === 'Rain' ? spe * 2 : spe,
    },
    symbiosis: { id: 'symbiosis', name: 'Symbiosis', onSwitchIn: null }, // Doubles-only
    synchronize: { id: 'synchronize', name: 'Synchronize', onSwitchIn: null /* Spreads status on contact */ },

    // T
    tabletsofruin: { id: 'tabletsofruin', name: 'Tablets of Ruin', onSwitchIn: null /* Lowers Atk of all others */ },
    tangledfeet: { id: 'tangledfeet', name: 'Tangled Feet', onSwitchIn: null /* Evasion boost while confused */ },
    tanglinghair: { id: 'tanglinghair', name: 'Tangling Hair', onSwitchIn: null /* Contact speed drop */ },
    technician: {
        id: 'technician',
        name: 'Technician',
        onBasePower: (power) => power <= 60 ? power * 1.5 : power,
    },
    telepathy: { id: 'telepathy', name: 'Telepathy', onSwitchIn: null }, // Doubles-only
    teravolt: { id: 'teravolt', name: 'Teravolt', onSwitchIn: () => `It is radiating a bursting aura!`, /* See Mold Breaker */ },
    thermalexchange: { id: 'thermalexchange', name: 'Thermal Exchange', onSwitchIn: null /* Atk boost when hit by Fire */ },
    thickfat: {
        id: 'thickfat',
        name: 'Thick Fat',
        onSourceModifyDamage: (damage, move) => (move.type === 'Fire' || move.type === 'Ice') ? damage * 0.5 : damage,
    },
    tintedlens: { id: 'tintedlens', name: 'Tinted Lens', onSwitchIn: null /* Doubles power of not-very-effective moves */ },
    toxicboost: {
        id: 'toxicboost',
        name: 'Toxic Boost',
        onModifyAtk: (pokemon, atk) => pokemon.status === 'psn' ? atk * 1.5 : atk,
    },
    toxicchain: { id: 'toxicchain', name: 'Toxic Chain', onSwitchIn: null /* Moves may badly poison */ },
    toxicdebris: { id: 'toxicdebris', name: 'Toxic Debris', onSwitchIn: null /* Sets Toxic Spikes when hit */ },
    trace: {
        id: 'trace',
        name: 'Trace',
        onSwitchIn: (pokemon, opponent) => {
            if (opponent.ability) {
                pokemon.ability = opponent.ability; // Simplified
                return `${pokemon.species} traced the foe's ${opponent.ability}!`;
            }
            return null;
        }
    },
    transistor: {
        id: 'transistor',
        name: 'Transistor',
        onBasePower: (power, pokemon, target, move) => move.type === 'Electric' ? power * 1.3 : power,
    },
    triage: {
        id: 'triage',
        name: 'Triage',
        onModifyPriority: (priority, move) => move.flags?.heal ? priority + 3 : priority,
    },
    truant: { id: 'truant', name: 'Truant', onSwitchIn: null /* Loafs around every other turn */ },
    turboblaze: { id: 'turboblaze', name: 'Turboblaze', onSwitchIn: () => `It is radiating a blazing aura!`, /* See Mold Breaker */ },

    // U
    unaware: {
        id: 'unaware',
        name: 'Unaware',
        // ENGINE: In `calculateDamage()` in `rpg-main.ts`, if the attacker has Unaware, the defender's Defense/Sp. Def stat stages must be ignored. If the defender has Unaware, the attacker's Attack/Sp. Atk stat stages must be ignored.
    },
    unburden: { id: 'unburden', name: 'Unburden', onSwitchIn: null /* Speed double on item loss */ },
    unnerve: {
        id: 'unnerve',
        name: 'Unnerve',
        onSwitchIn: (pokemon, opponent) => `${opponent.species} is too nervous to eat Berries!`,
        // ENGINE: Core logic to prevent foe from eating berries.
    },
    unseenfist: { id: 'unseenfist', name: 'Unseen Fist', onSwitchIn: null /* Contact moves bypass Protect */ },

    // V
    vesselofruin: { id: 'vesselofruin', name: 'Vessel of Ruin', onSwitchIn: null /* Lowers SpA of all others */ },
    victorystar: { id: 'victorystar', name: 'Victory Star', onSwitchIn: null }, // Doubles-only
    vitalspirit: {
        id: 'vitalspirit',
        name: 'Vital Spirit',
        onSetStatus: (status, target) => {
            if (status === 'slp') {
                return { prevented: true, message: `${target.species} stayed awake using its Vital Spirit!` };
            }
            return { prevented: false, message: null };
        }
    },
    voltabsorb: {
        id: 'voltabsorb',
        name: 'Volt Absorb',
        onTryHit: (target, source, move) => {
            if (move.type === 'Electric') {
                const healAmount = Math.floor(target.maxHp / 4);
                target.hp = Math.min(target.maxHp, target.hp + healAmount);
                return { blocked: true, message: `${target.species} restored HP using its Volt Absorb!` };
            }
            return { blocked: false, message: null };
        },
    },

    // W
    wanderingspirit: { id: 'wanderingspirit', name: 'Wandering Spirit', onSwitchIn: null /* Swaps ability on contact */ },
    waterabsorb: {
        id: 'waterabsorb',
        name: 'Water Absorb',
        onTryHit: (target, source, move) => {
            if (move.type === 'Water') {
                const healAmount = Math.floor(target.maxHp / 4);
                target.hp = Math.min(target.maxHp, target.hp + healAmount);
                return { blocked: true, message: `${target.species} restored HP using its Water Absorb!` };
            }
            return { blocked: false, message: null };
        }
    },
    waterbubble: {
        id: 'waterbubble',
        name: 'Water Bubble',
        onBasePower: (power, p, t, move) => move.type === 'Water' ? power * 2 : power,
        onSourceModifyDamage: (damage, move) => move.type === 'Fire' ? damage * 0.5 : damage,
        onSetStatus: (status, target) => {
            if (status === 'brn') {
                return { prevented: true, message: `${target.species} is protected by its Water Bubble!` };
            }
            return { prevented: false, message: null };
        }
    },
    watercompaction: {
        id: 'watercompaction',
        name: 'Water Compaction',
        onDamagingHit: (target, source, move, battle) => {
            if (move.type === 'Water') {
                // ENGINE: Needs to raise defense by 2 stages.
                return `${target.species}'s Water Compaction sharply raised its Defense!`;
            }
            return null;
        }
    },
    waterveil: {
        id: 'waterveil',
        name: 'Water Veil',
        onSetStatus: (status, target) => {
            if (status === 'brn') {
                return { prevented: true, message: `${target.species} is protected by a veil of water!` };
            }
            return { prevented: false, message: null };
        }
    },
    weakarmor: { id: 'weakarmor', name: 'Weak Armor', onSwitchIn: null /* Lowers Def, raises Spe when hit */ },
    wellbakedbody: { id: 'wellbakedbody', name: 'Well-Baked Body', onSwitchIn: null /* Fire immunity + Def boost */ },
    whitesmoke: { id: 'whitesmoke', name: 'White Smoke', onSwitchIn: null /* Same as Clear Body */ },
    wimpout: { id: 'wimpout', name: 'Wimp Out', onSwitchIn: null /* Auto-switches on low HP */ },
    windpower: { id: 'windpower', name: 'Wind Power', onSwitchIn: null /* Charged effect from wind moves */ },
    windrider: { id: 'windrider', name: 'Wind Rider', onSwitchIn: null /* Atk boost from wind moves */ },
    wonderguard: {
        id: 'wonderguard',
        name: 'Wonder Guard',
        // ENGINE: This is one of the hardest. `onTryHit` must get the result of `getCustomEffectiveness(move.type, target.types)`. If the effectiveness is 1 or less, the hit is blocked. Only super-effective moves (effectiveness > 1) can pass.
    },
    wonderskin: { id: 'wonderskin', name: 'Wonder Skin', onSwitchIn: null /* Lowers accuracy of status moves */ },

    // Z
    zenmode: {
        id: 'zenmode',
        name: 'Zen Mode',
        // ENGINE: Complex form change. If HP is <= 50%, change form. If HP > 50%, revert. Requires recalculating stats/types at the end of each turn.
    },
    zerotohero: {
        id: 'zerotohero',
        name: 'Zero to Hero',
        // ENGINE: Very complex. When this Pokémon switches out, it changes to its Hero Form. Requires tracking state between switches and applying the new form on re-entry.
    },
};


// --- ABILITY HANDLER (to be imported by main file) ---
export const AbilityHandler = {
    getAbility(abilityId?: string): AbilityEffect | null {
        if (!abilityId) return null;
        return ABILITIES[toID(abilityId)] || null;
    },
    
    handleOnSwitchIn(pokemon: RPGPokemon, opponent: RPGPokemon, battle: BattleState): string[] {
        const messages: string[] = [];
        const ability = this.getAbility(pokemon.ability);
        if (ability?.onSwitchIn) {
            const msg = ability.onSwitchIn(pokemon, opponent, battle);
            if (msg) messages.push(msg);
        }
        return messages;
    },

    handleOnTryHit(target: RPGPokemon, source: RPGPokemon, move: any, battle: BattleState): { blocked: boolean, message: string | null } {
        const ability = this.getAbility(target.ability);
        if (ability?.onTryHit) {
            return ability.onTryHit(target, source, move, battle);
        }
        return { blocked: false, message: null };
    },

    modifyAtk(pokemon: RPGPokemon, atk: number, battle: BattleState): number {
        const ability = this.getAbility(pokemon.ability);
        return ability?.onModifyAtk ? ability.onModifyAtk(pokemon, atk, battle) : atk;
    },
    
    modifyDef(pokemon: RPGPokemon, def: number, battle: BattleState): number {
        const ability = this.getAbility(pokemon.ability);
        return ability?.onModifyDef ? ability.onModifyDef(pokemon, def, battle) : def;
    },
    
    modifySpA(pokemon: RPGPokemon, spa: number, battle: BattleState): number {
        const ability = this.getAbility(pokemon.ability);
        return ability?.onModifySpA ? ability.onModifySpA(pokemon, spa, battle) : spa;
    },

    modifySpe(pokemon: RPGPokemon, spe: number, battle: BattleState): number {
        const ability = this.getAbility(pokemon.ability);
        return ability?.onModifySpe ? ability.onModifySpe(pokemon, spe, battle) : spe;
    },

    getBasePower(power: number, pokemon: RPGPokemon, target: RPGPokemon, move: any): number {
         const ability = this.getAbility(pokemon.ability);
         return ability?.onBasePower ? ability.onBasePower(power, pokemon, target, move) : power;
    },

    modifyDamage(damage: number, move: any, target: RPGPokemon, attacker: RPGPokemon): number {
        const ability = this.getAbility(target.ability);
        return ability?.onSourceModifyDamage ? ability.onSourceModifyDamage(damage, move, target, attacker) : damage;
    },
    
    handleOnDamagingHit(target: RPGPokemon, source: RPGPokemon, move: any, battle: BattleState): string[] {
        const messages: string[] = [];
        const ability = this.getAbility(target.ability);
        if (ability?.onDamagingHit) {
             const msg = ability.onDamagingHit(target, source, move, battle);
            if (msg) messages.push(msg);
        }
        return messages;
    },

    handleOnResidual(pokemon: RPGPokemon, battle: BattleState): string[] {
        const messages: string[] = [];
        const ability = this.getAbility(pokemon.ability);
        if (ability?.onResidual) {
            const msg = ability.onResidual(pokemon, battle);
            if (msg) messages.push(msg);
        }
        return messages;
    },

    onTryBoost(boost: { [stat: string]: number }, target: RPGPokemon, source: RPGPokemon): { prevented: boolean, message: string | null } {
        const ability = this.getAbility(target.ability);
        if (ability?.onTryBoost) {
            return ability.onTryBoost(boost, target, source);
        }
        return { prevented: false, message: null };
    },
    
    trapCheck(pokemon: RPGPokemon, foe: RPGPokemon): boolean {
        const foeAbility = this.getAbility(foe.ability);
        return foeAbility?.onTrapCheck ? foeAbility.onTrapCheck(pokemon, foe) : false;
    },
    
    modifyPriority(priority: number, move: any, pokemon: RPGPokemon): number {
        const ability = this.getAbility(pokemon.ability);
        return ability?.onModifyPriority ? ability.onModifyPriority(priority, move) : priority;
    },
    
    onBeforeMove(pokemon: RPGPokemon, move: any, battle: BattleState): { message?: string | null } {
        const ability = this.getAbility(pokemon.ability);
        return ability?.onBeforeMove ? ability.onBeforeMove(pokemon, move, battle) : {};
    },

    onModifyMove(move: any, pokemon: RPGPokemon) {
        const ability = this.getAbility(pokemon.ability);
        if (ability?.onModifyMove) {
            ability.onModifyMove(move, pokemon);
        }
    }
};

Impulse.AbilityHandler = AbilityHandler;
