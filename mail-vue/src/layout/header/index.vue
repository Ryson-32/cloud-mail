<template>
  <div class="header" :class="!hasPerm('email:send') ? 'not-send' : ''">
    <div class="header-btn">
      <hanburger @click="changeAside"></hanburger>
      <span class="breadcrumb-item">{{ $t(route.meta.title) }}</span>
    </div>
    <div v-perm="'email:send'" class="writer-box" @click="openSend">
      <div class="writer" >
        <Icon icon="material-symbols:edit-outline-sharp" width="22" height="22" />
      </div>
    </div>
    <!-- 大学链接部分（可以在设置中配置显示） -->
    <div class="university-link" v-if="universityLink && universityLink.url">
      <a :href="universityLink.url" target="_blank" class="university-link-item">
        <Icon icon="mdi:school" width="20" height="20" />
        <span>{{ universityLink.name || 'University Website' }}</span>
      </a>
    </div>
    <div class="toolbar">
      <el-dropdown>
        <div class="translate icon-item">
          <Icon icon="carbon:ibm-watson-language-translator" />
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="changeLang('zh')">简体中文</el-dropdown-item>
            <el-dropdown-item @click="changeLang('en')">English</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <div class="notice icon-item" @click="openNotice">
        <Icon icon="streamline-plump:announcement-megaphone" />
      </div>
      <el-dropdown :teleported="false" popper-class="detail-dropdown">
        <div class="avatar" role="button" :aria-label="$t('userMenu')" tabindex="0">
          <div class="avatar-image" v-if="getAvatarUrl()">
            <img :src="getAvatarUrl()" :alt="getDisplayId()" />
          </div>
          <div class="avatar-text" v-else>
            <div>{{ getDisplayId() }}</div>
          </div>
          <Icon class="setting-icon" icon="mingcute:down-small-fill" width="24" height="24" aria-hidden="true" />
        </div>
        <template #dropdown>
          <div class="user-details">
            <div class="details-avatar">
              <img v-if="getAvatarUrl()" :src="getAvatarUrl()" :alt="getDisplayId()" />
              <span v-else>{{ getDisplayId() }}</span>
            </div>
            <div class="user-name">
              {{userStore.user.name}}
            </div>
            <div class="detail-email" @click="copyDisplayId()">
              ID: {{ getDisplayId() }}
            </div>
            <div class="detail-user-type">
              <el-tag >{{$t(userStore.user.role.name)}}</el-tag>
            </div>
            <div class="action-info">
              <div>
                <span style="margin-right: 10px">{{$t('sendCount')}}</span>
                <span style="margin-right: 10px">{{$t('accountCount')}}</span>
              </div>
              <div>
                <div>
                  <span v-if="sendCount" style="margin-right: 5px" >{{  sendCount }}</span>
                  <el-tag v-if="!hasPerm('email:send')" >{{sendType}}</el-tag>
                  <el-tag v-else >{{sendType}}</el-tag>
                </div>
                <div>
                  <el-tag v-if="settingStore.settings.manyEmail || settingStore.settings.addEmail" >{{$t('disabled')}}</el-tag>
                  <span v-else-if="accountCount && hasPerm('account:add')" style="margin-right: 5px">{{ $t('totalUserAccount',{msg: accountCount}) }}</span>
                  <el-tag v-else-if="!accountCount && hasPerm('account:add')" >{{$t('unlimited')}}</el-tag>
                  <el-tag v-else-if="!hasPerm('account:add')" >{{$t('unauthorized')}}</el-tag>
                </div>
              </div>
            </div>
            <div class="logout">
              <el-button type="primary" :loading="logoutLoading" @click="clickLogout">{{$t('logOut')}}</el-button>
            </div>
          </div>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import router from "@/router";
import hanburger from '@/components/hamburger/index.vue'
import { logout} from "@/request/login.js";
import {Icon} from "@iconify/vue";
import {useUiStore} from "@/store/ui.js";
import {useUserStore} from "@/store/user.js";
import { useRoute } from "vue-router";
import {computed, ref} from "vue";
import {useSettingStore} from "@/store/setting.js";
import { hasPerm } from "@/perm/perm.js"
import {useI18n} from "vue-i18n";
import {copyText} from "@/utils/clipboard-utils.js";

const { t } = useI18n();
const route = useRoute();
const settingStore = useSettingStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const logoutLoading = ref(false)

const accountCount = computed(() => {
  return userStore.user.role.accountCount
})

// 大学链接配置（从后端设置中获取）
const universityLink = computed(() => {
  // 从系统设置中获取（所有人都能看到）
  const settings = settingStore.settings
  if (settings && settings.universityLink) {
    return settings.universityLink
  }
  
  // 备用：从 localStorage 读取本地配置
  const localConfig = localStorage.getItem('universityLink')
  if (localConfig) {
    try {
      return JSON.parse(localConfig)
    } catch (e) {
      console.error('Failed to parse university link config:', e)
    }
  }
  
  // 默认不显示
  return null
})

const sendType = computed(() => {

  if (settingStore.settings.send === 1) {
    return t('disabled')
  }

  if (!hasPerm('email:send')) {
    return t('unauthorized')
  }

  if (userStore.user.role.sendType === 'ban') {
    return t('sendBanned')
  }

  if (!userStore.user.role.sendCount) {
    return t('unlimited')
  }

  if (userStore.user.role.sendType === 'day') {
    return t('daily')
  }

  if (userStore.user.role.sendType === 'count') {
    return t('total')
  }
})

const sendCount = computed(() => {


  if (!hasPerm('email:send')) {
    return null
  }

  if (userStore.user.role.sendType === 'ban') {
    return null
  }

  if (!userStore.user.role.sendCount) {
    return null
  }

  if (settingStore.settings.send === 1) {
    return null
  }

  return userStore.user.sendCount + '/' + userStore.user.role.sendCount
})

// 获取显示的ID（LinuxDo用户显示LinuxDo ID，其他用户显示用户序号）
function getDisplayId() {
  const user = userStore.user;
  if (user.oauthProvider === 'linux_do' && user.oauthId) {
    return parseInt(user.oauthId);
  }
  // 显示用户序号，如果没有则显示用户ID
  return user.userNumber || user.userId;
}

// 获取头像URL
function getAvatarUrl() {
  const user = userStore.user;
  if (user.oauthProvider === 'linux_do' && user.avatarTemplate) {
    // 将{size}替换为具体尺寸，这里使用48px
    return user.avatarTemplate.replace('{size}', '48');
  }
  return null;
}

async function copyDisplayId() {
  try {
    await copyText(getDisplayId().toString());
    ElMessage({
      message: t('copySuccessMsg'),
      type: 'success',
      plain: true,
    })
  } catch (err) {
    console.error(`${t('copyFailMsg')}:`, err);
    ElMessage({
      message: t('copyFailMsg'),
      type: 'error',
      plain: true,
    })
  }
}

function changeLang(lang) {
  settingStore.lang = lang
}

function openNotice() {
  uiStore.showNotice()
}

function openSend() {
  uiStore.writerRef.open()
}

function changeAside() {
  uiStore.asideShow = !uiStore.asideShow
}

function clickLogout() {
  logoutLoading.value = true
  logout().then(() => {
    localStorage.removeItem("token")
    router.replace('/login')
  }).finally(() => {
    logoutLoading.value = false
  })
}

function formatName(email) {
  return email[0]?.toUpperCase() || ''
}

</script>

<style lang="scss" scoped>

.breadcrumb-item {
  font-weight: bold;
  font-size: 14px;
  white-space: nowrap;
}

:deep(.el-popper.is-pure) {
  border-radius: 6px;
}

.user-details {
  width: 250px;
  font-size: 14px;
  color: #333;
  display: grid;
  grid-template-columns: 1fr;
  justify-items: center;
  .user-name {
    font-weight: bold;
    margin-top: 10px;
    padding-left: 20px;
    padding-right: 20px;
    width: 250px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
  }
  .detail-user-type {
    margin-top: 10px;
  }

  .action-info {
    width: 100%;
    display: grid;
    grid-template-columns: auto auto;
    margin-top: 10px;
    >div:first-child {
      display: grid;
      align-items: center;
      gap: 10px;
    }
    >div:last-child {
      display: grid;
      gap: 10px;
      text-align: center;
      >div {
        display: flex;
        align-items: center;
      }
    }
  }

  .detail-email {
    padding-left: 20px;
    padding-right: 20px;
    width: 250px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
    color: #5c5958;
    cursor: pointer;
  }
  .logout {
    margin-top: 20px;
    width: 100%;
    padding-left: 10px;
    padding-right: 10px;
    padding-bottom: 10px;
    .el-button {
      border-radius: 6px;
      height: 28px;
      width: 100%;
    }
  }
  .details-avatar {
    margin-top: 20px;
    height: 40px;
    width: 40px;
    border: 1px solid #ccc;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 10px;
    }

    span {
      font-size: 14px;
    }
  }
}



.header {
  text-align: right;
  font-size: 12px;
  display: grid;
  height: 100%;
  gap: 10px;
  grid-template-columns: auto auto 1fr auto;
}

.header.not-send {
  grid-template-columns: auto 1fr auto;
}

.writer-box {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 5px;
  .writer {
    width:  34px;
    height: 34px;
    border-radius: 50%;
    color: #ffffff;
    background: linear-gradient(135deg, #1890ff, #3a80dd);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    .writer-text {
      margin-left: 15px;
      font-size: 14px;
      font-weight: bold;
    }
  }
}

.header-btn {
  display: inline-flex;
  align-items: center;
  height: 100%;
}

.university-link {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;

  .university-link-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 8px;
    text-decoration: none;
    color: #1890ff;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s ease;
    background: linear-gradient(135deg, rgba(24, 144, 255, 0.05), rgba(58, 128, 221, 0.05));
    border: 1px solid rgba(24, 144, 255, 0.2);

    &:hover {
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.1), rgba(58, 128, 221, 0.1));
      border-color: rgba(24, 144, 255, 0.4);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
    }

    &:active {
      transform: translateY(0);
    }

    span {
      white-space: nowrap;
      @media (max-width: 768px) {
        display: none;
      }
    }
  }
}



.toolbar {
  display: flex;
  justify-content: end;
  gap: 15px;
  @media (max-width: 767px) {
    gap: 10px;
  }
  .icon-item {
    align-self: center;
    width: 30px;
    height: 30px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .icon-item:hover {
    background: #F0F2F5;
  }

  .notice {
    font-size: 22px;
    margin-right: 4px;
  }

  .translate {
    padding-top: 2px;
    font-size: 21px;
  }

  .avatar {
    display: flex;
    align-items: center;
    cursor: pointer;

    .avatar-image {
      height: 30px;
      width: 30px;
      border-radius: 8px;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .avatar-text {
      height: 30px;
      width: 30px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 8px;
      border: 1px solid #ccc;
      font-size: 12px;
    }

    .setting-icon {
      position: relative;
      top: 0;
      margin-right: 10px;
      bottom: 10px;
    }
  }

}
.el-tooltip__trigger:first-child:focus-visible {
  outline: unset;
}
</style>
