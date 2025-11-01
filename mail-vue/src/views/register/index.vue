<template>
  <div id="register-box">
    <div id="background-wrap" v-if="!settingStore.settings.background">
      <div class="x1 cloud"></div>
      <div class="x2 cloud"></div>
      <div class="x3 cloud"></div>
      <div class="x4 cloud"></div>
      <div class="x5 cloud"></div>
    </div>
    <div v-else :style="background"></div>
    <div class="form-wrapper">
      <div class="container">
        <span class="form-title">{{ settingStore.settings.title }}</span>
        <div>
          <el-input class="email-input" v-model="registerForm.email" type="text" :placeholder="$t('emailAccount')"
                    autocomplete="off">
            <template #append>
              <div @click.stop="openSelect">
                <el-select
                    ref="mySelect"
                    v-model="suffix"
                    :placeholder="$t('select')"
                    class="select"
                >
                  <el-option
                      v-for="item in domainList"
                      :key="item"
                      :label="item"
                      :value="item"
                  />
                </el-select>
                <div style="color: #333">
                  <span>{{ suffix }}</span>
                  <Icon class="setting-icon" icon="mingcute:down-small-fill" width="20" height="20"/>
                </div>
              </div>
            </template>
          </el-input>
          <el-input v-model="registerForm.password" :placeholder="$t('password')" type="password" autocomplete="off"/>
          <el-input v-model="registerForm.confirmPassword" :placeholder="$t('confirmPwd')" type="password"
                    autocomplete="off"/>
          <el-input v-if="settingStore.settings.regKey === 0" v-model="registerForm.code" :placeholder="$t('regKey')"
                    type="text" autocomplete="off"/>
          <el-input v-if="settingStore.settings.regKey === 2" v-model="registerForm.code"
                    :placeholder="$t('regKeyOptional')" type="text" autocomplete="off"/>
          <div v-show="verifyShow"
               class="register-turnstile"
               :data-sitekey="settingStore.settings.siteKey"
               data-callback="onTurnstileSuccess"
               data-error-callback="onTurnstileError"
               data-after-interactive-callback="loadAfter"
               data-before-interactive-callback="loadBefore"
          >
            <span style="font-size: 12px;color: #F56C6C" v-if="botJsError">{{ $t('verifyModuleFailed') }}</span>
          </div>
          <el-button class="btn" type="primary" @click="submitRegister" :loading="registerLoading"
          >{{ $t('regBtn') }}
          </el-button>
        </div>
        <div class="switch" @click="goToLogin">{{ $t('hasAccount') }} <span>{{ $t('loginSwitch') }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import router from "@/router";
import {computed, nextTick, reactive, ref, onMounted} from "vue";
import {register} from "@/request/login.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from "@/store/ui.js";
import {Icon} from "@iconify/vue";
import {cvtR2Url} from "@/utils/convert.js";
import {useI18n} from "vue-i18n";
import {websiteConfig} from "@/request/setting.js";

const {t} = useI18n();
const uiStore = useUiStore();
const settingStore = useSettingStore();
const registerLoading = ref(false);
const mySelect = ref();
const suffix = ref('');
const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  code: null
});
const domainList = ref([]);
const verifyShow = ref(false);
let verifyToken = '';
let turnstileId = null;
let botJsError = ref(false);
let verifyErrorCount = 0;

// 初始化设置
onMounted(async () => {
  try {
    const settings = await websiteConfig();
    settingStore.settings = settings;
    settingStore.domainList = settings.domainList;
    domainList.value = settings.domainList;
    suffix.value = settings.domainList[0];
    
    // 检查注册功能是否开启
    if (settings.register !== 0) {
      ElMessage({
        message: t('regDisabled'),
        type: 'error',
        plain: true,
      });
      router.push('/login');
      return;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    // 静默处理错误，避免重复提示
  }
});

window.onTurnstileSuccess = (token) => {
  verifyToken = token;
};

window.onTurnstileError = (e) => {
  if (verifyErrorCount >= 4) {
    return;
  }
  verifyErrorCount++;
  console.warn('人机验证加载失败', e);
  setTimeout(() => {
    nextTick(() => {
      if (!turnstileId) {
        turnstileId = window.turnstile.render('.register-turnstile');
      } else {
        window.turnstile.reset(turnstileId);
      }
    });
  }, 1500);
};

window.loadBefore = () => {
  nextTick(() => {
    if (verifyShow.value) {
      if (!turnstileId) {
        turnstileId = window.turnstile.render('.register-turnstile');
      } else {
        window.turnstile.reset(turnstileId);
      }
    }
  });
};

const loginOpacity = computed(() => {
  return `rgba(255, 255, 255, ${settingStore.settings.loginOpacity})`;
});

const background = computed(() => {
  return settingStore.settings.background ? {
    'background-image': `url(${cvtR2Url(settingStore.settings.background)})`,
    'background-repeat': 'no-repeat',
    'background-size': 'cover',
    'background-position': 'center'
  } : '';
});

const openSelect = () => {
  mySelect.value.toggleMenu();
};

function goToLogin() {
  router.push('/login');
}

function submitRegister() {
  if (!registerForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    });
    return;
  }

  if (!isEmail(registerForm.email + suffix.value)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    });
    return;
  }

  if (!registerForm.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    });
    return;
  }

  if (registerForm.password.length < 6) {
    ElMessage({
      message: t('pwdLengthMsg'),
      type: 'error',
      plain: true,
    });
    return;
  }

  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage({
      message: t('confirmPwdFailMsg'),
      type: 'error',
      plain: true,
    });
    return;
  }

  if (settingStore.settings.regKey === 0) {
    if (!registerForm.code) {
      ElMessage({
        message: t('emptyRegKeyMsg'),
        type: 'error',
        plain: true,
      });
      return;
    }
  }

  if (!verifyToken && (settingStore.settings.registerVerify === 0 || (settingStore.settings.registerVerify === 2 && settingStore.settings.regVerifyOpen))) {
    if (!verifyShow.value) {
      verifyShow.value = true;
      nextTick(() => {
        if (!turnstileId) {
          try {
            turnstileId = window.turnstile.render('.register-turnstile');
          } catch (e) {
            botJsError.value = true;
            console.log('人机验证js加载失败');
          }
        } else {
          window.turnstile.reset('.register-turnstile');
        }
      });
    } else if (!botJsError.value) {
      ElMessage({
        message: t('botVerifyMsg'),
        type: "error",
        plain: true
      });
    }
    return;
  }

  registerLoading.value = true;

  const form = {
    email: registerForm.email + suffix.value,
    password: registerForm.password,
    token: verifyToken,
    code: registerForm.code
  };

  register(form).then(({regVerifyOpen}) => {
    registerForm.email = '';
    registerForm.password = '';
    registerForm.confirmPassword = '';
    registerForm.code = '';
    registerLoading.value = false;
    verifyToken = '';
    settingStore.settings.regVerifyOpen = regVerifyOpen;
    verifyShow.value = false;
    ElMessage({
      message: t('regSuccessMsg'),
      type: 'success',
      plain: true,
    });
    // 跳转到登录页面
    setTimeout(() => {
      router.push('/login');
    }, 1500);
  }).catch(res => {
    registerLoading.value = false;

    if (res.code === 400) {
      verifyToken = '';
      settingStore.settings.regVerifyOpen = true;
      if (turnstileId) {
        window.turnstile.reset(turnstileId);
      } else {
        nextTick(() => {
          turnstileId = window.turnstile.render('.register-turnstile');
        });
      }
      verifyShow.value = true;
    }
  });
}
</script>

<style>
.el-select-dropdown__item {
  padding: 0 15px;
}

.no-autofill-pwd {
  .el-input__inner {
    -webkit-text-security: disc !important;
  }
}
</style>

<style lang="scss" scoped>
.form-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
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
  @media (max-width: 1024px) {
    padding: 20px 25px;
    width: 350px;
    min-height: 300px;
  }
  @media (max-width: 767px) {
    padding: 20px;
    width: 90%;
    max-width: 350px;
    min-height: 280px;
    border-radius: 8px;
  }

  .btn {
    width: 100%;
    height: 36px;
    border-radius: 6px;
    margin-bottom: 18px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .form-desc {
    margin-top: 5px;
    margin-bottom: 18px;
    color: #71717a;
  }

  .form-title {
    font-weight: bold;
    font-size: 22px !important;
    text-align: center;
    margin-bottom: 24px;
  }

  .switch {
    margin-top: 20px;
    text-align: center;
    font-size: 14px;
    color: #909399;
    cursor: pointer;

    span {
      color: #006be6;
      cursor: pointer;
    }
  }

  :deep(.el-input__wrapper) {
    border-radius: 6px;
  }

  .email-input :deep(.el-input__wrapper) {
    border-radius: 6px 0 0 6px;
  }

  .el-input {
    height: 38px;
    width: 100%;
    margin-bottom: 18px;

    :deep(.el-input__inner) {
      height: 36px;
    }
  }
}

:deep(.el-select-dropdown__item) {
  padding: 0 10px;
}

.setting-icon {
  position: relative;
  top: 6px;
}

:deep(.el-input-group__append) {
  padding: 0 !important;
  padding-left: 8px !important;
  padding-right: 4px !important;
  background: #FFFFFF;
  border-radius: 0 8px 8px 0;
}

.register-turnstile {
  margin-bottom: 18px;
}

.select {
  position: absolute;
  right: 30px;
  width: 100px;
  opacity: 0;
  pointer-events: none;
}

.custom-style {
  margin-bottom: 10px;
}

.custom-style .el-segmented {
  --el-border-radius-base: 6px;
  width: 180px;
}

#register-box {
  background: linear-gradient(to bottom, #2980b9, #6dd5fa, #fff);
  color: #333;
  font: 100% Arial, sans-serif;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  display: grid;
  grid-template-columns: 1fr;
}

#background-wrap {
  height: 100%;
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
</style>
