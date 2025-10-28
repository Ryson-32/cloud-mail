import http from '@/axios/index.js';

/**
 * 获取LinuxDo用户等级统计
 */
export function linuxdoStats() {
    return http.get('/linuxdo/stats')
}

/**
 * 获取LinuxDo设置
 */
export function linuxdoSettings() {
    return http.get('/linuxdo/settings')
}

/**
 * 更新LinuxDo设置
 */
export function linuxdoUpdateSettings(settings) {
    return http.put('/linuxdo/settings', settings)
}

/**
 * 检查用户注册权限
 */
export function linuxdoCheckRegisterPermission(trustLevel) {
    return http.post('/linuxdo/check-register-permission', { trustLevel })
}
