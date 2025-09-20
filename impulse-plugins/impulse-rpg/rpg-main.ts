// Pokemon RPG Plugin for Pokemon Showdown

// Interface for RPG Pokemon data
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
	ivs: Record<keyof Stats, number>;
	evs: Record<keyof Stats, number>;
	growthRate: string;
	experience: number;
	expToNextLevel: number;
	moves: { id: string; pp: number }[];
	nature: string;
	status: Status | null;
	ability?: string;
	item?: string;
	id: string;
}

// Interface for inventory items
interface InventoryItem {
	id: string;
	name: string;
	category: 'pokeball' | 'potion' | 'berry' | 'tm' | 'key' | 'misc';
	description: string;
	quantity: number;
}

// Interface for player data
interface PlayerData {
	id: string;
	name: string;
	level: number;
	experience: number;
	badges: number;
	party: RPGPokemon[];
	location: string;
	money: number;
	inventory: Map<string, InventoryItem>;
	pc: Map<string, RPGPokemon>;
	pendingMoveLearnQueue?: {
		pokemonId: string;
		moveIds: string[];
	};
}

// Type alias for status conditions
type Status = 'psn' | 'brn' | 'par' | 'slp' | 'frz';

// Interface for battle state
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
}

// In-memory storage for player data (in production, use a database)
const playerData: Map<string, PlayerData> = new Map();
const activeBattles: Map<string, BattleState> = new Map();

// Item database
const ITEMS_DATABASE: Record<string, Omit<InventoryItem, 'quantity'>> = {
	'pokeball': { id: 'pokeball', name: 'Poke Ball', category: 'pokeball', description: 'A device for catching wild Pokemon. It has a 1x catch rate.' },
	'greatball': { id: 'greatball', name: 'Great Ball', category: 'pokeball', description: 'A good, high-performance Poke Ball. It has a 1.5x catch rate.' },
	'ultraball': { id: 'ultraball', name: 'Ultra Ball', category: 'pokeball', description: 'An ultra-high performance Poke Ball. It has a 2x catch rate.' },
    'masterball': { id: 'masterball', name: 'Master Ball', category: 'pokeball', description: 'The best Poke Ball with the ultimate performance. It will catch any wild Pokemon without fail.' },
    'levelball': { id: 'levelball', name: 'Level Ball', category: 'pokeball', description: 'A Poke Ball that works well on Pokemon of a lower level than your own.' },
    'fastball': { id: 'fastball', name: 'Fast Ball', category: 'pokeball', description: 'A Poke Ball that works well on Pokemon that have a high Speed stat.' },
    'timerball': { id: 'timerball', name: 'Timer Ball', category: 'pokeball', description: 'A Poke Ball that becomes more effective the more turns that have passed in battle.' },
    'nestball': { id: 'nestball', name: 'Nest Ball', category: 'pokeball', description: 'A Poke Ball that works well on low-level Pokemon.' },
    'netball': { id: 'netball', name: 'Net Ball', category: 'pokeball', description: 'A Poke Ball that works well on Bug- or Water-type Pokemon.' },
    'quickball': { id: 'quickball', name: 'Quick Ball', category: 'pokeball', description: 'A Poke Ball that provides a high catch rate if used at the start of a wild encounter.' },
    'dreamball': { id: 'dreamball', name: 'Dream Ball', category: 'pokeball', description: 'A Poke Ball that works well on sleeping Pokemon.' },
    'premierball': { id: 'premierball', name: 'Premier Ball', category: 'pokeball', description: 'A somewhat rare Poke Ball that has been specially made to commemorate an event.' },
    'luxuryball': { id: 'luxuryball', name: 'Luxury Ball', category: 'pokeball', description: 'A comfortable Poke Ball that makes a caught wild Pokemon quickly grow friendly.' },
    'healball': { id: 'healball', name: 'Heal Ball', category: 'pokeball', description: 'A remedial Poke Ball that restores the HP of a Pokemon it catches and eliminates any status conditions.' },
	'potion': { id: 'potion', name: 'Potion', category: 'potion', description: 'A spray-type medicine. It restores 20 HP to a Pokemon.' },
	'superpotion': { id: 'superpotion', name: 'Super Potion', category: 'potion', description: 'A spray-type medicine. It restores 50 HP to a Pokemon.' },
	'hyperpotion': { id: 'hyperpotion', name: 'Hyper Potion', category: 'potion', description: 'A spray-type medicine. It restores 200 HP to a Pokemon.' },
	'fullrestore': { id: 'fullrestore', name: 'Full Restore', category: 'potion', description: 'A medicine that fully restores HP and heals any status problems.' },
	'oranberry': { id: 'oranberry', name: 'Oran Berry', category: 'berry', description: 'A Berry to be consumed by Pokemon. If a Pokemon holds one, it restores 10 HP.' },
	'sitrusberry': { id: 'sitrusberry', name: 'Sitrus Berry', category: 'berry', description: 'A Berry to be consumed by Pokemon. If a Pokemon holds one, it restores 1/4 of max HP.' },
	'eggmovetutor': { id: 'eggmovetutor', name: 'Egg Move Tutor', category: 'misc', description: 'A special item that teaches a compatible Pokémon one of its Egg Moves.' },
};

// Starter Pokemon data organized by type
const STARTER_POKEMON = {
	fire: ['charmander', 'cyndaquil', 'torchic', 'chimchar', 'tepig', 'fennekin', 'litten', 'scorbunny', 'fuecoco'],
	water: ['squirtle', 'totodile', 'mudkip', 'piplup', 'oshawott', 'froakie', 'popplio', 'sobble', 'quaxly'],
	grass: ['bulbasaur', 'chikorita', 'treecko', 'turtwig', 'snivy', 'chespin', 'rowlet', 'grookey', 'sprigatito'],
};

const MANUAL_CATCH_RATES = Impulse.MANUAL_CATCH_RATES;

const MANUAL_BASE_EXP = Impulse.MANUAL_BASE_EXP;

const MANUAL_EV_YIELDS = Impulse.MANUAL_EV_YIELDS;

const MANUAL_LEARNSETS = Impulse.MANUAL_LEARNSETS;

const MANUAL_EVOLUTIONS = Impulse.MANUAL_EVOLUTIONS;

// Type Chart
const TYPE_CHART: { [type: string]: { superEffective: string[], notVeryEffective: string[], noEffect: string[] } } = {
	Normal: { superEffective: [], notVeryEffective: ['Rock', 'Steel'], noEffect: ['Ghost'] },
	Fire: { superEffective: ['Grass', 'Ice', 'Bug', 'Steel'], notVeryEffective: ['Fire', 'Water', 'Rock', 'Dragon'], noEffect: [] },
	Water: { superEffective: ['Fire', 'Ground', 'Rock'], notVeryEffective: ['Water', 'Grass', 'Dragon'], noEffect: [] },
	Grass: { superEffective: ['Water', 'Ground', 'Rock'], notVeryEffective: ['Fire', 'Grass', 'Poison', 'Flying', 'Bug', 'Dragon', 'Steel'], noEffect: [] },
	Electric: { superEffective: ['Water', 'Flying'], notVeryEffective: ['Grass', 'Electric', 'Dragon'], noEffect: ['Ground'] },
	Ice: { superEffective: ['Grass', 'Ground', 'Flying', 'Dragon'], notVeryEffective: ['Fire', 'Water', 'Ice', 'Steel'], noEffect: [] },
	Fighting: { superEffective: ['Normal', 'Ice', 'Rock', 'Dark', 'Steel'], notVeryEffective: ['Poison', 'Flying', 'Psychic', 'Bug', 'Fairy'], noEffect: ['Ghost'] },
	Poison: { superEffective: ['Grass', 'Fairy'], notVeryEffective: ['Poison', 'Ground', 'Rock', 'Ghost'], noEffect: ['Steel'] },
	Ground: { superEffective: ['Fire', 'Electric', 'Poison', 'Rock', 'Steel'], notVeryEffective: ['Grass', 'Bug'], noEffect: ['Flying'] },
	Flying: { superEffective: ['Grass', 'Fighting', 'Bug'], notVeryEffective: ['Electric', 'Rock', 'Steel'], noEffect: [] },
	Psychic: { superEffective: ['Fighting', 'Poison'], notVeryEffective: ['Psychic', 'Steel'], noEffect: ['Dark'] },
	Bug: { superEffective: ['Grass', 'Psychic', 'Dark'], notVeryEffective: ['Fire', 'Fighting', 'Poison', 'Flying', 'Ghost', 'Steel', 'Fairy'], noEffect: [] },
	Rock: { superEffective: ['Fire', 'Ice', 'Flying', 'Bug'], notVeryEffective: ['Fighting', 'Ground', 'Steel'], noEffect: [] },
	Ghost: { superEffective: ['Psychic', 'Ghost'], notVeryEffective: ['Dark'], noEffect: ['Normal'] },
	Dragon: { superEffective: ['Dragon'], notVeryEffective: ['Steel'], noEffect: ['Fairy'] },
	Dark: { superEffective: ['Psychic', 'Ghost'], notVeryEffective: ['Fighting', 'Dark', 'Fairy'], noEffect: [] },
	Steel: { superEffective: ['Ice', 'Rock', 'Fairy'], notVeryEffective: ['Fire', 'Water', 'Electric', 'Steel'], noEffect: [] },
	Fairy: { superEffective: ['Fighting', 'Dragon', 'Dark'], notVeryEffective: ['Fire', 'Poison', 'Steel'], noEffect: [] },
};

const NATURES: Record<string, { plus: keyof Stats, minus: keyof Stats } | null> = {
    'Adamant': { plus: 'atk', minus: 'spa' }, 'Bashful': null, 'Brave': { plus: 'atk', minus: 'spe' }, 'Bold': { plus: 'def', minus: 'atk' }, 'Calm': { plus: 'spd', minus: 'atk' }, 'Careful': { plus: 'spd', minus: 'spa' }, 'Docile': null, 'Gentle': { plus: 'spd', minus: 'def' }, 'Hardy': null, 'Hasty': { plus: 'spe', minus: 'def' }, 'Impish': { plus: 'def', minus: 'spa' }, 'Jolly': { plus: 'spe', minus: 'spa' }, 'Lax': { plus: 'def', minus: 'spd' }, 'Lonely': { plus: 'atk', minus: 'def' }, 'Mild': { plus: 'spa', minus: 'def' }, 'Modest': { plus: 'spa', minus: 'atk' }, 'Naive': { plus: 'spe', minus: 'spd' }, 'Naughty': { plus: 'atk', minus: 'spd' }, 'Quiet': { plus: 'spa', minus: 'spe' }, 'Quirky': null, 'Rash': { plus: 'spa', minus: 'spd' }, 'Relaxed': { plus: 'def', minus: 'spe' }, 'Sassy': { plus: 'spd', minus: 'spe' }, 'Serious': null, 'Timid': { plus: 'spe', minus: 'atk' },
};
const NATURE_LIST = Object.keys(NATURES);
type Stats = Omit<RPGPokemon, 'species' | 'level' | 'experience' | 'moves' | 'id' | 'expToNextLevel' | 'hp' | 'ability' | 'item' | 'nature' | 'growthRate' | 'ivs' | 'evs' | 'status'>;

function getCustomEffectiveness(moveType: string, defenderTypes: string[]): number {
	let effectiveness = 1;
	const chartEntry = TYPE_CHART[moveType];
	if (!chartEntry) return 1;
	for (const defenderType of defenderTypes) {
		if (chartEntry.superEffective.includes(defenderType)) {
			effectiveness *= 2;
		} else if (chartEntry.notVeryEffective.includes(defenderType)) {
			effectiveness *= 0.5;
		} else if (chartEntry.noEffect.includes(defenderType)) {
			effectiveness *= 0;
		}
	}
	return effectiveness;
}

function calculateTotalExpForLevel(growthRate: string, level: number): number {
	const n = level;
	switch (growthRate) {
		case 'Slow':
			return Math.floor((5 * Math.pow(n, 3)) / 4);
		case 'Medium Fast':
			return Math.floor(Math.pow(n, 3));
		case 'Fast':
			return Math.floor((4 * Math.pow(n, 3)) / 5);
		case 'Medium Slow':
			return Math.floor(((6 / 5) * Math.pow(n, 3)) - (15 * Math.pow(n, 2)) + (100 * n) - 140);
		case 'Erratic':
			if (n <= 50) return Math.floor((Math.pow(n, 3) * (100 - n)) / 50);
			if (n <= 68) return Math.floor((Math.pow(n, 3) * (150 - n)) / 100);
			if (n <= 98) return Math.floor((Math.pow(n, 3) * Math.floor((1911 - 10 * n) / 3)) / 500);
			return Math.floor((Math.pow(n, 3) * (160 - n)) / 100);
		case 'Fluctuating':
			if (n <= 15) return Math.floor(Math.pow(n, 3) * ((Math.floor((n + 1) / 3) + 24) / 50));
			if (n <= 36) return Math.floor(Math.pow(n, 3) * ((n + 14) / 50));
			return Math.floor(Math.pow(n, 3) * ((Math.floor(n / 2) + 32) / 50));
		default:
			return Math.floor(Math.pow(n, 3));
	}
}

function generateUniqueId(): string {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function getPlayerData(userid: string): PlayerData {
	if (!playerData.has(userid)) {
		const newPlayer: PlayerData = { id: userid, name: userid, level: 1, experience: 0, badges: 0, party: [], location: 'Starter Town', money: 500, inventory: new Map(), pc: new Map() };
		addItemToInventory(newPlayer, 'pokeball', 5);
		addItemToInventory(newPlayer, 'potion', 3);
		playerData.set(userid, newPlayer);
	}
	return playerData.get(userid)!;
}

function addItemToInventory(player: PlayerData, itemId: string, quantity: number): boolean {
	const itemData = ITEMS_DATABASE[itemId];
	if (!itemData) return false;
	if (player.inventory.has(itemId)) {
		player.inventory.get(itemId)!.quantity += quantity;
	} else {
		player.inventory.set(itemId, { ...itemData, quantity: quantity });
	}
	return true;
}

function removeItemFromInventory(player: PlayerData, itemId: string, quantity: number): boolean {
	if (!player.inventory.has(itemId)) return false;
	const item = player.inventory.get(itemId)!;
	if (item.quantity < quantity) return false;
	item.quantity -= quantity;
	if (item.quantity === 0) {
		player.inventory.delete(itemId);
	}
	return true;
}

function calculateStats(species: any, level: number, nature: string, ivs: Record<keyof Stats, number>, evs: Record<keyof Stats, number>): Stats {
	const stats: Stats = { maxHp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
	stats.maxHp = Math.floor(((2 * species.baseStats.hp + ivs.hp + Math.floor(evs.hp / 4)) * level) / 100) + level + 10;
	stats.atk = Math.floor(((2 * species.baseStats.atk + ivs.atk + Math.floor(evs.atk / 4)) * level) / 100) + 5;
	stats.def = Math.floor(((2 * species.baseStats.def + ivs.def + Math.floor(evs.def / 4)) * level) / 100) + 5;
	stats.spa = Math.floor(((2 * species.baseStats.spa + ivs.spa + Math.floor(evs.spa / 4)) * level) / 100) + 5;
	stats.spd = Math.floor(((2 * species.baseStats.spd + ivs.spd + Math.floor(evs.spd / 4)) * level) / 100) + 5;
	stats.spe = Math.floor(((2 * species.baseStats.spe + ivs.spe + Math.floor(evs.spe / 4)) * level) / 100) + 5;
	const natureEffect = NATURES[nature];
    if (natureEffect) {
        stats[natureEffect.plus] = Math.floor(stats[natureEffect.plus] * 1.1);
        stats[natureEffect.minus] = Math.floor(stats[natureEffect.minus] * 0.9);
    }
	return stats;
}

function createPokemon(speciesId: string, level: number = 5): RPGPokemon {
	const species = Dex.species.get(speciesId);
	if (!species.exists) throw new Error('Pokemon ' + speciesId + ' not found');

	const randomNature = NATURE_LIST[Math.floor(Math.random() * NATURE_LIST.length)];
	const ivs = { hp: Math.floor(Math.random() * 32), atk: Math.floor(Math.random() * 32), def: Math.floor(Math.random() * 32), spa: Math.floor(Math.random() * 32), spd: Math.floor(Math.random() * 32), spe: Math.floor(Math.random() * 32) };
	const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
	const stats = calculateStats(species, level, randomNature, ivs, evs);
	let availableMoves: string[] = ['tackle', 'growl'];
	const manualLearnset = MANUAL_LEARNSETS[toID(speciesId)];

	if (manualLearnset?.levelup) {
		const learnedMoves: string[] = [];
		for (const learnableMove of manualLearnset.levelup) {
			if (learnableMove.level <= level) {
				learnedMoves.push(toID(learnableMove.move));
			}
		}
		if (learnedMoves.length > 0) availableMoves = [...new Set(learnedMoves)].slice(-4);
	} else {
		// Fallback for when manual learnset is not defined
		try {
			const learnset = species.learnset;
			if (learnset) {
				const moves = Object.keys(learnset).filter(moveId => { // @ts-ignore
					return learnset[moveId].some((learnMethod: string) => learnMethod.startsWith('8L' + level) || learnMethod.startsWith('8L' + (level - 1)) || learnMethod.startsWith('8L' + (level - 2)) || learnMethod.startsWith('8L' + (level - 3)) || learnMethod.startsWith('8L' + (level - 4)) || learnMethod.startsWith('8L' + (level - 5)));
				});
				if (moves.length > 0) availableMoves = moves.slice(-4);
			}
		} catch (e) { /* fallback */ }
	}

	const movesWithPP = availableMoves.map(moveId => {
		const moveData = Dex.moves.get(moveId);
		return { id: moveId, pp: moveData.pp || 5 };
	});

	const abilities = Object.values(species.abilities);
	const randomAbility = abilities.length ? abilities[Math.floor(Math.random() * abilities.length)] : 'No Ability';
	const growthRate = species.growthRate;
	return {
		species: species.name,
		level: level,
		hp: stats.maxHp,
		growthRate: growthRate,
		experience: calculateTotalExpForLevel(growthRate, level),
		expToNextLevel: calculateTotalExpForLevel(growthRate, level + 1),
		moves: movesWithPP,
		ability: randomAbility,
		nature: randomNature,
		id: generateUniqueId(),
		ivs: ivs,
		evs: evs,
		status: null,
		...stats
	};
}

function storePokemonInPC(player: PlayerData, pokemon: RPGPokemon): void {
	player.pc.set(pokemon.id, pokemon);
}

function withdrawPokemonFromPC(player: PlayerData, pokemonId: string): RPGPokemon | null {
	const pokemon = player.pc.get(pokemonId);
	if (pokemon) {
		player.pc.delete(pokemonId);
		return pokemon;
	}
	return null;
}

function generateWelcomeHTML(): string {
	return `<div class="infobox"><h2>Welcome to World of Impulse</h2><p>You must choose your starter pokemon before starting your adventure.</p><h3>Choose Type:</h3><p><button name="send" value="/rpg choosetype fire" class="button">🔥 Fire</button><button name="send" value="/rpg choosetype water" class="button">💧 Water</button><button name="send" value="/rpg choosetype grass" class="button">🌱 Grass</button></p></div>`;
}

function generateStarterSelectionHTML(type: string): string {
	const starters = STARTER_POKEMON[type as keyof typeof STARTER_POKEMON];
	if (!starters) return '';
	const typeTitle = type.charAt(0).toUpperCase() + type.slice(1);
	let html = `<div class="infobox"><h2>${typeTitle} Type Starters</h2><p>Choose your starter pokemon:</p><div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">`;
	for (const starterId of starters) {
		const species = Dex.species.get(starterId);
		if (species.exists) {
			html += `<div style="text-align: center; padding: 10px; border: 1px solid #ccc; border-radius: 5px;"><strong>${species.name}</strong><br><small>Type: ${species.types.join('/')}</small><br><button name="send" value="/rpg choosestarter ${starterId}" class="button" style="margin-top: 5px;">Choose</button></div>`;
		}
	}
	html += '</div><p style="margin-top: 15px;"><button name="send" value="/rpg start" class="button">← Back to Type Selection</button></p></div>';
	return html;
}

function generatePokemonInfoHTML(
    pokemon: RPGPokemon,
    showActions = false,
    status: Status | null = null,
    statStages: Record<keyof Omit<Stats, 'maxHp'>, number> | null = null
): string {
	const species = Dex.species.get(pokemon.species);
	const hpPercentage = Math.max(0, Math.floor((pokemon.hp / pokemon.maxHp) * 100));
	const hpBarColor = hpPercentage > 50 ? 'green' : hpPercentage > 25 ? 'orange' : 'red';
	const expForLastLevel = calculateTotalExpForLevel(pokemon.growthRate, pokemon.level);
	const expForNextLevel = pokemon.expToNextLevel;
	const expProgress = pokemon.experience - expForLastLevel;
	const expNeededForLevel = expForNextLevel - expForLastLevel;
	const expPercentage = Math.max(0, Math.floor((expProgress / expNeededForLevel) * 100));
	
	const displayStatus = status || pokemon.status;
	const statusColors: Record<Status, string> = { 'brn': '#F08030', 'par': '#F8D030', 'psn': '#A040A0', 'slp': '#9898E8', 'frz': '#98D8D8' };
	const statusTag = displayStatus ? `<span style="background-color: ${statusColors[displayStatus]}; color: white; padding: 1px 4px; border-radius: 3px; font-size: 10px; text-transform: uppercase; vertical-align: middle; margin-left: 5px;">${displayStatus}</span>` : '';

    let statStageTags = '';
    if (statStages) {
        for (const stat in statStages) {
            const stage = statStages[stat as keyof typeof statStages];
            if (stage > 0) {
                statStageTags += ` <span style="color: green; font-size: 11px;">🔼${stat.toUpperCase()}</span>`;
            } else if (stage < 0) {
                statStageTags += ` <span style="color: red; font-size: 11px;">🔽${stat.toUpperCase()}</span>`;
            }
        }
    }

	const movesDisplay = pokemon.moves.map(m => {
        const moveData = Dex.moves.get(m.id);
        return `${moveData.name} (${m.pp}/${moveData.pp})`;
    }).slice(0, 4).join(', ') || 'None';

	let html = `<div style="border: 1px solid #ccc; padding: 10px; margin: 5px; border-radius: 5px;"><strong>${pokemon.species}</strong> (Level ${pokemon.level})${statusTag}${statStageTags}<br><small>Type: ${species.types.join('/')}</small><br><div style="background: #f0f0f0; border-radius: 10px; padding: 2px; margin: 5px 0;"><div style="background: ${hpBarColor}; width: ${hpPercentage}%; height: 10px; border-radius: 8px;"></div></div>HP: ${pokemon.hp}/${pokemon.maxHp}<br><div style="background: #f0f0f0; border-radius: 10px; padding: 2px; margin: 5px 0;"><div style="background: #6c9be8; width: ${expPercentage}%; height: 8px; border-radius: 8px;"></div></div>EXP: ${pokemon.experience}/${pokemon.expToNextLevel}<br>Nature: ${pokemon.nature}<br>Ability: ${pokemon.ability || 'Unknown'}<br>Moves: ${movesDisplay}`;
	if (pokemon.item) {
		html += `<br>Held Item: ${pokemon.item}`;
	}
	if (showActions) {
		html += `<br><div style="margin-top: 10px;"><button name="send" value="/rpg summary ${pokemon.id}" class="button" style="font-size: 12px;">Summary</button> <button name="send" value="/rpg useitem potion ${pokemon.id}" class="button" style="font-size: 12px;">Use Potion</button> <button name="send" value="/rpg depositpc ${pokemon.id}" class="button" style="font-size: 12px;">Deposit</button></div>`;
	}
	html += '</div>';
	return html;
}

function generatePokemonSummaryHTML(pokemon: RPGPokemon): string {
	const totalEVs = Object.values(pokemon.evs).reduce((a, b) => a + b, 0);
	const movesSummary = pokemon.moves.map(move => {
		const moveData = Dex.moves.get(move.id);
		return `<div style="text-align: center; padding: 5px; background: #f0f0f0; border-radius: 5px;">${moveData.name}<br><small>PP: ${move.pp}/${moveData.pp}</small></div>`;
	}).join('');
	return `<div class="infobox"><h2>${pokemon.species}'s Summary</h2><div style="display: flex; justify-content: space-between; align-items: flex-start;"><div style="flex-basis: 48%;"><p><strong>Level:</strong> ${pokemon.level}</p><p><strong>Nature:</strong> ${pokemon.nature}</p><p><strong>Ability:</strong> ${pokemon.ability || 'Unknown'}</p><p><strong>Held Item:</strong> ${pokemon.item || 'None'}</p></div><div style="flex-basis: 48%;"><h4>Stats</h4><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 2px;">HP</td><td style="padding: 2px; text-align: right;">${pokemon.maxHp}</td></tr><tr><td style="padding: 2px;">Attack</td><td style="padding: 2px; text-align: right;">${pokemon.atk}</td></tr><tr><td style="padding: 2px;">Defense</td><td style="padding: 2px; text-align: right;">${pokemon.def}</td></tr><tr><td style="padding: 2px;">Sp. Atk</td><td style="padding: 2px; text-align: right;">${pokemon.spa}</td></tr><tr><td style="padding: 2px;">Sp. Def</td><td style="padding: 2px; text-align: right;">${pokemon.spd}</td></tr><tr><td style="padding: 2px;">Speed</td><td style="padding: 2px; text-align: right;">${pokemon.spe}</td></tr></table></div></div><hr /><div style="display: flex; justify-content: space-between; align-items: flex-start;"><div style="flex-basis: 48%;"><h4>IVs</h4><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 2px;">HP</td><td style="padding: 2px; text-align: right;">${pokemon.ivs.hp}</td></tr><tr><td style="padding: 2px;">Attack</td><td style="padding: 2px; text-align: right;">${pokemon.ivs.atk}</td></tr><tr><td style="padding: 2px;">Defense</td><td style="padding: 2px; text-align: right;">${pokemon.ivs.def}</td></tr><tr><td style="padding: 2px;">Sp. Atk</td><td style="padding: 2px; text-align: right;">${pokemon.ivs.spa}</td></tr><tr><td style="padding: 2px;">Sp. Def</td><td style="padding: 2px; text-align: right;">${pokemon.ivs.spd}</td></tr><tr><td style="padding: 2px;">Speed</td><td style="padding: 2px; text-align: right;">${pokemon.ivs.spe}</td></tr></table></div><div style="flex-basis: 48%;"><h4>EVs</h4><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 2px;">HP</td><td style="padding: 2px; text-align: right;">${pokemon.evs.hp}</td></tr><tr><td style="padding: 2px;">Attack</td><td style="padding: 2px; text-align: right;">${pokemon.evs.atk}</td></tr><tr><td style="padding: 2px;">Defense</td><td style="padding: 2px; text-align: right;">${pokemon.evs.def}</td></tr><tr><td style="padding: 2px;">Sp. Atk</td><td style="padding: 2px; text-align: right;">${pokemon.evs.spa}</td></tr><tr><td style="padding: 2px;">Sp. Def</td><td style="padding: 2px; text-align: right;">${pokemon.evs.spd}</td></tr><tr><td style="padding: 2px;">Speed</td><td style="padding: 2px; text-align: right;">${pokemon.evs.spe}</td></tr></table><small>Total: ${totalEVs} / 510</small></div></div><hr /><div><h4>Moves</h4><div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px;">${movesSummary}</div></div><p style="margin-top: 15px;"><button name="send" value="/rpg party" class="button">← Back to Party</button></p></div>`;
}

function generateEggMoveSelectionHTML(pokemon: RPGPokemon, eggMoves: string[]): string {
    let html = `<div class="infobox"><h2>Teach an Egg Move</h2><p>Choose a move for <strong>${pokemon.species}</strong> to learn:</p>`;
    for (const moveId of eggMoves) {
        const move = Dex.moves.get(moveId);
        html += `<button name="send" value="/rpg learneggmove ${pokemon.id} ${moveId}" class="button" style="margin: 3px;">${move.name}</button> `;
    }
    html += `<hr /><p><button name="send" value="/rpg items" class="button">Cancel</button></p></div>`;
    return html;
}

function generateInventoryHTML(player: PlayerData, category?: string): string {
	let html = `<div class="infobox"><h2>Inventory</h2><p><strong>Money:</strong> ₽${player.money}</p>`;
	html += `<div style="margin: 10px 0;"><button name="send" value="/rpg items" class="button">All</button> <button name="send" value="/rpg items pokeball" class="button">Poke Balls</button> <button name="send" value="/rpg items potion" class="button">Potions</button> <button name="send" value="/rpg items berry" class="button">Berries</button> <button name="send" value="/rpg items tm" class="button">TMs</button> <button name="send" value="/rpg items key" class="button">Key Items</button></div>`;
	if (player.inventory.size === 0) {
		html += `<p>Your inventory is empty.</p>`;
	} else {
		html += `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">`;
		for (const [itemId, item] of player.inventory) {
			if (!category || item.category === category) {
				html += `<div style="border: 1px solid #ccc; padding: 8px; border-radius: 5px;"><strong>${item.name}</strong> x${item.quantity}<br><small>${item.description}</small><br><button name="send" value="/rpg useitem ${itemId}" class="button" style="font-size: 12px; margin-top: 5px;">Use</button></div>`;
			}
		}
		html += `</div>`;
	}
	html += `<p style="margin-top: 15px;"><button name="send" value="/rpg menu" class="button">Back to Menu</button></p></div>`;
	return html;
}

function getBallBonus(ballId: string, battle: BattleState): number {
    const { wildPokemon, activePokemon, turn, wildStatus } = battle;
    const wildSpecies = Dex.species.get(wildPokemon.species);

    switch (ballId) {
        case 'greatball': return 1.5;
        case 'ultraball': return 2;
        case 'masterball': return 255;
        case 'fastball':
            return wildSpecies.baseStats.spe >= 100 ? 4 : 1;
        case 'levelball':
            if (activePokemon.level >= wildPokemon.level * 4) return 8;
            if (activePokemon.level >= wildPokemon.level * 2) return 4;
            if (activePokemon.level > wildPokemon.level) return 2;
            return 1;
        case 'nestball':
            if (wildPokemon.level <= 29) {
                return Math.max(1, (41 - wildPokemon.level) / 10);
            }
            return 1;
        case 'netball':
            return wildSpecies.types.includes('Bug') || wildSpecies.types.includes('Water') ? 3.5 : 1;
        case 'quickball':
            return turn === 0 ? 5 : 1;
        case 'timerball':
            return Math.min(4, 1 + turn * (1229 / 4096));
        case 'dreamball':
            return wildStatus === 'slp' ? 4 : 1;
        default:
            return 1; // pokeball, premierball, luxuryball, healball, etc.
    }
}

function performCatchAttempt(battle: BattleState, ballId: string): { success: boolean, shakes: number } {
    const { wildPokemon, wildStatus } = battle;
    const speciesId = toID(wildPokemon.species);
    const catchRate = MANUAL_CATCH_RATES[speciesId] || 45;

    const ballBonus = getBallBonus(ballId, battle);
    if (ballBonus === 255) return { success: true, shakes: 4 }; // Master Ball

    let statusBonus = 1;
    if (wildStatus === 'slp' || wildStatus === 'frz') {
        statusBonus = 2.5;
    } else if (wildStatus === 'par' || wildStatus === 'psn' || wildStatus === 'brn') {
        statusBonus = 1.5;
    }

    const { maxHp, hp } = wildPokemon;
	const modifiedCatchRate = catchRate;

    const a = Math.floor(
        (((3 * maxHp - 2 * hp) * modifiedCatchRate * ballBonus) / (3 * maxHp)) * statusBonus
    );

    if (a >= 255) return { success: true, shakes: 4 }; // Automatic catch

    const b = Math.floor(65536 / Math.pow(255 / a, 0.1875));

    let shakes = 0;
    for (let i = 0; i < 4; i++) {
        const rand = Math.floor(Math.random() * 65536);
        if (rand >= b) {
            return { success: false, shakes: shakes };
        }
        shakes++;
    }

    return { success: true, shakes: 4 };
}

function generatePCHTML(player: PlayerData): string {
	let html = `<div class="infobox"><h2>Pokemon PC System</h2><p>Welcome to Bill's PC!</p><p><strong>Pokemon in PC:</strong> ${player.pc.size}</p>`;
	if (player.pc.size === 0) {
		html += `<p>No Pokemon stored in PC.</p>`;
	} else {
		html += `<div style="max-height: 400px; overflow-y: auto;">`;
		for (const [pokemonId, pokemon] of player.pc) {
			html += `<div style="border: 1px solid #ccc; padding: 8px; margin: 5px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;"><div><strong>${pokemon.species}</strong> (Level ${pokemon.level})<br><small>HP: ${pokemon.hp}/${pokemon.maxHp}</small></div><button name="send" value="/rpg withdrawpc ${pokemonId}" class="button">Withdraw</button></div>`;
		}
		html += `</div>`;
	}
	html += `<p style="margin-top: 15px;"><button name="send" value="/rpg party" class="button">View Party</button> <button name="send" value="/rpg menu" class="button">Back to Menu</button></p></div>`;
	return html;
}

function getStatMultiplier(stage: number): number {
    if (stage >= 0) {
        return (2 + stage) / 2;
    } else {
        return 2 / (2 - Math.abs(stage));
    }
}

function calculateDamage(
    attacker: RPGPokemon,
    defender: RPGPokemon,
    moveId: string,
    attackerStages: Record<keyof Omit<Stats, 'maxHp'>, number>,
    defenderStages: Record<keyof Omit<Stats, 'maxHp'>, number>,
    attackerStatus: Status | null
): { damage: number, message: string } {
	const move = Dex.moves.get(moveId);
	if (!move.basePower) {
		if (moveId === 'dragonrage') return { damage: 40, message: `${attacker.species} used ${move.name}!` };
		return { damage: 0, message: `${attacker.species} used ${move.name}, but it had no effect!` };
	}
	const attackerSpecies = Dex.species.get(attacker.species);
	const defenderSpecies = Dex.species.get(defender.species);

	const attackStatRaw = move.category === 'Special' ? attacker.spa : attacker.atk;
	const defenseStatRaw = move.category === 'Special' ? defender.spd : defender.def;

	const attackStage = move.category === 'Special' ? attackerStages.spa : attackerStages.atk;
	const defenseStage = move.category === 'Special' ? defenderStages.spd : defenderStages.def;

	const attackStat = Math.floor(attackStatRaw * getStatMultiplier(attackStage));
	const defenseStat = Math.floor(defenseStatRaw * getStatMultiplier(defenseStage));
	
	let finalAttackStat = attackStat;
	if (attackerStatus === 'brn' && move.category === 'Physical') {
		finalAttackStat = Math.floor(finalAttackStat / 2);
	}
	
	const isCritical = Math.random() < (1 / 24);
	const criticalMultiplier = isCritical ? 1.5 : 1;
	const isStab = attackerSpecies.types.includes(move.type);
	const stabMultiplier = isStab ? 1.5 : 1;
	const randomMultiplier = Math.floor(Math.random() * 16 + 85) / 100;
	let damage = Math.floor((((2 * attacker.level / 5 + 2) * move.basePower * (finalAttackStat / defenseStat)) / 50) + 2);
	const effectiveness = getCustomEffectiveness(move.type, defenderSpecies.types);
	damage = Math.floor(damage * stabMultiplier * effectiveness * criticalMultiplier * randomMultiplier);
	damage = Math.max(1, damage);
	let message = `${attacker.species} used ${move.name}!`;
	if (isCritical) message += " A critical hit!";
	if (effectiveness > 1) message += " It's super effective!";
	if (effectiveness < 1 && effectiveness > 0) message += " It's not very effective...";
	if (effectiveness === 0) message = `It had no effect on ${defender.species}!`;
	return { damage, message };
}

function levelUp(pokemon: RPGPokemon): string[] {
	const levelUpMessages: string[] = [];
	pokemon.level++;
	levelUpMessages.push(`**${pokemon.species} grew to Level ${pokemon.level}!**`);
	const oldStats = { ...pokemon };
	const species = Dex.species.get(pokemon.species);
	const newStats = calculateStats(species, pokemon.level, pokemon.nature, pokemon.ivs, pokemon.evs);
	pokemon.maxHp = newStats.maxHp;
	pokemon.atk = newStats.atk;
	pokemon.def = newStats.def;
	pokemon.spa = newStats.spa;
	pokemon.spd = newStats.spd;
	pokemon.spe = newStats.spe;
	pokemon.hp = pokemon.maxHp; // Leveling up fully heals the pokemon
	levelUpMessages.push(`Max HP: ${oldStats.maxHp} -> ${pokemon.maxHp}`);
	levelUpMessages.push(`Attack: ${oldStats.atk} -> ${pokemon.atk}`);
	levelUpMessages.push(`Defense: ${oldStats.def} -> ${pokemon.def}`);
	pokemon.expToNextLevel = calculateTotalExpForLevel(pokemon.growthRate, pokemon.level + 1);
	return levelUpMessages;
}

function handleLearningMoves(player: PlayerData, pokemon: RPGPokemon): { messages: string[] } {
	const messages: string[] = [];
	const speciesId = toID(pokemon.species);
	const manualLearnset = MANUAL_LEARNSETS[speciesId];
	if (!manualLearnset?.levelup) return { messages };

	const movesLearnedAtThisLevel = manualLearnset.levelup
		.filter(learnable => learnable.level === pokemon.level)
		.map(learnable => toID(learnable.move))
		.filter(moveId => !pokemon.moves.some(m => m.id === moveId)); // Filter out moves already known

	if (movesLearnedAtThisLevel.length === 0) return { messages };

	const openMoveSlots = 4 - pokemon.moves.length;
	const movesToQueue: string[] = [];
	
	if (openMoveSlots > 0) {
		// Automatically learn moves that can fit
		const movesToAutoLearn = movesLearnedAtThisLevel.slice(0, openMoveSlots);
		for (const moveId of movesToAutoLearn) {
			const moveData = Dex.moves.get(moveId);
			pokemon.moves.push({ id: moveId, pp: moveData.pp || 5 });
			messages.push(`**${pokemon.species} learned ${moveData.name}!**`);
		}
	}

	// Queue any remaining moves
	if (movesLearnedAtThisLevel.length > openMoveSlots) {
		const remainingMoves = movesLearnedAtThisLevel.slice(openMoveSlots);
		movesToQueue.push(...remainingMoves);
	}

	if (movesToQueue.length > 0) {
		player.pendingMoveLearnQueue = { pokemonId: pokemon.id, moveIds: movesToQueue };
	}
	
	return { messages };
}

function gainEffortValues(pokemon: RPGPokemon, defeatedPokemon: RPGPokemon) {
    const defeatedSpeciesId = toID(defeatedPokemon.species);
    const evYield = MANUAL_EV_YIELDS[defeatedSpeciesId];
    if (!evYield) return;
    let totalEVs = Object.values(pokemon.evs).reduce((a, b) => a + b, 0);
    for (const stat in evYield) {
        if (totalEVs >= 510) break;
        const statKey = stat as keyof Stats;
        const evGained = evYield[statKey]!;
        const currentEV = pokemon.evs[statKey];
        if (currentEV >= 252) continue;
        const canAdd = Math.min(evGained, 252 - currentEV, 510 - totalEVs);
        pokemon.evs[statKey] += canAdd;
        totalEVs += canAdd;
    }
    const species = Dex.species.get(pokemon.species);
    const newStats = calculateStats(species, pokemon.level, pokemon.nature, pokemon.ivs, pokemon.evs);
    const hpDiff = newStats.maxHp - pokemon.maxHp;
    pokemon.hp = Math.max(1, pokemon.hp + hpDiff);
    pokemon.maxHp = newStats.maxHp;
    pokemon.atk = newStats.atk;
    pokemon.def = newStats.def;
    pokemon.spa = newStats.spa;
    pokemon.spd = newStats.spd;
    pokemon.spe = newStats.spe;
}
	
	function gainExperience(player: PlayerData, pokemon: RPGPokemon, defeatedPokemon: RPGPokemon, room: ChatRoom, user: User): { messages: string[], leveledUp: boolean } {
	const defeatedSpeciesId = toID(defeatedPokemon.species);

	// Reverted to use the manual base experience lookup.
	const baseExp = MANUAL_BASE_EXP[defeatedSpeciesId];

	if (!baseExp) {
		return { messages: ['No experience was gained.'], leveledUp: false };
	}

	const expGained = Math.floor((baseExp * defeatedPokemon.level) / 7);
	if (expGained <= 0) return { messages: [`${pokemon.species} gained no Experience Points.`], leveledUp: false };
    gainEffortValues(pokemon, defeatedPokemon);
	pokemon.experience += expGained;
	let leveledUp = false;
	const messages = [`${pokemon.species} gained ${expGained} Experience Points!`];
	while (pokemon.experience >= pokemon.expToNextLevel) {
		messages.push(...levelUp(pokemon));
		leveledUp = true;
		const evolveMessage = checkEvolution(player, pokemon, room, user);
		if (evolveMessage) {
			messages.push(evolveMessage);
			break;
		}
		const { messages: newMoveMessages } = handleLearningMoves(player, pokemon);
		messages.push(...newMoveMessages);
	}
	return { messages, leveledUp };
	}

function checkEvolution(player: PlayerData, pokemon: RPGPokemon, room: ChatRoom, user: User): string | null {
	const speciesId = toID(pokemon.species);
	const evoData = MANUAL_EVOLUTIONS[speciesId];
	if (!evoData || pokemon.level < evoData.evoLevel) return null;
	const evoSpecies = Dex.species.get(evoData.evoTo);
	if (!evoSpecies.exists) return null;
	const oldSpeciesName = pokemon.species;
	pokemon.species = evoSpecies.name;
	const newStats = calculateStats(evoSpecies, pokemon.level, pokemon.nature, pokemon.ivs, pokemon.evs);
	pokemon.maxHp = newStats.maxHp;
	pokemon.atk = newStats.atk;
	pokemon.def = newStats.def;
	pokemon.spa = newStats.spa;
	pokemon.spd = newStats.spd;
	pokemon.spe = newStats.spe;
	pokemon.hp = pokemon.maxHp;
	const { messages: evoMoveMessages } = handleLearningMoves(player, pokemon);
	let evoMessage = `**What?! ${oldSpeciesName} is evolving!**<br>...Congratulations! Your ${oldSpeciesName} evolved into **${evoSpecies.name}**!`;
	if (evoMoveMessages.length > 0) evoMessage += `<br>${evoMoveMessages.join('<br>')}`;
	const pokemonIndex = player.party.findIndex(p => p.id === pokemon.id);
	if (pokemonIndex !== -1) player.party[pokemonIndex] = pokemon;
	room.add(`|c|~RPG Bot|What?! ${user.name}'s ${oldSpeciesName} is evolving!`).update();
	return evoMessage;
}

function generateBattleHTML(battle: BattleState, messageLog: string[] = []): string {
	const moveButtons = battle.activePokemon.moves.map(move => {
        const moveData = Dex.moves.get(move.id);
        const isDisabled = move.pp === 0;
        return `<button name="send" value="/rpg battleaction move ${move.id}" class="button" ${isDisabled ? 'disabled style="background-color:#888;"' : ''}>${moveData.name}<br><small>PP: ${move.pp} / ${moveData.pp}</small></button>`;
    }).join('');

	return `<div class="infobox"><h2>Wild Battle!</h2><div style="display: flex; justify-content: space-around;"><div><h3>Your Pokemon</h3>${generatePokemonInfoHTML(battle.activePokemon, false, battle.playerStatus, battle.playerStatStages)}</div><div><h3>Wild Pokemon</h3>${generatePokemonInfoHTML(battle.wildPokemon, false, battle.wildStatus, battle.wildStatStages)}</div></div><hr /><div style="padding: 5px; margin: 10px 0; border: 1px solid #666; background: #f0f0f0; min-height: 50px;">${messageLog.join('<br>')}</div><p>What will ${battle.activePokemon.species} do?</p><div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px;">${moveButtons}</div><p style="margin-top: 15px;"><button name="send" value="/rpg battleaction catchmenu" class="button">⚽ Catch</button><button name="send" value="/rpg battleaction run" class="button">🏃 Run</button></p></div>`;
}

function generateCatchMenuHTML(player: PlayerData, battle: BattleState): string {
    let html = `<div class="infobox"><h2>Select a Poke Ball</h2>`;
    const pokeBalls = [];
    for (const [itemId, item] of player.inventory) {
        if (item.category === 'pokeball' && item.quantity > 0) {
            pokeBalls.push(item);
        }
    }
    if (pokeBalls.length === 0) {
        html += `<p>You have no Poke Balls!</p>`;
    } else {
        html += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">`;
        for (const ball of pokeBalls) {
            html += `<div style="text-align: center; padding: 8px; border: 1px solid #ccc; border-radius: 5px;"><strong>${ball.name}</strong><br><small>x${ball.quantity}</small><br><button name="send" value="/rpg battleaction catch ${ball.id}" class="button" style="font-size: 12px; margin-top: 5px;">Use</button></div>`;
        }
        html += `</div>`;
    }
    html += `<hr /><p><button name="send" value="/rpg battleaction back" class="button">Back to Battle</button></p></div>`;
    return html;
}

function generateVictoryHTML(defeatedPokemon: RPGPokemon, expMessages: string[], moneyGained: number): string {
	return `<div class="infobox"><h2>Victory!</h2><p>You defeated the wild <strong>${defeatedPokemon.species}</strong>!</p><div style="background: #f0f0f0; padding: 10px; border-radius: 5px;">${expMessages.join('<br>')}</div><p>You found ₽${moneyGained}!</p><p><button name="send" value="/rpg wildpokemon" class="button">Find Another Pokemon</button><button name="send" value="/rpg menu" class="button">Back to Menu</button></p></div>`;
}

function generateDefeatHTML(moneyLost: number): string {
	return `<div class="infobox"><h2>Defeat!</h2><p>You have no more Pokemon that can fight!</p><p>You blacked out and rushed to the nearest Pokemon Center...</p><p>You lost ₽${moneyLost}!</p><p><button name="send" value="/rpg menu" class="button">Continue</button></p></div>`;
}

function generateSwitchPokemonHTML(battle: BattleState, message: string): string {
	let html = `<div class="infobox"><h2>${battle.activePokemon.species} fainted!</h2><p>${message}</p><p>Choose your next Pokemon:</p>`;
	const player = getPlayerData(battle.playerId);
	for (const pokemon of player.party) {
		if (pokemon.hp > 0) {
			html += `<div style="border: 1px solid #ccc; padding: 8px; margin: 5px; border-radius: 5px;"><strong>${pokemon.species}</strong> (Lvl ${pokemon.level}) | HP: ${pokemon.hp}/${pokemon.maxHp}<button name="send" value="/rpg battleaction switch ${pokemon.id}" class="button" style="float: right;">Switch In</button></div>`;
		}
	}
	html += `</div>`;
	return html;
}

function generateMoveLearnHTML(player: PlayerData): string {
	const queue = player.pendingMoveLearnQueue;
	if (!queue || queue.moveIds.length === 0) return `<h2>Error: No pending moves found.</h2>`;
	const pokemon = player.party.find(p => p.id === queue.pokemonId);
	const newMove = Dex.moves.get(queue.moveIds[0]);
	if (!pokemon || !newMove.exists) {
		delete player.pendingMoveLearnQueue;
		return `<h2>Error: Invalid Pokemon or move data.</h2><p><button name="send" value="/rpg menu" class="button">Back to Menu</button></p>`;
	}
	let html = `<div class="infobox"><h2>Move Learning</h2><p><strong>${pokemon.species}</strong> wants to learn the move <strong>${newMove.name}</strong>!</p><p>However, ${pokemon.species} already knows four moves. Should a move be forgotten to make space for ${newMove.name}?</p><hr /><div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">`;
	for (const move of pokemon.moves) {
		html += `<button name="send" value="/rpg learnmove ${move.id}" class="button">${Dex.moves.get(move.id).name}</button>`;
	}
	html += `</div><hr /><p>...or, give up on learning the move <strong>${newMove.name}</strong>?</p><button name="send" value="/rpg learnmove skip" class="button" style="background-color: #d9534f; color: white;">Forget ${newMove.name}</button></div>`;
	return html;
}

// Helper function to save status at the end of a battle
function saveBattleStatus(battle: BattleState) {
    const player = getPlayerData(battle.playerId);
    const pokemonInParty = player.party.find(p => p.id === battle.activePokemon.id);
    if (pokemonInParty) {
        // Do not persist temporary statuses like sleep or freeze
        if (battle.playerStatus === 'slp' || battle.playerStatus === 'frz') {
            pokemonInParty.status = null;
        } else {
            pokemonInParty.status = battle.playerStatus;
        }
    }
}

export const commands: ChatCommands = {
	rpg: {
		start(target, room, user) {
			const player = getPlayerData(user.id);
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot do this while in a battle.");
			}
			if (player.party.length > 0) {
				return this.parse('/rpg menu');
			}
			this.sendReply(`|uhtml|rpg-${user.id}|${generateWelcomeHTML()}`);
		},

		choosetype(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot do this while in a battle.");
			}
			const type = target.trim().toLowerCase();
			if (!['fire', 'water', 'grass'].includes(type)) {
				return this.errorReply("Invalid type.");
			}
			this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateStarterSelectionHTML(type)}`);
		},

		choosestarter(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot do this while in a battle.");
			}
			const starterId = toID(target);
			const player = getPlayerData(user.id);
			if (player.party.length > 0) {
				return this.errorReply("You already have a starter Pokemon!");
			}
			if (!Object.values(STARTER_POKEMON).flat().includes(starterId)) {
				return this.errorReply("Invalid starter Pokemon.");
			}
			try {
				const starterPokemon = createPokemon(starterId, 5);
				player.party.push(starterPokemon);
				player.name = user.name;
				const species = Dex.species.get(starterId);
				const confirmHTML = `<div class="infobox"><h2>Congratulations!</h2><p>You have chosen <strong>${species.name}</strong> as your starter!</p>${generatePokemonInfoHTML(starterPokemon)}<p>Your adventure begins now...</p><p><button name="send" value="/rpg menu" class="button">Continue</button></p></div>`;
				this.sendReply(`|uhtmlchange|rpg-${user.id}|${confirmHTML}`);
				if (room?.roomid !== 'lobby') {
					room.add(`|c|~RPG Bot|${user.name} has chosen ${species.name} as their starter pokemon!`).update();
				}
			} catch (error) {
				this.errorReply(`Error creating starter Pokemon: ${error}`);
			}
		},

		menu(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You are in a battle!");
			}
			const player = getPlayerData(user.id);
			if (player.party.length === 0) {
				return this.parse('/rpg start');
			}
			const menuHTML = `<div class="infobox"><h2>RPG Menu - ${player.name}</h2><p><strong>Location:</strong> ${player.location} | <strong>Money:</strong> ₽${player.money}</p><p>What would you like to do?</p><p><button name="send" value="/rpg profile" class="button">👤 Profile</button><button name="send" value="/rpg party" class="button">⚡ Party</button><button name="send" value="/rpg battle" class="button">⚔️ Battle</button><button name="send" value="/rpg explore" class="button">🗺️ Explore</button></p><p><button name="send" value="/rpg pokedex" class="button">📖 Pokédex</button><button name="send" value="/rpg items" class="button">🎒 Items</button><button name="send" value="/rpg pc" class="button">💻 Pokemon PC</button></p></div>`;
			this.sendReply(`|uhtmlchange|rpg-${user.id}|${menuHTML}`);
		},

		learnmove(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot do this during a battle.");
			}
			const player = getPlayerData(user.id);
			const queue = player.pendingMoveLearnQueue;
			if (!queue || queue.moveIds.length === 0) {
				return this.errorReply("Your Pokemon is not trying to learn a new move.");
			}
			const pokemon = player.party.find(p => p.id === queue.pokemonId);
			if (!pokemon) {
				delete player.pendingMoveLearnQueue;
				return this.errorReply("Error: Pokemon not found.");
			}
			const newMoveId = queue.moveIds[0];
			const newMoveName = Dex.moves.get(newMoveId).name;
			const moveToReplace = toID(target);
			let message = "";
			if (moveToReplace === 'skip') {
				message = `<strong>${pokemon.species}</strong> did not learn <strong>${newMoveName}</strong>.`;
			} else {
				const moveIndex = pokemon.moves.findIndex(m => m.id === moveToReplace);
				if (moveIndex === -1) {
					return this.errorReply("That move is not known by your Pokemon.");
				}
				const oldMoveName = Dex.moves.get(pokemon.moves[moveIndex].id).name;
				const newMoveData = Dex.moves.get(newMoveId);
				pokemon.moves[moveIndex] = { id: newMoveId, pp: newMoveData.pp || 5 };
				message = `1, 2, and... Poof! <strong>${pokemon.species}</strong> forgot <strong>${oldMoveName}</strong> and learned <strong>${newMoveName}</strong>!`;
			}
			queue.moveIds.shift();
			if (queue.moveIds.length > 0) {
				this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateMoveLearnHTML(player)}`);
			} else {
				delete player.pendingMoveLearnQueue;
				const resultHTML = `<div class="infobox"><h2>Move Learning Result</h2><p>${message}</p>${generatePokemonInfoHTML(pokemon)}<p><button name="send" value="/rpg menu" class="button">Continue</button></p></div>`;
				this.sendReply(`|uhtmlchange|rpg-${user.id}|${resultHTML}`);
			}
		},

		learneggmove(target, room, user) {
			const player = getPlayerData(user.id);
			const [pokemonId, newMoveId] = target.split(' ');
			if (!pokemonId || !newMoveId) {
				return this.errorReply("Invalid command parameters.");
			}
			const pokemon = player.party.find(p => p.id === pokemonId);
			if (!pokemon) {
				return this.errorReply("Pokemon not found in your party.");
			}
			const speciesId = toID(pokemon.species);
			const eggMoves = MANUAL_LEARNSETS[speciesId]?.egg || [];
			if (!eggMoves.includes(newMoveId)) {
				return this.errorReply("This is not a valid Egg Move for this Pokemon.");
			}
			if (pokemon.moves.length < 4) {
				const newMoveData = Dex.moves.get(newMoveId);
				pokemon.moves.push({ id: newMoveId, pp: newMoveData.pp || 5 });
				const resultHTML = `<div class="infobox"><h2>Move Learned!</h2><p><strong>${pokemon.species}</strong> learned <strong>${newMoveData.name}</strong>!</p>${generatePokemonInfoHTML(pokemon)}<p><button name="send" value="/rpg party" class="button">Back to Party</button></p></div>`;
				this.sendReply(`|uhtmlchange|rpg-${user.id}|${resultHTML}`);
			} else {
				player.pendingMoveLearnQueue = { pokemonId: pokemon.id, moveIds: [newMoveId] };
				this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateMoveLearnHTML(player)}`);
			}
		},

		summary(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot view a summary during battle.");
			}
			const player = getPlayerData(user.id);
			const targetId = target.trim();
			if (!targetId) {
				let html = `<div class="infobox"><h2>Select a Pokémon</h2><p>Choose a Pokémon to view its summary:</p>`;
				if (player.party.length === 0) {
					html += '<p>You have no Pokémon.</p>';
				} else {
					player.party.forEach(p => {
						html += `<button name="send" value="/rpg summary ${p.id}" class="button" style="margin: 3px;">${p.species}</button> `;
					});
				}
				html += `<hr /><p><button name="send" value="/rpg party" class="button">← Back to Party</button></p></div>`;
				return this.sendReply(`|uhtmlchange|rpg-${user.id}|${html}`);
			}
			const pokemon = player.party.find(p => p.id === targetId);
			if (!pokemon) {
				return this.errorReply("Pokemon not found in your party.");
			}
			this.sendReply(`|uhtmlchange|rpg-${user.id}|${generatePokemonSummaryHTML(pokemon)}`);
		},

		profile(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You are in a battle!");
			}
			const player = getPlayerData(user.id);
			const profileHTML = `<div class="infobox"><h2>Player Profile</h2><p><strong>Trainer:</strong> ${player.name}</p><p><strong>Level:</strong> ${player.level}</p><p><strong>Badges:</strong> ${player.badges}</p><p><strong>Pokemon in Party:</strong> ${player.party.length}</p><p><strong>Money:</strong> ₽${player.money}</p><p><button name="send" value="/rpg menu" class="button">Back to Menu</button></p></div>`;
			this.sendReply(`|uhtmlchange|rpg-${user.id}|${profileHTML}`);
		},

		party(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot view your party during a battle.");
			}
			const player = getPlayerData(user.id);
			let partyHTML = `<div class="infobox"><h2>Your Party</h2>`;
			if (player.party.length === 0) {
				partyHTML += `<p>No Pokemon in party.</p>`;
			} else {
				for (let i = 0; i < 6; i++) {
					if (player.party[i]) {
						partyHTML += `<div><strong>Slot ${i + 1}:</strong><br>${generatePokemonInfoHTML(player.party[i], true)}</div>`;
					} else {
						partyHTML += `<p><strong>Slot ${i + 1}:</strong> Empty</p>`;
					}
				}
			}
			partyHTML += `<p style="margin-top: 15px;"><button name="send" value="/rpg pc" class="button">Pokemon PC</button> <button name="send" value="/rpg menu" class="button">Back to Menu</button></p></div>`;
			this.sendReply(`|uhtmlchange|rpg-${user.id}|${partyHTML}`);
		},

		items(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot access your bag in battle.");
			}
			const player = getPlayerData(user.id);
			const category = toID(target);
			const validCategories = ['pokeball', 'potion', 'berry', 'tm', 'key'];
			const filterCategory = validCategories.includes(category) ? category : undefined;
			this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateInventoryHTML(player, filterCategory)}`);
		},

		useitem(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot use items from the menu during a battle.");
			}
			const [itemId, pokemonId] = target.split(' ').map(arg => toID(arg));
			const player = getPlayerData(user.id);

			if (!itemId) return this.errorReply("Please specify an item to use.");
			if (!player.inventory.has(itemId)) return this.errorReply("You don't have that item.");

			const item = player.inventory.get(itemId)!;
			if (item.category === 'potion') {
				if (!pokemonId) {
					let html = `<div class="infobox"><h2>Use ${item.name}</h2><p>Select a Pokemon to use this item on:</p>`;
					for (const pokemon of player.party) {
						if (pokemon.hp < pokemon.maxHp) {
							html += `<div style="border: 1px solid #ccc; padding: 8px; margin: 5px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;"><div><strong>${pokemon.species}</strong> (Lvl ${pokemon.level})<br><small>HP: ${pokemon.hp}/${pokemon.maxHp}</small></div><button name="send" value="/rpg useitem ${itemId} ${pokemon.id}" class="button">Use</button></div>`;
						}
					}
					html += `<p><button name="send" value="/rpg items" class="button">Back to Items</button></p></div>`;
					return this.sendReply(`|uhtmlchange|rpg-${user.id}|${html}`);
				}
				const targetPokemon = player.party.find(p => p.id === pokemonId);
				if (!targetPokemon) return this.errorReply("Pokemon not found in party.");
				if (targetPokemon.hp >= targetPokemon.maxHp) return this.errorReply(`${targetPokemon.species} is already at full health!`);

				let healAmount = 0;
				switch (itemId) {
					case 'potion': healAmount = 20; break;
					case 'superpotion': healAmount = 50; break;
					case 'hyperpotion': healAmount = 200; break;
					case 'fullrestore': healAmount = targetPokemon.maxHp; break;
				}
				const previousHp = targetPokemon.hp;
				targetPokemon.hp = Math.min(targetPokemon.maxHp, targetPokemon.hp + healAmount);
				removeItemFromInventory(player, itemId, 1);
				const resultHTML = `<div class="infobox"><h2>Item Used!</h2><p>You used <strong>${item.name}</strong> on <strong>${targetPokemon.species}</strong>!</p><p>${targetPokemon.species} recovered ${targetPokemon.hp - previousHp} HP!</p>${generatePokemonInfoHTML(targetPokemon)}<p><button name="send" value="/rpg party" class="button">Back to Party</button><button name="send" value="/rpg items" class="button">Back to Items</button></p></div>`;
				this.sendReply(`|uhtmlchange|rpg-${user.id}|${resultHTML}`);
			} else if (itemId === 'eggmovetutor') {
				if (!pokemonId) {
					let html = `<div class="infobox"><h2>Use Egg Move Tutor</h2><p>Select a Pokémon to teach an Egg Move:</p>`;
					for (const pokemon of player.party) {
						html += `<button name="send" value="/rpg useitem eggmovetutor ${pokemon.id}" class="button" style="margin: 3px;">${pokemon.species}</button>`;
					}
					html += `<hr /><p><button name="send" value="/rpg items" class="button">Back to Items</button></p></div>`;
					return this.sendReply(`|uhtmlchange|rpg-${user.id}|${html}`);
				}
				const targetPokemon = player.party.find(p => p.id === pokemonId);
				if (!targetPokemon) return this.errorReply("Pokemon not found in your party.");
				const speciesId = toID(targetPokemon.species);
				const allEggMoves = MANUAL_LEARNSETS[speciesId]?.egg || [];
				const learnableEggMoves = allEggMoves.filter(moveId => !targetPokemon.moves.some(m => m.id === moveId));

				if (learnableEggMoves.length === 0) {
					return this.sendReply(`|uhtmlchange|rpg-${user.id}|<div class="infobox"><h2>No Moves Available</h2><p><strong>${targetPokemon.species}</strong> either has no Egg Moves or already knows all of them.</p><p><button name="send" value="/rpg items" class="button">Back to Items</button></p></div>`);
				}
				if (!removeItemFromInventory(player, 'eggmovetutor', 1)) return this.errorReply("Item could not be used.");
				this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateEggMoveSelectionHTML(targetPokemon, learnableEggMoves)}`);
			} else {
				return this.errorReply("This item cannot be used right now.");
			}
		},

		pc(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot access the PC during a battle.");
			}
			this.sendReply(`|uhtmlchange|rpg-${user.id}|${generatePCHTML(getPlayerData(user.id))}`);
		},

		depositpc(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot access the PC during a battle.");
			}
			const pokemonId = target.trim();
			const player = getPlayerData(user.id);
			if (player.party.length <= 1) {
				return this.errorReply("You must keep at least one Pokemon in your party!");
			}
			const pokemonIndex = player.party.findIndex(p => p.id === pokemonId);
			if (pokemonIndex === -1) {
				return this.errorReply("Pokemon not found in party.");
			}
			const [pokemon] = player.party.splice(pokemonIndex, 1);
			storePokemonInPC(player, pokemon);
			this.sendReply(`|uhtmlchange|rpg-${user.id}|<div class="infobox"><h2>Pokemon Deposited</h2><p><strong>${pokemon.species}</strong> has been deposited into the PC!</p><p><button name="send" value="/rpg pc" class="button">View PC</button><button name="send" value="/rpg party" class="button">Back to Party</button></p></div>`);
		},

		withdrawpc(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot access the PC during a battle.");
			}
			const pokemonId = target.trim();
			const player = getPlayerData(user.id);
			if (player.party.length >= 6) {
				return this.errorReply("Your party is full!");
			}
			const pokemon = withdrawPokemonFromPC(player, pokemonId);
			if (!pokemon) {
				return this.errorReply("Pokemon not found in PC.");
			}
			player.party.push(pokemon);
			this.sendReply(`|uhtmlchange|rpg-${user.id}|<div class="infobox"><h2>Pokemon Withdrawn</h2><p><strong>${pokemon.species}</strong> has been withdrawn from the PC!</p>${generatePokemonInfoHTML(pokemon)}<p><button name="send" value="/rpg pc" class="button">View PC</button><button name="send" value="/rpg party" class="button">Back to Party</button></p></div>`);
		},

		shop(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot shop during a battle.");
			}
			const player = getPlayerData(user.id);
			const shopHTML = `<div class="infobox"><h2>Poke Mart</h2><p><strong>Your Money:</strong> ₽${player.money}</p><h3>Items for Sale:</h3><div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;"><div style="border: 1px solid #ccc; padding: 8px; border-radius: 5px;"><strong>Poke Ball</strong> - ₽200<br><small>A device for catching wild Pokemon</small><br><button name="send" value="/rpg buy pokeball 1" class="button" style="font-size: 12px; margin-top: 5px;">Buy 1</button><button name="send" value="/rpg buy pokeball 5" class="button" style="font-size: 12px;">Buy 5</button></div><div style="border: 1px solid #ccc; padding: 8px; border-radius: 5px;"><strong>Great Ball</strong> - ₽600<br><small>A ball with a 1.5x catch rate.</small><br><button name="send" value="/rpg buy greatball 1" class="button" style="font-size: 12px; margin-top: 5px;">Buy 1</button></div><div style="border: 1px solid #ccc; padding: 8px; border-radius: 5px;"><strong>Ultra Ball</strong> - ₽800<br><small>A ball with a 2x catch rate.</small><br><button name="send" value="/rpg buy ultraball 1" class="button" style="font-size: 12px; margin-top: 5px;">Buy 1</button></div><div style="border: 1px solid #ccc; padding: 8px; border-radius: 5px;"><strong>Potion</strong> - ₽300<br><small>Restores 20 HP to a Pokemon</small><br><button name="send" value="/rpg buy potion 1" class="button" style="font-size: 12px; margin-top: 5px;">Buy 1</button><button name="send" value="/rpg buy potion 5" class="button" style="font-size: 12px;">Buy 5</button></div><div style="border: 1px solid #ccc; padding: 8px; border-radius: 5px;"><strong>Quick Ball</strong> - ₽1000<br><small>5x catch rate on turn 1.</small><br><button name="send" value="/rpg buy quickball 1" class="button" style="font-size: 12px; margin-top: 5px;">Buy 1</button></div><div style="border: 1px solid #ccc; padding: 8px; border-radius: 5px;"><strong>Timer Ball</strong> - ₽1000<br><small>Catch rate increases each turn.</small><br><button name="send" value="/rpg buy timerball 1" class="button" style="font-size: 12px; margin-top: 5px;">Buy 1</button></div><div style="border: 1px solid #ccc; padding: 8px; border-radius: 5px;"><strong>Egg Move Tutor</strong> - ₽3000<br><small>Teaches a Pokemon an Egg Move</small><br><button name="send" value="/rpg buy eggmovetutor 1" class="button" style="font-size: 12px; margin-top: 5px;">Buy 1</button></div></div><p style="margin-top: 15px;"><button name="send" value="/rpg menu" class="button">Back to Menu</button></p></div>`;
			this.sendReply(`|uhtmlchange|rpg-${user.id}|${shopHTML}`);
		},

		buy(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot shop during a battle.");
			}
			const [itemId, quantityStr] = target.split(' ');
			const quantity = parseInt(quantityStr) || 1;
			const player = getPlayerData(user.id);
			if (!itemId || !ITEMS_DATABASE[itemId]) {
				return this.errorReply("Invalid item specified.");
			}
			const prices: Record<string, number> = {
				'pokeball': 200, 'greatball': 600, 'ultraball': 800, 'potion': 300, 'superpotion': 700, 'hyperpotion': 1200, 'eggmovetutor': 3000,
				'levelball': 1000, 'fastball': 1000, 'timerball': 1000, 'nestball': 1000, 'netball': 1000, 'quickball': 1000, 'dreamball': 1000,
				'premierball': 200, 'luxuryball': 1000, 'healball': 300,
			};
			const itemPrice = prices[itemId];
			if (!itemPrice) {
				return this.errorReply("This item is not for sale.");
			}
			const totalCost = itemPrice * quantity;
			if (player.money < totalCost) {
				return this.errorReply(`You don't have enough money! You need ₽${totalCost}.`);
			}
			player.money -= totalCost;
			addItemToInventory(player, itemId, quantity);
			const item = ITEMS_DATABASE[itemId];
			this.sendReply(`|uhtmlchange|rpg-${user.id}|<div class="infobox"><h2>Purchase Complete!</h2><p>You bought <strong>${quantity}x ${item.name}</strong> for ₽${totalCost}!</p><p><strong>Money remaining:</strong> ₽${player.money}</p><p><button name="send" value="/rpg shop" class="button">Continue Shopping</button><button name="send" value="/rpg items" class="button">View Inventory</button></p></div>`);
		},

		pokedex(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot use the Pokedex during a battle.");
			}
			// Logic can be added here
		},

		wildpokemon(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You are already in a battle!");
			}
			const player = getPlayerData(user.id);
			const firstPokemon = player.party.find(p => p.hp > 0);
			if (!firstPokemon) {
				return this.errorReply("All your Pokemon have fainted!");
			}
			const commonPokemon = ['rattata', 'pidgey', 'caterpie', 'weedle', 'zubat', 'geodude', 'magikarp', 'psyduck'];
			const wildSpeciesId = commonPokemon[Math.floor(Math.random() * commonPokemon.length)];
			const wildLevel = Math.max(1, firstPokemon.level + Math.floor(Math.random() * 5) - 2);
			try {
				const wildPokemon = createPokemon(wildSpeciesId, wildLevel);
				const initialStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
				activeBattles.set(user.id, {
					playerId: user.id,
					wildPokemon,
					activePokemon: firstPokemon,
					turn: 0,
					playerStatStages: { ...initialStages },
					wildStatStages: { ...initialStages },
					playerStatus: firstPokemon.status,
					wildStatus: null,
					playerSleepCounter: 0,
					wildSleepCounter: 0,
				});
				this.sendReply(`|uhtml|rpg-${user.id}|${generateBattleHTML(activeBattles.get(user.id)!, [`A wild ${wildPokemon.species} appeared!`])}`);
			} catch (error) {
				this.errorReply(`Error generating wild Pokemon: ${error}`);
			}
		},

		battle(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You are already in a battle!");
			}
			this.sendReply(`|uhtmlchange|rpg-${user.id}|<div class="infobox"><h2>Battle Menu</h2><p>Choose your battle type:</p><p><button name="send" value="/rpg wildpokemon" class="button">🌿 Wild Pokemon</button></p><p><button name="send" value="/rpg menu" class="button">Back to Menu</button></p></div>`);
		},

		battleaction: {
			'move'(target, room, user) {
				const battle = activeBattles.get(user.id);
				if (!battle) return this.errorReply("You are not in a battle.");
				battle.turn++;

				const player = getPlayerData(battle.playerId);
				const playerPokemon = player.party.find(p => p.id === battle.activePokemon.id);
				if (!playerPokemon) return this.errorReply("Active pokemon not found.");

				const moveId = toID(target);
				if (!playerPokemon.moves.some(m => m.id === moveId)) return this.errorReply("Invalid move.");

				const messageLog: string[] = [];
				const { wildPokemon } = battle;
				
				const playerMove = playerPokemon.moves.find(m => m.id === moveId)!;
				const wildMove = wildPokemon.moves[Math.floor(Math.random() * wildPokemon.moves.length)];

				const playerAction = { pokemon: playerPokemon, move: Dex.moves.get(playerMove.id) };
				const wildAction = { pokemon: wildPokemon, move: Dex.moves.get(wildMove.id) };

				let playerSpe = playerAction.pokemon.spe;
				if (battle.playerStatus === 'par') playerSpe = Math.floor(playerSpe / 2);
				let wildSpe = wildAction.pokemon.spe;
				if (battle.wildStatus === 'par') wildSpe = Math.floor(wildSpe / 2);

				let turnOrder;
				if (playerAction.move.priority > wildAction.move.priority) {
					turnOrder = [playerAction, wildAction];
				} else if (wildAction.move.priority > playerAction.move.priority) {
					turnOrder = [wildAction, playerAction];
				} else {
					turnOrder = (playerSpe >= wildSpe) ? [playerAction, wildAction] : [wildAction, playerAction];
				}

				for (const turn of turnOrder) {
					const attacker = turn.pokemon;
					if (attacker.hp <= 0) continue;

					const defender = (attacker === playerPokemon) ? wildPokemon : playerPokemon;
					const move = turn.move;
					const attackerStatus = (attacker === playerPokemon) ? battle.playerStatus : battle.wildStatus;
					
					const moveObject = attacker.moves.find(m => m.id === move.id);
					if (!moveObject || moveObject.pp <= 0) {
						messageLog.push(`${attacker.species} tried to use ${move.name}, but it has no PP left!`);
						continue;
					}
			
					moveObject.pp--;
			
					const moveAccuracy = move.accuracy;
					if (moveAccuracy !== true && (Math.random() * 100) > moveAccuracy) {
						messageLog.push(`${attacker.species}'s ${move.name} missed!`);
						continue;
					}

					if (attackerStatus === 'frz') {
						if (Math.random() < 0.20) {
							if (attacker === playerPokemon) battle.playerStatus = null; else battle.wildStatus = null;
							messageLog.push(`${attacker.species} thawed out!`);
						} else {
							messageLog.push(`${attacker.species} is frozen solid!`);
							continue;
						}
					}
					if (attackerStatus === 'slp') {
						const sleepCounter = (attacker === playerPokemon) ? battle.playerSleepCounter : battle.wildSleepCounter;
						if (attacker === playerPokemon) battle.playerSleepCounter--; else battle.wildSleepCounter--;
						if (sleepCounter > 0) {
							messageLog.push(`${attacker.species} is fast asleep.`);
							continue;
						} else {
							if (attacker === playerPokemon) battle.playerStatus = null; else battle.wildStatus = null;
							messageLog.push(`${attacker.species} woke up!`);
						}
					}
					if (attackerStatus === 'par' && Math.random() < 0.25) {
						messageLog.push(`${attacker.species} is fully paralyzed!`);
						continue;
					}
					
					const attackerStages = (attacker === playerPokemon) ? battle.playerStatStages : battle.wildStatStages;
					const defenderStages = (defender === playerPokemon) ? battle.playerStatStages : battle.wildStatStages;

					if (move.category === 'Status') {
						messageLog.push(`${attacker.species} used ${move.name}!`);
						const defenderCurrentStatus = (defender === playerPokemon) ? battle.playerStatus : battle.wildStatus;
						
						if (move.boosts) {
							const targetPokemon = move.target === 'self' ? attacker : defender;
							const targetStages = move.target === 'self' ? attackerStages : defenderStages;
							let changed = false, raised = false, lowered = false;
							for (const stat in move.boosts) {
								const statName = stat as keyof Omit<Stats, 'maxHp'>;
								const boostValue = move.boosts[statName]!;
								if (boostValue > 0) {
									if (targetStages[statName] < 6) {
										targetStages[statName] = Math.min(6, targetStages[statName] + boostValue);
										changed = true;
										raised = true;
									}
								} else {
									if (targetStages[statName] > -6) {
										targetStages[statName] = Math.max(-6, targetStages[statName] + boostValue);
										changed = true;
										lowered = true;
									}
								}
							}
							if (!changed) messageLog.push(`But it failed!`);
							else if (raised) messageLog.push(`${targetPokemon.species}'s stats were raised!`);
							else if (lowered) messageLog.push(`${targetPokemon.species}'s stats were lowered!`);
						} else if (move.status) {
							if (defenderCurrentStatus) {
								messageLog.push(`But it failed!`);
							} else {
								let status = move.status;
								if (status === 'tox') status = 'psn';
								const statusName = {psn: 'poisoned', brn: 'burned', slp: 'put to sleep', par: 'paralyzed', frz: 'frozen'}[status as Status];
								if (status === 'slp') {
									const sleepTurns = 1 + Math.floor(Math.random() * 3);
									if (defender === playerPokemon) {
										battle.playerStatus = 'slp';
										battle.playerSleepCounter = sleepTurns;
									} else {
										battle.wildStatus = 'slp';
										battle.wildSleepCounter = sleepTurns;
									}
									messageLog.push(`${defender.species} fell asleep!`);
								} else {
									if (defender === playerPokemon) battle.playerStatus = status as Status;
									else battle.wildStatus = status as Status;
									messageLog.push(`${defender.species} was ${statusName}!`);
								}
							}
						} else {
							messageLog.push(`But it had no effect!`);
						}
					} else {
						const attackResult = calculateDamage(attacker, defender, move.id, attackerStages, defenderStages, attackerStatus);
						defender.hp = Math.max(0, defender.hp - attackResult.damage);
						messageLog.push(attackResult.message);
						if (attackResult.damage > 0) {
							const defenderName = (defender === wildPokemon) ? `The wild ${wildPokemon.species}` : playerPokemon.species;
							messageLog.push(`${defenderName} took ${attackResult.damage} damage!`);

							const defenderStatus = (defender === playerPokemon) ? battle.playerStatus : battle.wildStatus;
							if (defenderStatus === 'frz' && move.category !== 'Status' && move.type === 'Fire') {
								if (defender === playerPokemon) battle.playerStatus = null;
								else battle.wildStatus = null;
								messageLog.push(`${defender.species} was thawed out by the attack!`);
							}

							if (move.secondary && move.secondary.status && Math.random() * 100 < move.secondary.chance) {
								const defenderCurrentStatus = (defender === playerPokemon) ? battle.playerStatus : battle.wildStatus;
								if (!defenderCurrentStatus) {
									let status = move.secondary.status;
									if (status === 'tox') status = 'psn';
									const statusName = {psn: 'poisoned', brn: 'burned', slp: 'put to sleep', par: 'paralyzed', frz: 'frozen'}[status as Status];
									if (status === 'slp') {
										const sleepTurns = 1 + Math.floor(Math.random() * 3);
										if (defender === playerPokemon) {
											battle.playerStatus = 'slp';
											battle.playerSleepCounter = sleepTurns;
										} else {
											battle.wildStatus = 'slp';
											battle.wildSleepCounter = sleepTurns;
										}
										messageLog.push(`${defender.species} fell asleep!`);
									} else {
										if (defender === playerPokemon) battle.playerStatus = status as Status;
										else battle.wildStatus = status as Status;
										messageLog.push(`${defender.species} was ${statusName}!`);
									}
								}
							}
						}
					}
					
					if (wildPokemon.hp <= 0 || playerPokemon.hp <= 0) break;
				}

				if (wildPokemon.hp > 0 && playerPokemon.hp > 0) {
					const endTurnOrder = [playerPokemon, wildPokemon];
					for (const pokemon of endTurnOrder) {
						if (pokemon.hp <= 0) continue;
						const status = (pokemon === playerPokemon) ? battle.playerStatus : battle.wildStatus;
						if (status === 'brn' || status === 'psn') {
							const divisor = (status === 'psn') ? 8 : 16;
							const damage = Math.max(1, Math.floor(pokemon.maxHp / divisor));
							pokemon.hp = Math.max(0, pokemon.hp - damage);
							const statusName = status === 'brn' ? 'burn' : 'poison';
							messageLog.push(`${pokemon.species} was hurt by its ${statusName}!`);
						}
					}
				}

				if (wildPokemon.hp <= 0) {
					saveBattleStatus(battle);
					activeBattles.delete(user.id);
					const moneyGained = Math.floor(wildPokemon.level * 10);
					player.money += moneyGained;
					const { messages: expMessages } = gainExperience(player, playerPokemon, wildPokemon, room, user);
					if (player.pendingMoveLearnQueue?.moveIds.length) {
						return this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateMoveLearnHTML(player)}`);
					}
					return this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateVictoryHTML(wildPokemon, expMessages, moneyGained)}`);
				}

				if (playerPokemon.hp <= 0) {
					if (!player.party.some(p => p.hp > 0)) {
						saveBattleStatus(battle);
						activeBattles.delete(user.id);
						const moneyLost = Math.min(player.money, 100);
						player.money -= moneyLost;
						return this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateDefeatHTML(moneyLost)}`);
					} else {
						return this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateSwitchPokemonHTML(battle, "Choose a Pokemon to switch to.")}`);
					}
				}
				
				this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateBattleHTML(battle, messageLog)}`);
			},
			'switch'(target, room, user) {
				const battle = activeBattles.get(user.id);
				if (!battle) return this.errorReply("You are not in a battle.");
				const player = getPlayerData(battle.playerId);

				const pokemonId = target.trim();
				const nextPokemon = player.party.find(p => p.id === pokemonId && p.hp > 0);
				if (!nextPokemon) return this.errorReply("Invalid Pokemon or it has fainted.");
				if (nextPokemon.id === battle.activePokemon.id) return this.errorReply("This Pokemon is already in battle.");
				
				// Save status of the pokemon switching out
				const oldPokemonInParty = player.party.find(p => p.id === battle.activePokemon.id);
				if (oldPokemonInParty) {
					if (battle.playerStatus === 'slp' || battle.playerStatus === 'frz') {
						oldPokemonInParty.status = null;
					} else {
						oldPokemonInParty.status = battle.playerStatus;
					}
				}

				battle.activePokemon = nextPokemon;
				battle.playerStatus = nextPokemon.status; // Load status of incoming pokemon
				battle.playerStatStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
				battle.turn++;
				
				const messageLog = [`Go, ${nextPokemon.species}!`];
				const wildMoveData = battle.wildPokemon.moves[Math.floor(Math.random() * battle.wildPokemon.moves.length)];
				const wildResult = calculateDamage(battle.wildPokemon, battle.activePokemon, wildMoveData.id, battle.wildStatStages, battle.playerStatStages, battle.wildStatus);
				battle.activePokemon.hp = Math.max(0, battle.activePokemon.hp - wildResult.damage);
				messageLog.push(wildResult.message);
				if (wildResult.damage > 0) messageLog.push(`${battle.activePokemon.species} took ${wildResult.damage} damage!`);
				this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateBattleHTML(battle, messageLog)}`);
			},
			'catchmenu'(target, room, user) {
                const battle = activeBattles.get(user.id);
                if (!battle) return this.errorReply("You are not in a battle.");
                const player = getPlayerData(battle.playerId);
                this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateCatchMenuHTML(player, battle)}`);
            },
			'catch'(target, room, user) {
				const battle = activeBattles.get(user.id);
				if (!battle) return this.errorReply("You are not in a battle.");
				battle.turn++;

				const player = getPlayerData(battle.playerId);
				const ballId = toID(target);
				const ballItem = player.inventory.get(ballId);

				if (!ballItem || ballItem.category !== 'pokeball' || ballItem.quantity < 1) {
					return this.errorReply(`You don't have any ${ITEMS_DATABASE[ballId]?.name || 'of that item'}!`);
				}
				if (player.party.length >= 6 && player.pc.size >= 100) {
					return this.errorReply("Your party and PC are full!");
				}

				removeItemFromInventory(player, ballId, 1);
				const messageLog: string[] = [];
				messageLog.push(`${player.name} used a ${ballItem.name}!`);

				const catchResult = performCatchAttempt(battle, ballId);
				const shakeMessages = [
					"Oh no! The Pokemon broke free!",
					"Aww! It appeared to be caught!",
					"Aargh! Almost had it!",
					"Gah! It was so close, too!",
				];
				
				for (let i = 1; i <= catchResult.shakes; i++) {
                    if (i < 4) {
                        messageLog.push("...The ball shook...");
                    }
                }

				if (catchResult.success) {
					saveBattleStatus(battle);
					activeBattles.delete(user.id);
					const caughtPokemon = battle.wildPokemon;
                    if (ballId === 'healball') {
                        caughtPokemon.hp = caughtPokemon.maxHp;
						caughtPokemon.status = null;
                    }
					const location = player.party.length < 6 ? "your party" : "PC";
					if (player.party.length < 6) {
						player.party.push(caughtPokemon);
					} else {
						storePokemonInPC(player, caughtPokemon);
					}

					let successMessage = `<h2>Gotcha!</h2><p><strong>${caughtPokemon.species}</strong> was caught!</p>`;
                    if (ballId === 'healball') successMessage += `<p>${caughtPokemon.species} was fully healed!</p>`;

					this.sendReply(`|uhtmlchange|rpg-${user.id}|<div class="infobox">${successMessage}${generatePokemonInfoHTML(caughtPokemon)}<p>${caughtPokemon.species} has been sent to ${location}.</p><p><button name="send" value="/rpg wildpokemon" class="button">Find Another</button><button name="send" value="/rpg menu" class="button">Back to Menu</button></p></div>`);
				} else {
					messageLog.push(shakeMessages[catchResult.shakes]);

					const wildMoveData = battle.wildPokemon.moves[Math.floor(Math.random() * battle.wildPokemon.moves.length)];
					const wildResult = calculateDamage(battle.wildPokemon, battle.activePokemon, wildMoveData.id, battle.wildStatStages, battle.playerStatStages, battle.wildStatus);
					battle.activePokemon.hp = Math.max(0, battle.activePokemon.hp - wildResult.damage);
					messageLog.push(wildResult.message);
					if (wildResult.damage > 0) {
						messageLog.push(`${battle.activePokemon.species} took ${wildResult.damage} damage!`);
					}
					
					if (battle.activePokemon.hp <= 0) {
						if (!player.party.some(p => p.hp > 0)) {
							saveBattleStatus(battle);
							activeBattles.delete(user.id);
							const moneyLost = Math.min(player.money, 100);
							player.money -= moneyLost;
							return this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateDefeatHTML(moneyLost)}`);
						} else {
							return this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateSwitchPokemonHTML(battle, "Choose a Pokemon to switch to.")}`);
						}
					}
					this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateBattleHTML(battle, messageLog)}`);
				}
			},
			'run'(target, room, user) {
				const battle = activeBattles.get(user.id);
				if (!battle) return this.errorReply("You are not in a battle.");
				saveBattleStatus(battle);
				activeBattles.delete(user.id);
				this.sendReply(`|uhtmlchange|rpg-${user.id}|<div class="infobox"><h2>Got away safely!</h2><p>You ran away from the wild Pokemon.</p><p><button name="send" value="/rpg wildpokemon" class="button">Find Another</button><button name="send" value="/rpg explore" class="button">Continue Exploring</button></p></div>`);
			},
			'back'(target, room, user) {
				const battle = activeBattles.get(user.id);
				if (battle) {
					this.sendReply(`|uhtmlchange|rpg-${user.id}|${generateBattleHTML(battle, ["You returned to the battle."])}`);
				}
			},
			'': 'help',
			help() {
				this.sendReply("Battle commands: /rpg battleaction [move|switch|catchmenu|run]");
			}
		},

		explore(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot explore during a battle.");
			}
			this.sendReply(`|uhtmlchange|rpg-${user.id}|<div class="infobox"><h2>Explore</h2><p>Choose where to explore:</p><p><button name="send" value="/rpg wildpokemon" class="button">🛤️ Tall Grass</button><button name="send" value="/rpg shop" class="button">🏪 Poke Mart</button><button name="send" value="/rpg heal" class="button">🏥 Pokemon Center</button></p><p><button name="send" value="/rpg menu" class="button">Back to Menu</button></p></div>`);
		},

		heal(target, room, user) {
			if (activeBattles.has(user.id)) {
				return this.errorReply("You cannot heal your Pokemon during a battle.");
			}
			const player = getPlayerData(user.id);
			
			for (const pokemon of player.party) {
				pokemon.hp = pokemon.maxHp;
				pokemon.status = null;
				for (const move of pokemon.moves) {
					const moveData = Dex.moves.get(move.id);
					move.pp = moveData.pp || 5;
				}
			}
		
			const healHTML = `<div class="infobox"><h2>Pokemon Healed!</h2><p>Welcome to the Pokémon Center. We've restored your Pokémon to full health.</p><p>We hope to see you again!</p><p><button name="send" value="/rpg party" class="button">View Party</button><button name="send" value="/rpg explore" class="button">Explore</button></p></div>`;
			this.sendReply(`|uhtmlchange|rpg-${user.id}|${healHTML}`);
		},

		help() {
			return this.parse('/help rpg');
		},
		'': 'help',
	},
};

export const helpData = [
	"/rpg start - Start your Pokemon RPG adventure",
	"/rpg menu - Access the main RPG menu",
	"/rpg profile - View your trainer profile",
	"/rpg party - View your Pokemon party",
	"/rpg summary [pokemon id] - View a detailed summary of a Pokemon in your party",
	"/rpg battle - Access battle options",
	"/rpg wildpokemon - Find and battle a wild Pokemon",
	"/rpg items - View your inventory",
	"/rpg pc - Access Pokemon PC storage system",
	"/rpg heal - Restore your party's HP, PP, and status conditions.",
	"/rpg learnmove [move to replace | skip] - Make a decision on learning a new move",
];
