import BizError from '../error/biz-error';
import userService from './user-service';
import emailUtils from '../utils/email-utils';
import { isDel, settingConst, userConst } from '../const/entity-const';
import JwtUtils from '../utils/jwt-utils';
import { v4 as uuidv4 } from 'uuid';
import KvConst from '../const/kv-const';
import constant from '../const/constant';
import userContext from '../security/user-context';
import verifyUtils from '../utils/verify-utils';
import accountService from './account-service';
import settingService from './setting-service';
import saltHashUtils from '../utils/crypto-utils';
import cryptoUtils from '../utils/crypto-utils';
import turnstileService from './turnstile-service';
import roleService from './role-service';
import regKeyService from './reg-key-service';
import dayjs from 'dayjs';
import { toUtc } from '../utils/date-uitil';
import { t } from '../i18n/i18n.js';
import verifyRecordService from './verify-record-service';

const loginService = {

	async register(c, params) {

		const { email, password, token, code } = params;

		const {regKey, register, registerVerify, regVerifyCount} = await settingService.query(c)


		if (register === settingConst.register.CLOSE) {
			throw new BizError(t('regDisabled'));
		}

		if (!verifyUtils.isEmail(email)) {
			throw new BizError(t('notEmail'));
		}

		if (password.length > 30) {
			throw new BizError(t('pwdLengthLimit'));
		}

		if (emailUtils.getName(email).length > 30) {
			throw new BizError(t('emailLengthLimit'));
		}

		if (password.length < 6) {
			throw new BizError(t('pwdMinLengthLimit'));
		}

		if (!c.env.domain.includes(emailUtils.getDomain(email))) {
			throw new BizError(t('notEmailDomain'));
		}

		let type = null;
		let regKeyId = 0

		if (regKey === settingConst.regKey.OPEN) {
			const result = await this.handleOpenRegKey(c, regKey, code)
			type = result?.type
			regKeyId = result?.regKeyId
		}

		if (regKey === settingConst.regKey.OPTIONAL) {
			const result = await this.handleOpenOptional(c, regKey, code)
			type = result?.type
			regKeyId = result?.regKeyId
		}

		const accountRow = await accountService.selectByEmailIncludeDel(c, email);

		if (accountRow && accountRow.isDel === isDel.DELETE) {
			throw new BizError(t('isDelUser'));
		}

		if (accountRow) {
			throw new BizError(t('isRegAccount'));
		}


		let defType = null

		if (!type) {
			const roleRow = await roleService.selectDefaultRole(c);
			defType = roleRow.roleId
		}


		const roleRow = await roleService.selectById(c, type || defType);

		if(!roleService.hasAvailDomainPerm(roleRow.availDomain, email)) {

			if (type) {
				throw new BizError(t('noDomainPermRegKey'),403)
			}

			if (defType) {
				throw new BizError(t('noDomainPermReg'),403)
			}

		}

		let regVerifyOpen = false

		if (registerVerify === settingConst.registerVerify.OPEN) {
			regVerifyOpen = true
			await turnstileService.verify(c,token)
		}

		if (registerVerify === settingConst.registerVerify.COUNT) {
			regVerifyOpen = await verifyRecordService.isOpenRegVerify(c, regVerifyCount);
			if (regVerifyOpen) {
				await turnstileService.verify(c,token)
			}
		}

		const { salt, hash } = await saltHashUtils.hashPassword(password);

		const userId = await userService.insert(c, { email, regKeyId,password: hash, salt, type: type || defType });

		await accountService.insert(c, { userId: userId, email, name: emailUtils.getName(email) });

		await userService.updateUserInfo(c, userId, true);

		if (regKey !== settingConst.regKey.CLOSE && type) {
			await regKeyService.reduceCount(c, code, 1);
		}

		if (registerVerify === settingConst.registerVerify.COUNT && !regVerifyOpen) {
			const row = await verifyRecordService.increaseRegCount(c);
			return {regVerifyOpen: row.count >= regVerifyCount}
		}

		return {regVerifyOpen}

	},

	async registerVerify() {

	},

	async handleOpenRegKey(c, regKey, code) {

		if (!code) {
			throw new BizError(t('emptyRegKey'));
		}

		const regKeyRow = await regKeyService.selectByCode(c, code);

		if (!regKeyRow) {
			throw new BizError(t('notExistRegKey'));
		}

		if (regKeyRow.count <= 0) {
			throw new BizError(t('noRegKeyCount'));
		}

		const today = toUtc().tz('Asia/Shanghai').startOf('day')
		const expireTime = toUtc(regKeyRow.expireTime).tz('Asia/Shanghai').startOf('day');

		if (expireTime.isBefore(today)) {
			throw new BizError(t('regKeyExpire'));
		}

		return { type: regKeyRow.roleId, regKeyId: regKeyRow.regKeyId };
	},

	async handleOpenOptional(c, regKey, code) {

		if (!code) {
			return null
		}

		const regKeyRow = await regKeyService.selectByCode(c, code);

		if (!regKeyRow) {
			return null
		}

		const today = toUtc().tz('Asia/Shanghai').startOf('day')
		const expireTime = toUtc(regKeyRow.expireTime).tz('Asia/Shanghai').startOf('day');

		if (regKeyRow.count <= 0 || expireTime.isBefore(today)) {
			return null
		}

		return { type: regKeyRow.roleId, regKeyId: regKeyRow.regKeyId };
	},

	async login(c, params) {

		const { email, password } = params;

		if (!email || !password) {
			throw new BizError(t('emailAndPwdEmpty'));
		}

		const userRow = await userService.selectByEmailIncludeDel(c, email);

		if (!userRow) {
			throw new BizError(t('notExistUser'));
		}

		if(userRow.isDel === isDel.DELETE) {
			throw new BizError(t('isDelUser'));
		}

		if(userRow.status === userConst.status.BAN) {
			throw new BizError(t('isBanUser'));
		}

		if (!await cryptoUtils.verifyPassword(password, userRow.salt, userRow.password)) {
			throw new BizError(t('IncorrectPwd'));
		}

		const uuid = uuidv4();
		const jwt = await JwtUtils.generateToken(c,{ userId: userRow.userId, token: uuid });

		let authInfo = await c.env.kv.get(KvConst.AUTH_INFO + userRow.userId, { type: 'json' });

		if (authInfo) {

			if (authInfo.tokens.length > 10) {
				authInfo.tokens.shift();
			}

			authInfo.tokens.push(uuid);

		} else {

			authInfo = {
				tokens: [],
				user: userRow,
				refreshTime: dayjs().toISOString()
			};

			authInfo.tokens.push(uuid);

		}

		await userService.updateUserInfo(c, userRow.userId);

		await c.env.kv.put(KvConst.AUTH_INFO + userRow.userId, JSON.stringify(authInfo), { expirationTtl: constant.TOKEN_EXPIRE });
		return jwt;
	},

	async logout(c, userId) {
		const token =userContext.getToken(c);
		const authInfo = await c.env.kv.get(KvConst.AUTH_INFO + userId, { type: 'json' });
		const index = authInfo.tokens.findIndex(item => item === token);
		authInfo.tokens.splice(index, 1);
		await c.env.kv.put(KvConst.AUTH_INFO + userId, JSON.stringify(authInfo));
	},

	/**
	 * OAuth登录处理
	 * @param {Object} c - Hono context
	 * @param {Object} oauthUserInfo - OAuth用户信息
	 * @returns {string} JWT token
	 */
	async oauthLogin(c, oauthUserInfo) {
		const { id: oauthId, username, email, name, trust_level } = oauthUserInfo;

		if (!oauthId || !username) {
			throw new BizError(t('oauthUserInfoIncomplete'));
		}

		// 构造邮箱地址，如果OAuth没有提供邮箱，使用linuxdo_用户ID@域名格式
		const userEmail = email || `linuxdo_${oauthId}@${c.env.domain[0]}`;

		// 检查是否已存在OAuth用户
		let userRow = await userService.selectByOAuthId(c, 'linux_do', oauthId);

		if (!userRow) {
			// 检查LinuxDo用户注册权限
			const linuxdoService = (await import('./linuxdo-service.js')).default;
			const canRegister = await linuxdoService.checkRegisterPermission(c, trust_level || 0);

			if (!canRegister) {
				throw new BizError(t('linuxdoRegisterNotAllowed'));
			}

			// 检查是否存在相同邮箱的用户
			userRow = await userService.selectByEmailIncludeDel(c, userEmail);

			if (userRow) {
				// 如果存在相同邮箱的用户，处理不同状态
				if (userRow.isDel === isDel.DELETE) {
					// 对于已删除的用户，重新激活账户
					await userService.reactivateUser(c, userRow.userId);
					// 关联OAuth信息
					await userService.linkOAuth(c, userRow.userId, 'linux_do', oauthId, username, trust_level, userInfo.avatar_template);
					// 重新查询用户信息
					userRow = await userService.selectById(c, userRow.userId);
				} else {
					if (userRow.status === userConst.status.BAN) {
						throw new BizError(t('isBanUser'));
					}

					// 关联OAuth信息到现有用户
					await userService.linkOAuth(c, userRow.userId, 'linux_do', oauthId, username, trust_level, userInfo.avatar_template);
				}
			} else {
				// 创建新用户
				const roleRow = await roleService.selectDefaultRole(c);
				const defaultRoleId = roleRow.roleId;

				// 生成随机密码（OAuth用户不需要密码登录）
				const randomPassword = crypto.getRandomValues(new Uint8Array(32))
					.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
				const { salt, hash } = await saltHashUtils.hashPassword(randomPassword);

				// 创建用户
				const userId = await userService.insertOAuthUser(c, {
					email: userEmail,
					password: hash,
					salt,
					type: defaultRoleId,
					oauthProvider: 'linux_do',
					oauthId: oauthId,
					oauthUsername: username,
					avatarTemplate: oauthUserInfo.avatar_template,
					trustLevel: trust_level
				});

				// 创建账户
				await accountService.insert(c, {
					userId: userId,
					email: userEmail,
					name: name || username
				});

				await userService.updateUserInfo(c, userId, true);

				userRow = await userService.selectById(c, userId);
			}
		} else {
			// 检查用户状态
			if (userRow.isDel === isDel.DELETE) {
				throw new BizError(t('isDelUser'));
			}

			if (userRow.status === userConst.status.BAN) {
				throw new BizError(t('isBanUser'));
			}

			// 检查并更新邮箱格式（为现有OAuth用户迁移到新格式）
			if (userRow.email !== userEmail) {
				await userService.updateUserEmail(c, userRow.userId, userEmail);
				// 同时更新账户表中的邮箱
				await accountService.updateEmailByUserId(c, userRow.userId, userRow.email, userEmail);
				// 重新查询用户信息
				userRow = await userService.selectById(c, userRow.userId);
			}
		}

		// 生成JWT token
		const uuid = uuidv4();
		const jwt = await JwtUtils.generateToken(c, { userId: userRow.userId, token: uuid });

		let authInfo = await c.env.kv.get(KvConst.AUTH_INFO + userRow.userId, { type: 'json' });

		if (authInfo) {
			if (authInfo.tokens.length > 10) {
				authInfo.tokens.shift();
			}
			authInfo.tokens.push(uuid);
		} else {
			authInfo = {
				tokens: [],
				user: userRow,
				refreshTime: dayjs().toISOString()
			};
			authInfo.tokens.push(uuid);
		}

		await userService.updateUserInfo(c, userRow.userId);
		await c.env.kv.put(KvConst.AUTH_INFO + userRow.userId, JSON.stringify(authInfo), { expirationTtl: constant.TOKEN_EXPIRE });

		return jwt;
	}

};

export default loginService;
