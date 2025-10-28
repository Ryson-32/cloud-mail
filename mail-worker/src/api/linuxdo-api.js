import app from '../hono/hono';
import result from '../model/result';
import linuxdoService from '../service/linuxdo-service';

/**
 * 获取LinuxDo用户等级统计
 */
app.get('/linuxdo/stats', async (c) => {
	const stats = await linuxdoService.getUserLevelStats(c);
	return c.json(result.ok(stats));
});

/**
 * 获取LinuxDo设置
 */
app.get('/linuxdo/settings', async (c) => {
	const settings = await linuxdoService.getSettings(c);
	return c.json(result.ok(settings));
});

/**
 * 更新LinuxDo设置
 */
app.put('/linuxdo/settings', async (c) => {
	await linuxdoService.updateSettings(c, await c.req.json());
	return c.json(result.ok());
});

/**
 * 检查用户注册权限
 */
app.post('/linuxdo/check-register-permission', async (c) => {
	const { trustLevel } = await c.req.json();
	const canRegister = await linuxdoService.checkRegisterPermission(c, trustLevel);
	return c.json(result.ok({ canRegister }));
});
