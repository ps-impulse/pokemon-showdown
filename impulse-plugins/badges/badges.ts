export const commands: ChatCommands = {
	badges: {
		''(target, room, user) {
			if (!target) {
				return this.sendReply("Usage: /badges [username] - View badges for a user");
			}
			
			const targetUser = Users.get(target);
			if (!targetUser) {
				return this.sendReply(`User "${target}" not found.`);
			}
			
			if (!targetUser.badges || !targetUser.badges.length) {
				return this.sendReply(`${targetUser.name} has no badges.`);
			}
			
			const badgeCategories: {[key: string]: string} = {
				'champion': 'Tournament Champion',
				'expert': 'Battle Expert',
				'veteran': 'Veteran Player',
				'contributor': 'Community Contributor',
				'winner': 'Contest Winner',
				'master': 'Battle Master',
				'legend': 'Legendary Player'
			};
			
			let badgeList = `<strong>${targetUser.name}'s Badges:</strong><br/>`;
			for (const badgeData of targetUser.badges) {
				const parts = badgeData.split('|');
				const type = parts[0];
				const description = badgeCategories[type] || 'Special Achievement';
				badgeList += `• ${description}<br/>`;
			}
			
			this.sendReplyBox(badgeList);
		},
		
		give: 'award',
		award(target, room, user) {
			this.checkCan('globalban');
			
			const [username, badgeType] = target.split(',').map(s => s.trim());
			if (!username || !badgeType) {
				return this.sendReply("Usage: /badges award [username], [badge type]");
			}
			
			const targetUser = Users.get(username);
			if (!targetUser) {
				return this.sendReply(`User "${username}" not found.`);
			}
			
			const validBadges = ['champion', 'expert', 'veteran', 'contributor', 'winner', 'master', 'legend'];
			if (!validBadges.includes(badgeType)) {
				return this.sendReply(`Invalid badge type. Valid types: ${validBadges.join(', ')}`);
			}
			
			if (!targetUser.badges) targetUser.badges = [];
			
			// Check if user already has this badge
			const hasBadge = targetUser.badges.some(badge => badge.split('|')[0] === badgeType);
			if (hasBadge) {
				return this.sendReply(`${targetUser.name} already has the ${badgeType} badge.`);
			}
			
			targetUser.badges.push(`${badgeType}|`);
			
			this.sendReply(`Awarded ${badgeType} badge to ${targetUser.name}.`);
			targetUser.sendTo(room, `You have been awarded the ${badgeType} badge!`);
		},
		
		remove: 'revoke',
		revoke(target, room, user) {
			this.checkCan('globalban');
			
			const [username, badgeType] = this.splitTarget(target).split(',').map(s => s.trim());
			if (!username || !badgeType) {
				return this.sendReply("Usage: /badges revoke [username], [badge type]");
			}
			
			const targetUser = Users.get(username);
			if (!targetUser) {
				return this.sendReply(`User "${username}" not found.`);
			}
			
			if (!targetUser.badges || !targetUser.badges.length) {
				return this.sendReply(`${targetUser.name} has no badges to revoke.`);
			}
			
			const badgeIndex = targetUser.badges.findIndex(badge => badge.split('|')[0] === badgeType);
			if (badgeIndex === -1) {
				return this.sendReply(`${targetUser.name} does not have the ${badgeType} badge.`);
			}
			
			targetUser.badges.splice(badgeIndex, 1);
			
			this.sendReply(`Revoked ${badgeType} badge from ${targetUser.name}.`);
			targetUser.sendTo(room, `Your ${badgeType} badge has been revoked.`);
		},
		
		list(target, room, user) {
			const badgeCategories: {[key: string]: string} = {
				'champion': 'Tournament Champion',
				'expert': 'Battle Expert',
				'veteran': 'Veteran Player',
				'contributor': 'Community Contributor',
				'winner': 'Contest Winner',
				'master': 'Battle Master',
				'legend': 'Legendary Player'
			};
			
			let badgeList = '<strong>Available Badge Types:</strong><br/>';
			for (const [type, description] of Object.entries(badgeCategories)) {
				badgeList += `• <strong>${type}</strong>: ${description}<br/>`;
			}
			
			this.sendReplyBox(badgeList);
		},
		
		help() {
			this.sendReplyBox(`
				<strong>Badge Commands:</strong><br/>
				• <code>/badges [username]</code> - View badges for a user<br/>
				• <code>/badges award [username], [badge type]</code> - Award a badge (Requires: rangeban)<br/>
				• <code>/badges revoke [username], [badge type]</code> - Revoke a badge (Requires: rangeban)<br/>
				• <code>/badges list</code> - List all available badge types<br/>
				• <code>/badges help</code> - Show this help
			`);
		}
	}
};

// Battle integration - replaces the seasons onBattleStart handler
export const handlers: Chat.Handlers = {
	onBattleStart(user, room) {
		if (!room.battle) return;
		if (!user.badges || !user.badges.length) return;
		
		const slot = room.battle.playerTable[user.id]?.slot;
		if (!slot) return;
		
		// Send badge data for each badge (limit to 3 as per original display code)
		for (const badgeData of user.badges.slice(0, 3)) {
			room.add(`|badge|${slot}|${badgeData}`);
		}
		
		room.update();
	},
};
