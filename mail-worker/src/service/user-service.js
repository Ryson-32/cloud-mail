import BizError from '../error/biz-error';
import accountService from './account-service';
import orm from '../entity/orm';
import user from '../entity/user';
import account from '../entity/account';
import email from '../entity/email';
import { and, asc, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { emailConst, isDel, roleConst, userConst } from '../const/entity-const';
import kvConst from '../const/kv-const';
import KvConst from '../const/kv-const';
import cryptoUtils from '../utils/crypto-utils';
import emailService from './email-service';
import dayjs from 'dayjs';
import permService from './perm-service';
import roleService from './role-service';
import emailUtils from '../utils/email-utils';
import saltHashUtils from '../utils/crypto-utils';
import constant from '../const/constant';
import { t } from '../i18n/i18n'
import reqUtils from '../utils/req-utils';

// 排序字段映射
function getSortColumn(sortField) {
	const sortMap = {
		'oauthId': user.oauthId,
		'oauthUsername': user.oauthUsername,
		'trustLevel': user.trustLevel,
		'createTime': user.createTime,
		'status': user.status,
		'type': user.type,
		'userNumber': user.userNumber,
		// 注意：receiveEmailCount, sendEmailCount, accountCount 需要在查询后排序
	};
	return sortMap[sortField];
}

const userService = {

	async loginUserInfo(c, userId) {

		const userRow = await userService.selectById(c, userId);

		const [account, roleRow, permKeys] = await Promise.all([
			accountService.selectByEmailIncludeDel(c, userRow.email),
			roleService.selectById(c, userRow.type),
			userRow.email === c.env.admin ? Promise.resolve(['*']) : permService.userPermKeys(c, userId)
		]);

		const user = {};
		user.userId = userRow.userId;
		user.sendCount = userRow.sendCount;
		user.email = userRow.email;
		// 如果没有账户，提供默认值
		user.accountId = account ? account.accountId : 0;
		user.name = account ? account.name : `User${userRow.userId}`;
		user.permKeys = permKeys;
		user.role = roleRow;
		// 添加LinuxDo相关信息
		user.oauthProvider = userRow.oauthProvider;
		user.oauthId = userRow.oauthId;
		user.oauthUsername = userRow.oauthUsername;
		user.avatarTemplate = userRow.avatarTemplate;

		if (c.env.admin === userRow.email) {
			user.role = constant.ADMIN_ROLE
		}

		return user;
	},


	async resetPassword(c, params, userId) {

		const { password } = params;

		if (password < 6) {
			throw new BizError(t('pwdMinLengthLimit'));
		}
		const { salt, hash } = await cryptoUtils.hashPassword(password);
		await orm(c).update(user).set({ password: hash, salt: salt }).where(eq(user.userId, userId)).run();
	},

	selectByEmail(c, email) {
		return orm(c).select().from(user).where(
			and(
				eq(user.email, email),
				eq(user.isDel, isDel.NORMAL)))
			.get();
	},

	async insert(c, params) {
		// 获取当前最大用户序号
		const maxNumberResult = await orm(c)
			.select({ maxNumber: sql`MAX(${user.userNumber})` })
			.from(user)
			.get();
		const nextNumber = (maxNumberResult?.maxNumber || 0) + 1;
		
		// 插入用户时包含序号
		const { userId } = await orm(c).insert(user)
			.values({ ...params, userNumber: nextNumber })
			.returning()
			.get();
		return userId;
	},

	selectByEmailIncludeDel(c, email) {
		return orm(c).select().from(user).where(sql`${user.email} COLLATE NOCASE = ${email}`).get();
	},

	selectById(c, userId) {
		return orm(c).select().from(user).where(
			and(
				eq(user.userId, userId),
				eq(user.isDel, isDel.NORMAL)))
			.get();
	},

	async delete(c, userId) {
		await orm(c).update(user).set({ isDel: isDel.DELETE }).where(eq(user.userId, userId)).run();
		await c.env.kv.delete(kvConst.AUTH_INFO + userId)
	},


	async physicsDeleteAll(c) {
		const userIdsRow = await orm(c).select().from(user).where(eq(user.isDel, isDel.DELETE)).limit(99);
		if (userIdsRow.length === 0) {
			return;
		}
		const userIds = userIdsRow.map(item => item.userId);
		await accountService.physicsDeleteByUserIds(c, userIds);
		await orm(c).delete(user).where(inArray(user.userId, userIds)).run();
		if (userIdsRow.length === 99) {
			await this.physicsDeleteAll(c);
		}
	},

	async physicsDelete(c, params) {
		const { userId } = params
		await accountService.physicsDeleteByUserIds(c, [userId])
		await orm(c).delete(user).where(eq(user.userId, userId)).run();
		await c.env.kv.delete(kvConst.AUTH_INFO + userId);
	},

	async list(c, params) {

		let { num, size, keyword, timeSort, status, sortField, sortOrder } = params;

		size = Number(size);
		num = Number(num);
		timeSort = Number(timeSort);
		params.isDel = Number(params.isDel);
		if (size > 50) {
			size = 50;
		}

		num = (num - 1) * size;

		const conditions = [];

		if (status > -1) {
			conditions.push(eq(user.status, status));
			conditions.push(eq(user.isDel, isDel.NORMAL));
		}

		// 支持搜索邮箱、用户ID、LinuxDo用户名和所有账户邮箱
		if (keyword) {
			// 先获取匹配关键词的账户用户ID
			const matchingAccountUserIds = await orm(c)
				.select({ userId: account.userId })
				.from(account)
				.where(and(
					sql`${account.email} COLLATE NOCASE LIKE ${'%' + keyword + '%'}`,
					eq(account.isDel, isDel.NORMAL)
				))
				.all();

			const accountUserIds = matchingAccountUserIds.map(item => item.userId);

			// 构建搜索条件 - 使用or函数
			const searchConditions = [
				// 1. 用户主邮箱模糊匹配
				sql`${user.email} COLLATE NOCASE LIKE ${'%' + keyword + '%'}`,
				// 2. LinuxDo论坛ID数字匹配
				sql`CAST(${user.oauthId} AS TEXT) LIKE ${'%' + keyword + '%'}`,
				// 3. LinuxDo用户名模糊匹配
				sql`${user.oauthUsername} COLLATE NOCASE LIKE ${'%' + keyword + '%'}`
			];

			// 4. 所有关联邮箱匹配
			if (accountUserIds.length > 0) {
				searchConditions.push(inArray(user.userId, accountUserIds));
			}

			// 使用or函数连接搜索条件
			conditions.push(or(...searchConditions));
		}


		if (params.isDel) {
			conditions.push(eq(user.isDel, params.isDel));
		}


		const query = orm(c).select().from(user)
			.where(and(...conditions));

		// 处理排序
		if (sortField && sortOrder) {
			const sortColumn = getSortColumn(sortField);
			if (sortColumn) {
				// 特殊处理 userNumber 字段，确保 NULL 值在最后
				if (sortField === 'userNumber') {
					if (sortOrder === 'asc') {
						// 升序：NULL 值在最后
						query.orderBy(sql`CASE WHEN ${user.userNumber} IS NULL THEN 999999 ELSE ${user.userNumber} END ASC`);
					} else {
						// 降序：NULL 值在最后
						query.orderBy(sql`CASE WHEN ${user.userNumber} IS NULL THEN -1 ELSE ${user.userNumber} END DESC`);
					}
				} else {
					if (sortOrder === 'asc') {
						query.orderBy(asc(sortColumn));
					} else {
						query.orderBy(desc(sortColumn));
					}
				}
			} else {
				// 对于计算字段，暂时使用默认排序，在获取数据后再排序
				if (timeSort) {
					query.orderBy(asc(user.userId));
				} else {
					query.orderBy(desc(user.userId));
				}
			}
		} else if (timeSort) {
			query.orderBy(asc(user.userId));
		} else {
			query.orderBy(desc(user.userId));
		}

		// 使用JOIN查询在数据库层面进行全局排序，避免SQL变量过多的问题
		let list, total;

		if (sortField && sortOrder && ['receiveEmailCount', 'sendEmailCount', 'accountCount'].includes(sortField)) {
			// 对于计算字段，使用JOIN查询直接在数据库层面排序
			const sortDirection = sortOrder === 'asc' ? asc : desc;

			// 构建排序子查询
			let sortSubquery;

			if (sortField === 'receiveEmailCount') {
				sortSubquery = orm(c)
					.select({
						userId: email.userId,
						count: count(email.emailId).as('email_count')
					})
					.from(email)
					.where(and(
						eq(email.type, emailConst.type.RECEIVE),
						eq(email.isDel, isDel.NORMAL)
					))
					.groupBy(email.userId)
					.as('receive_counts');
			} else if (sortField === 'sendEmailCount') {
				sortSubquery = orm(c)
					.select({
						userId: email.userId,
						count: count(email.emailId).as('email_count')
					})
					.from(email)
					.where(and(
						eq(email.type, emailConst.type.SEND),
						eq(email.isDel, isDel.NORMAL)
					))
					.groupBy(email.userId)
					.as('send_counts');
			} else if (sortField === 'accountCount') {
				sortSubquery = orm(c)
					.select({
						userId: account.userId,
						count: count(account.accountId).as('account_count')
					})
					.from(account)
					.where(eq(account.isDel, isDel.NORMAL))
					.groupBy(account.userId)
					.as('account_counts');
			}

			// 主查询：JOIN用户表和统计子查询
			const sortedQuery = orm(c)
				.select({
					...user
				})
				.from(user)
				.leftJoin(sortSubquery, eq(user.userId, sortSubquery.userId))
				.where(and(...conditions))
				.orderBy(sortDirection(sql`COALESCE(${sortSubquery.count}, 0)`));

			// 获取总数
			const { total: totalCount } = await orm(c)
				.select({ total: count() })
				.from(user)
				.where(and(...conditions)).get();

			total = totalCount;

			// 分页查询
			list = await sortedQuery.limit(size).offset(num);
		} else {
			// 对于非计算字段，使用原有的分页查询
			list = await query.limit(size).offset(num);
			const { total: totalCount } = await orm(c)
				.select({ total: count() })
				.from(user)
				.where(and(...conditions)).get();

			total = totalCount;
		}

		// 获取用户相关数据
		const userIds = list.map(user => user.userId);
		const types = [...new Set(list.map(user => user.type))];

		const [emailCounts, delEmailCounts, sendCounts, delSendCounts, accountCounts, delAccountCounts, roleList, userAccounts] = await Promise.all([
			emailService.selectUserEmailCountList(c, userIds, emailConst.type.RECEIVE),
			emailService.selectUserEmailCountList(c, userIds, emailConst.type.RECEIVE, isDel.DELETE),
			emailService.selectUserEmailCountList(c, userIds, emailConst.type.SEND),
			emailService.selectUserEmailCountList(c, userIds, emailConst.type.SEND, isDel.DELETE),
			accountService.selectUserAccountCountList(c, userIds),
			accountService.selectUserAccountCountList(c, userIds, isDel.DELETE),
			roleService.selectByIdsHasPermKey(c, types,'email:send'),
			accountService.selectByUserIds(c, userIds)
		]);

		const receiveMap = Object.fromEntries(emailCounts.map(item => [item.userId, item.count]));
		const sendMap = Object.fromEntries(sendCounts.map(item => [item.userId, item.count]));
		const accountMap = Object.fromEntries(accountCounts.map(item => [item.userId, item.count]));

		const delReceiveMap = Object.fromEntries(delEmailCounts.map(item => [item.userId, item.count]));
		const delSendMap = Object.fromEntries(delSendCounts.map(item => [item.userId, item.count]));
		const delAccountMap = Object.fromEntries(delAccountCounts.map(item => [item.userId, item.count]));

		// 按用户ID分组账户信息
		const userAccountsMap = {};
		userAccounts.forEach(account => {
			if (!userAccountsMap[account.userId]) {
				userAccountsMap[account.userId] = [];
			}
			userAccountsMap[account.userId].push({
				accountId: account.accountId,
				email: account.email,
				name: account.name
			});
		});

		for (const user of list) {
			const userId = user.userId;

			user.receiveEmailCount = receiveMap[userId] || 0;
			user.sendEmailCount = sendMap[userId] || 0;
			user.accountCount = accountMap[userId] || 0;

			user.delReceiveEmailCount = delReceiveMap[userId] || 0;
			user.delSendEmailCount = delSendMap[userId] || 0;
			user.delAccountCount = delAccountMap[userId] || 0;

			// 添加用户账户信息
			user.accounts = userAccountsMap[userId] || [];

			const roleIndex = roleList.findIndex(roleRow => user.type === roleRow.roleId);
			let sendAction = {};

			if (roleIndex > -1) {
				sendAction.sendType = roleList[roleIndex].sendType;
				sendAction.sendCount = roleList[roleIndex].sendCount;
				sendAction.hasPerm = true;
			} else {
				sendAction.hasPerm = false;
			}

			if (user.email === c.env.admin) {
				sendAction.sendType = constant.ADMIN_ROLE.sendType;
				sendAction.sendCount = constant.ADMIN_ROLE.sendCount;
				sendAction.hasPerm = true;
				user.type = 0
			}

			user.sendAction = sendAction;
		}



		return { list, total };
	},

	async updateUserInfo(c, userId, recordCreateIp = false) {



		const activeIp = reqUtils.getIp(c);

		const {os, browser, device} = reqUtils.getUserAgent(c);

		const params = {
			os,
			browser,
			device,
			activeIp,
			activeTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
		};

		if (recordCreateIp) {
			params.createIp = activeIp;
		}

		await orm(c)
			.update(user)
			.set(params)
			.where(eq(user.userId, userId))
			.run();
	},

	async setPwd(c, params) {

		const { password, userId } = params;
		await this.resetPassword(c, { password }, userId);
	},

	async setStatus(c, params) {

		const { status, userId } = params;

		await orm(c)
			.update(user)
			.set({ status })
			.where(eq(user.userId, userId))
			.run();

		if (status === userConst.status.BAN) {
			await c.env.kv.delete(KvConst.AUTH_INFO + userId);
		}
	},

	async setType(c, params) {

		const { type, userId } = params;

		const roleRow = await roleService.selectById(c, type);

		if (!roleRow) {
			throw new BizError(t('roleNotExist'));
		}

		await orm(c)
			.update(user)
			.set({ type })
			.where(eq(user.userId, userId))
			.run();

	},

	async incrUserSendCount(c, quantity, userId) {
		await orm(c).update(user).set({
			sendCount: sql`${user.sendCount}
	  +
	  ${quantity}`
		}).where(eq(user.userId, userId)).run();
	},

	async updateAllUserType(c, type, curType) {
		await orm(c)
			.update(user)
			.set({ type })
			.where(eq(user.type, curType))
			.run();
	},

	async add(c, params) {

		const { email, type, password } = params;

		if (!c.env.domain.includes(emailUtils.getDomain(email))) {
			throw new BizError(t('notEmailDomain'));
		}

		if (password.length < 6) {
			throw new BizError(t('pwdMinLengthLimit'));
		}

		const accountRow = await accountService.selectByEmailIncludeDel(c, email);

		if (accountRow && accountRow.isDel === isDel.DELETE) {
			throw new BizError(t('isDelUser'));
		}

		if (accountRow) {
			throw new BizError(t('isRegAccount'));
		}

		const role = roleService.selectById(c, type);

		if (!role) {
			throw new BizError(t('roleNotExist'));
		}

		const { salt, hash } = await saltHashUtils.hashPassword(password);

		const userId = await userService.insert(c, { email, password: hash, salt, type });

		await userService.updateUserInfo(c, userId, true);

		// 不再自动创建主邮箱账户，用户需要手动添加邮箱
		// await accountService.insert(c, { userId: userId, email, type, name: emailUtils.getName(email) });
	},

	async resetDaySendCount(c) {
		const roleList = await roleService.selectByIdsAndSendType(c, 'email:send', roleConst.sendType.DAY);
		const roleIds = roleList.map(action => action.roleId);
		await orm(c).update(user).set({ sendCount: 0 }).where(inArray(user.type, roleIds)).run();
	},

	async resetSendCount(c, params) {
		await orm(c).update(user).set({ sendCount: 0 }).where(eq(user.userId, params.userId)).run();
	},

	async restore(c, params) {
		const { userId, type } = params
		await orm(c)
			.update(user)
			.set({ isDel: isDel.NORMAL })
			.where(eq(user.userId, userId))
			.run();
		const userRow = await this.selectById(c, userId);
		await accountService.restoreByEmail(c, userRow.email);

		if (type) {
			await emailService.restoreByUserId(c, userId);
			await accountService.restoreByUserId(c, userId);
		}

	},

	listByRegKeyId(c, regKeyId) {
		return orm(c)
			.select({email: user.email,createTime: user.createTime})
			.from(user)
			.where(eq(user.regKeyId, regKeyId))
			.orderBy(desc(user.userId))
			.all();
	},

	/**
	 * 根据OAuth ID查询用户
	 * @param {Object} c - Hono context
	 * @param {string} provider - OAuth提供商
	 * @param {string} oauthId - OAuth用户ID
	 * @returns {Object|null} 用户信息
	 */
	selectByOAuthId(c, provider, oauthId) {
		return orm(c).select().from(user).where(
			and(
				eq(user.oauthProvider, provider),
				eq(user.oauthId, oauthId),
				eq(user.isDel, isDel.NORMAL)
			)
		).get();
	},

	/**
	 * 创建OAuth用户
	 * @param {Object} c - Hono context
	 * @param {Object} params - 用户参数
	 * @returns {number} 用户ID
	 */
	async insertOAuthUser(c, params) {
		// 获取当前最大用户序号
		const maxNumberResult = await orm(c)
			.select({ maxNumber: sql`MAX(${user.userNumber})` })
			.from(user)
			.get();
		const nextNumber = (maxNumberResult?.maxNumber || 0) + 1;
		
		// 插入用户时包含序号
		const { userId } = await orm(c).insert(user)
			.values({ ...params, userNumber: nextNumber })
			.returning()
			.get();
		return userId;
	},

	/**
	 * 关联OAuth信息到现有用户
	 * @param {Object} c - Hono context
	 * @param {number} userId - 用户ID
	 * @param {string} provider - OAuth提供商
	 * @param {string} oauthId - OAuth用户ID
	 * @param {string} oauthUsername - OAuth用户名
	 * @param {number} trustLevel - 信任等级
	 * @param {string} avatarTemplate - 头像模板URL
	 */
	async linkOAuth(c, userId, provider, oauthId, oauthUsername, trustLevel = 0, avatarTemplate = null) {
		await orm(c)
			.update(user)
			.set({
				oauthProvider: provider,
				oauthId: oauthId,
				oauthUsername: oauthUsername,
				avatarTemplate: avatarTemplate,
				trustLevel: trustLevel
			})
			.where(eq(user.userId, userId))
			.run();
	},

	/**
	 * 重新激活已删除的用户
	 * @param {Object} c - Hono context
	 * @param {number} userId - 用户ID
	 */
	async reactivateUser(c, userId) {
		await orm(c)
			.update(user)
			.set({
				isDel: isDel.NORMAL,
				status: userConst.status.NORMAL
			})
			.where(eq(user.userId, userId))
			.run();
	},

	/**
	 * 更新用户邮箱
	 * @param {Object} c - Hono context
	 * @param {number} userId - 用户ID
	 * @param {string} newEmail - 新邮箱
	 */
	async updateUserEmail(c, userId, newEmail) {
		await orm(c)
			.update(user)
			.set({ email: newEmail })
			.where(eq(user.userId, userId))
			.run();
	}
};

export default userService;
