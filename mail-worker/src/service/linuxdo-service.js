import orm from '../entity/orm';
import user from '../entity/user';
import setting from '../entity/setting';
import { eq, sql, count } from 'drizzle-orm';
import settingService from './setting-service';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

const linuxdoService = {

	/**
	 * 获取用户等级统计
	 * @param {Object} c - Hono context
	 * @returns {Object} 用户等级统计信息
	 */
	async getUserLevelStats(c) {
		const stats = {};
		
		// 统计每个等级的用户数量
		for (let level = 0; level <= 4; level++) {
			const result = await orm(c)
				.select({ count: count() })
				.from(user)
				.where(
					sql`${user.trustLevel} = ${level} AND ${user.oauthProvider} = 'linux_do' AND ${user.isDel} = 0`
				)
				.get();
			
			stats[`level${level}`] = result?.count || 0;
		}

		// 获取总的LinuxDo用户数
		const totalResult = await orm(c)
			.select({ count: count() })
			.from(user)
			.where(
				sql`${user.oauthProvider} = 'linux_do' AND ${user.isDel} = 0`
			)
			.get();
		
		stats.total = totalResult?.count || 0;

		return stats;
	},

	/**
	 * 获取LinuxDo设置
	 * @param {Object} c - Hono context
	 * @returns {Object} LinuxDo设置
	 */
	async getSettings(c) {
		const settingRow = await settingService.query(c);
		
		return {
			trustLevel0Enabled: settingRow.linuxdoTrustLevel0Enabled === 1,
			trustLevel1Enabled: settingRow.linuxdoTrustLevel1Enabled === 1,
			trustLevel2Enabled: settingRow.linuxdoTrustLevel2Enabled === 1,
			trustLevel3Enabled: settingRow.linuxdoTrustLevel3Enabled === 1,
			trustLevel4Enabled: settingRow.linuxdoTrustLevel4Enabled === 1,
			maxUsers: settingRow.linuxdoMaxUsers || 0
		};
	},

	/**
	 * 更新LinuxDo设置
	 * @param {Object} c - Hono context
	 * @param {Object} params - 设置参数
	 */
	async updateSettings(c, params) {
		const {
			trustLevel0Enabled,
			trustLevel1Enabled,
			trustLevel2Enabled,
			trustLevel3Enabled,
			trustLevel4Enabled,
			maxUsers
		} = params;

		const updateData = {
			linuxdoTrustLevel0Enabled: trustLevel0Enabled ? 1 : 0,
			linuxdoTrustLevel1Enabled: trustLevel1Enabled ? 1 : 0,
			linuxdoTrustLevel2Enabled: trustLevel2Enabled ? 1 : 0,
			linuxdoTrustLevel3Enabled: trustLevel3Enabled ? 1 : 0,
			linuxdoTrustLevel4Enabled: trustLevel4Enabled ? 1 : 0,
			linuxdoMaxUsers: maxUsers || 0
		};

		await orm(c)
			.update(setting)
			.set(updateData)
			.run();

		// 刷新设置缓存
		await settingService.refresh(c);
	},

	/**
	 * 检查用户注册权限
	 * @param {Object} c - Hono context
	 * @param {number} trustLevel - 用户信任等级
	 * @returns {boolean} 是否可以注册
	 */
	async checkRegisterPermission(c, trustLevel) {
		const settings = await this.getSettings(c);
		
		// 检查该等级是否允许注册
		const levelKey = `trustLevel${trustLevel}Enabled`;
		if (!settings[levelKey]) {
			return false;
		}

		// 检查人数限制
		if (settings.maxUsers > 0) {
			const stats = await this.getUserLevelStats(c);
			if (stats.total >= settings.maxUsers) {
				return false;
			}
		}

		return true;
	}

};

export default linuxdoService;
