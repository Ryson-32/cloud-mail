import app from '../hono/hono';
import oauthService from '../service/oauth-service';
import loginService from '../service/login-service';
import result from '../model/result';
import { t } from '../i18n/i18n';
import BizError from '../error/biz-error';

/**
 * 获取OAuth授权URL
 */
app.post('/oauth/authorize-url', async (c) => {
    try {
        const { redirectUri } = await c.req.json();
        
        if (!redirectUri) {
            throw new BizError(t('redirectUriRequired'), 400);
        }

        // 按照 Linux.do 官方文档，不使用 state 参数
        const authUrl = oauthService.getAuthorizationUrl(c, redirectUri, null);

        return c.json(result.ok({
            authUrl: authUrl
        }));
    } catch (error) {
        console.error('OAuth authorize URL error:', error);
        if (error instanceof BizError) {
            throw error;
        }
        throw new BizError(t('oauthAuthorizeFailed'), 500);
    }
});

/**
 * 处理OAuth回调，完成登录流程
 */
app.post('/oauth/callback', async (c) => {
    try {
        const { code, redirectUri } = await c.req.json();

        if (!code || !redirectUri) {
            throw new BizError(t('oauthCallbackParamsMissing'), 400);
        }

        // 获取访问令牌
        const tokenData = await oauthService.getAccessToken(c, code, redirectUri);

        // 获取用户信息
        const userInfo = await oauthService.getUserInfo(tokenData.access_token);

        // 通过OAuth用户信息登录或创建用户
        const jwt = await loginService.oauthLogin(c, userInfo);

        return c.json(result.ok({
            token: jwt,
            user: userInfo
        }));
    } catch (error) {
        console.error('OAuth callback error:', error);
        if (error instanceof BizError) {
            throw error;
        }
        throw new BizError(t('oauthCallbackFailed'), 500);
    }
});

/**
 * 获取OAuth配置信息（用于前端）
 */
app.get('/oauth/config', async (c) => {
    try {
        const clientId = c.env.LINUX_DO_CLIENT_ID;

        if (!clientId) {
            throw new BizError('OAuth not configured', 500);
        }

        return c.json(result.ok({
            clientId: clientId,
            authUrl: 'https://connect.linux.do/oauth2/authorize',
            enabled: true
        }));
    } catch (error) {
        console.error('OAuth config error:', error);
        return c.json(result.ok({
            enabled: false
        }));
    }
});

/**
 * 刷新设置缓存（临时API）
 */
app.post('/oauth/refresh-settings', async (c) => {
    try {
        const settingService = (await import('../service/setting-service.js')).default;
        await settingService.refresh(c);
        return c.json(result.ok({ message: 'Settings refreshed' }));
    } catch (error) {
        console.error('Refresh settings error:', error);
        throw new BizError('Failed to refresh settings', 500);
    }
});

/**
 * 生成密码哈希（临时API）
 */
app.post('/oauth/hash-password', async (c) => {
    try {
        const cryptoUtils = (await import('../utils/crypto-utils.js')).default;
        const { password } = await c.req.json();

        if (!password) {
            throw new BizError('Password required', 400);
        }

        const { salt, hash } = await cryptoUtils.hashPassword(password);

        return c.json(result.ok({
            password: password,
            salt: salt,
            hash: hash
        }));
    } catch (error) {
        console.error('Hash password error:', error);
        throw new BizError('Failed to hash password', 500);
    }
});
