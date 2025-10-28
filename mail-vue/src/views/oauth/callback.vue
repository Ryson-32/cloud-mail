<template>
  <div id="oauth-callback-box">
    <div id="background-wrap" v-if="!settingStore.settings.background">
      <div class="x1 cloud"></div>
      <div class="x2 cloud"></div>
      <div class="x3 cloud"></div>
      <div class="x4 cloud"></div>
      <div class="x5 cloud"></div>
    </div>
    <div v-if="settingStore.settings.background" :style="background"></div>
    <div class="callback-wrapper">
      <div class="loading-container">
        <div class="loading-content">
          <el-icon class="is-loading" size="24">
            <Refresh />
          </el-icon>
          <span class="loading-text">Processing Linux.do login...</span>
        </div>
        <p class="loading-desc" v-if="errorMessage">{{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user.js'
import { useAccountStore } from '@/store/account.js'
import { useUiStore } from '@/store/ui.js'
import { useSettingStore } from '@/store/setting.js'
import { loginUserInfo } from '@/request/my.js'
import { permsToRouter } from '@/perm/perm.js'
import { cvtR2Url } from '@/utils/convert.js'
import { websiteConfig } from '@/request/setting.js'

const router = useRouter()
const userStore = useUserStore()
const accountStore = useAccountStore()
const uiStore = useUiStore()
const settingStore = useSettingStore()
const errorMessage = ref('')

// 背景样式计算属性
const background = computed(() => {
  return settingStore.settings.background ? {
    'background-image': `url(${cvtR2Url(settingStore.settings.background)})`,
    'background-repeat': 'no-repeat',
    'background-size': 'cover',
    'background-position': 'center'
  } : ''
})

onMounted(async () => {
  try {
    // 确保设置已加载（检查设置对象是否为空或只有默认值）
    if (!settingStore.settings.title) {
      const settings = await websiteConfig()
      settingStore.settings = settings
      settingStore.domainList = settings.domainList
      document.title = settings.title
    }

    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const error = urlParams.get('error')



    if (error) {
      throw new Error(`OAuth授权失败: ${error}`)
    }

    if (!code) {
      throw new Error('缺少必要的OAuth参数')
    }

    // 获取存储的回调地址
    const storedRedirectUri = localStorage.getItem('oauth_redirect_uri')

    if (!storedRedirectUri) {
      // 如果没有存储的回调地址，使用当前域名构建
      const fallbackRedirectUri = `${window.location.origin}/oauth/callback`

      // 调用后端API完成OAuth登录
      const response = await fetch('/api/oauth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          redirectUri: fallbackRedirectUri
        })
      })

      const result = await response.json()

      if (result.code !== 200) {
        throw new Error(result.message || 'OAuth登录失败')
      }

      // 保存token
      localStorage.setItem('token', result.data.token)

      // 获取用户信息
      const user = await loginUserInfo()
      accountStore.currentAccountId = user.accountId
      userStore.user = user

      // 添加动态路由
      const routers = permsToRouter(user.permKeys)
      routers.forEach(routerData => {
        router.addRoute('layout', routerData)
      })

      // 显示成功消息
      ElMessage({
        message: '登录成功！',
        type: 'success',
        plain: true,
      })

      // 跳转到主页
      await router.replace({ name: 'layout' })
      uiStore.showNotice()

      return
    }

    // 清理localStorage
    localStorage.removeItem('oauth_redirect_uri')
    
    // 调用后端API完成OAuth登录
    const response = await fetch('/api/oauth/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        redirectUri: storedRedirectUri
      })
    })
    
    const result = await response.json()
    
    if (result.code !== 200) {
      throw new Error(result.message || 'OAuth登录失败')
    }
    
    // 保存token
    localStorage.setItem('token', result.data.token)
    
    // 获取用户信息
    const user = await loginUserInfo()
    accountStore.currentAccountId = user.accountId
    userStore.user = user
    
    // 添加动态路由
    const routers = permsToRouter(user.permKeys)
    routers.forEach(routerData => {
      router.addRoute('layout', routerData)
    })
    
    // 显示成功消息
    ElMessage({
      message: '登录成功！',
      type: 'success',
      plain: true,
    })
    
    // 跳转到主页
    await router.replace({ name: 'layout' })
    uiStore.showNotice()
    
  } catch (error) {
    console.error('OAuth callback error:', error)
    errorMessage.value = error.message
    
    ElMessage({
      message: error.message || 'OAuth登录失败',
      type: 'error',
      plain: true,
    })
    
    // 3秒后跳转回登录页
    setTimeout(() => {
      router.replace({ name: 'login' })
    }, 3000)
  }
})
</script>

<style scoped>
#oauth-callback-box {
  background: linear-gradient(to bottom, #2980b9, #6dd5fa, #fff);
  color: #333;
  font: 100% Arial, sans-serif;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.callback-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 10;
}

.loading-container {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  padding: 25px 35px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 400px;
  height: auto;
  min-height: 320px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  text-align: center;
  position: relative;
  z-index: 10;
}

@media (max-width: 1024px) {
  .loading-container {
    padding: 20px 25px;
    width: 350px;
    min-height: 300px;
  }
}

@media (max-width: 767px) {
  .loading-container {
    padding: 20px;
    width: 90%;
    max-width: 350px;
    min-height: 280px;
    border-radius: 8px;
  }
}

.loading-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 10px;
}

.loading-text {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.loading-desc {
  margin: 10px 0 0 0;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.is-loading {
  animation: rotating 2s linear infinite;
  color: #409EFF;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

#background-wrap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  width: 100%;
  z-index: 0;
}

@keyframes animateCloud {
  0% {
    margin-left: -500px;
  }

  100% {
    margin-left: 100%;
  }
}

.x1 {
  animation: animateCloud 30s linear infinite;
  transform: scale(0.65);
}

.x2 {
  animation: animateCloud 15s linear infinite;
  transform: scale(0.3);
}

.x3 {
  animation: animateCloud 25s linear infinite;
  transform: scale(0.5);
}

.x4 {
  animation: animateCloud 13s linear infinite;
  transform: scale(0.4);
}

.x5 {
  animation: animateCloud 20s linear infinite;
  transform: scale(0.55);
}

.cloud {
  background: linear-gradient(to bottom, #fff 5%, #f1f1f1 100%);
  border-radius: 100px;
  box-shadow: 0 8px 5px rgba(0, 0, 0, 0.1);
  height: 120px;
  width: 350px;
  position: relative;
}

.cloud:after,
.cloud:before {
  content: "";
  position: absolute;
  background: #fff;
  z-index: -1;
}

.cloud:after {
  border-radius: 100px;
  height: 100px;
  left: 50px;
  top: -50px;
  width: 100px;
}

.cloud:before {
  border-radius: 200px;
  height: 180px;
  width: 180px;
  right: 50px;
  top: -90px;
}

/* 自定义背景图样式 */
#oauth-callback-box > div[style*="background-image"] {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}
</style>