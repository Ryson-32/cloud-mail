import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

const oauthService = {
    /**
     * 获取Linux.do OAuth授权URL
     * @param {Object} c - Hono context
     * @param {string} redirectUri - 回调URL
     * @returns {string} 授权URL
     */
    getAuthorizationUrl(c, redirectUri) {
        const clientId = c.env.LINUX_DO_CLIENT_ID;
        if (!clientId) {
            throw new BizError('OAuth client ID not configured', 500);
        }

        // 完全按照 Linux.do 官方文档格式
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'user'
        });

        return `https://connect.linux.do/oauth2/authorize?${params.toString()}`;
    },

    /**
     * 使用授权码获取访问令牌
     * @param {Object} c - Hono context
     * @param {string} code - 授权码
     * @param {string} redirectUri - 回调URL
     * @returns {Object} 令牌信息
     */
    async getAccessToken(c, code, redirectUri) {
        const clientId = c.env.LINUX_DO_CLIENT_ID;
        const clientSecret = c.env.LINUX_DO_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new BizError('OAuth credentials not configured', 500);
        }

        const tokenUrl = 'https://connect.linux.do/oauth2/token';

        // 使用 form-urlencoded 格式，这是 OAuth 2.0 标准格式
        const requestBody = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        });

        try {
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: requestBody.toString()
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Token exchange failed:', response.status, errorText);
                throw new BizError(t('oauthTokenFailed'), 400);
            }

            const tokenData = await response.json();

            if (!tokenData.access_token) {
                throw new BizError(t('oauthTokenFailed'), 400);
            }

            return tokenData;
        } catch (error) {
            console.error('OAuth token exchange error:', error);
            if (error instanceof BizError) {
                throw error;
            }
            throw new BizError(t('oauthTokenFailed'), 500);
        }
    },

    /**
     * 使用访问令牌获取用户信息
     * @param {string} accessToken - 访问令牌
     * @returns {Object} 用户信息
     */
    async getUserInfo(accessToken) {
        const userInfoUrl = 'https://connect.linux.do/api/user';

        try {
            const response = await fetch(userInfoUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('User info fetch failed:', response.status, errorText);
                throw new BizError(t('oauthUserInfoFailed'), 400);
            }

            const userData = await response.json();

            // Linux.do API 返回的用户数据结构适配
            const userId = userData.id || userData.user_id;
            const username = userData.username || userData.name;

            if (!userId || !username) {
                throw new BizError(t('oauthUserInfoFailed'), 400);
            }

            // 处理头像模板URL
            let avatarTemplate = userData.avatar_template;
            if (avatarTemplate) {
                // 如果avatar_template以/开头，说明是相对路径，需要添加域名
                if (avatarTemplate.startsWith('/')) {
                    avatarTemplate = `https://linux.do${avatarTemplate}`;
                }
                // 如果已经是完整URL，直接使用
            }

            return {
                id: userId,
                username: username,
                email: null, // 强制不使用Linux.do提供的邮箱，让系统生成统一格式
                name: userData.name || userData.display_name || username,
                avatar_url: userData.avatar_url || (avatarTemplate ?
                    avatarTemplate.replace('{size}', '120') : null),
                avatar_template: avatarTemplate, // 处理后的头像模板
                trust_level: userData.trust_level || 0 // 添加trust_level字段
            };
        } catch (error) {
            console.error('OAuth user info fetch error:', error);
            if (error instanceof BizError) {
                throw error;
            }
            throw new BizError(t('oauthUserInfoFailed'), 500);
        }
    },

    /**
     * 生成随机状态字符串
     * @returns {string} 随机状态字符串
     */
    generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * 验证状态参数
     * @param {string} state - 状态参数
     * @param {string} storedState - 存储的状态参数
     * @returns {boolean} 验证结果
     */
    validateState(state, storedState) {
        return state && storedState && state === storedState;
    }
};

export default oauthService;
