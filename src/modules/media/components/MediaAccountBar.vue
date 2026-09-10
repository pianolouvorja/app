<script setup lang="ts">
/**
 * Conta de coletâneas custom — login/registro simples (e-mail + senha).
 * Compacto: quando logado mostra só nome + botão sair; senão formulário colapsável.
 */
import { computed, ref } from 'vue'
import {
  getAuthSession,
  login,
  logout,
  register,
  type AuthSession,
} from '../services/auth-client'

const props = defineProps<{
  /** Notificação do host (snackbar do editor). */
  notify?: (message: string, isError?: boolean) => void
}>()

const session = ref<AuthSession | null>(getAuthSession())
const formOpen = ref(false)
const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const displayName = ref('')
const busy = ref(false)

const isValid = computed(() => {
  if (email.value.includes('@') === false) return false
  if (password.value.length < 6) return false
  if (mode.value === 'register' && displayName.value.trim().length < 2) return false
  return true
})

async function onSubmit(): Promise<void> {
  if (!isValid.value || busy.value) return
  busy.value = true
  try {
    const result =
      mode.value === 'login'
        ? await login(email.value.trim(), password.value)
        : await register(email.value.trim(), password.value, displayName.value.trim())
    if (result) {
      session.value = result
      formOpen.value = false
      password.value = ''
      props.notify?.(`Bem-vindo, ${result.user.displayName}!`)
    } else {
      props.notify?.(
        mode.value === 'login'
          ? 'E-mail ou senha incorretos'
          : 'Não foi possível criar a conta (e-mail já existe?)',
        true,
      )
    }
  } finally {
    busy.value = false
  }
}

async function onLogout(): Promise<void> {
  await logout()
  session.value = null
  formOpen.value = false
  props.notify?.('Sessão encerrada')
}

function toggleForm(): void {
  formOpen.value = !formOpen.value
  if (!formOpen.value) password.value = ''
}
</script>

<template>
  <div class="account">
    <!-- Logado: nome + sair -->
    <div
      v-if="session"
      class="account__logged"
    >
      <i
        class="ti ti-user-check"
        aria-hidden="true"
      />
      <span
        class="account__name"
        :title="session.user.email"
      >{{ session.user.displayName }}</span>
      <button
        type="button"
        class="account__btn account__btn--ghost"
        title="Sair"
        @click="onLogout"
      >
        <i
          class="ti ti-logout"
          aria-hidden="true"
        />
      </button>
    </div>

    <!-- Deslogado: toggle + form compacto -->
    <template v-else>
      <div class="account__row">
        <span class="account__hint">Entre para criar e editar suas coletâneas</span>
        <button
          type="button"
          class="account__btn"
          @click="toggleForm"
        >
          <i
            class="ti"
            :class="formOpen ? 'ti-chevron-up' : 'ti-user'"
            aria-hidden="true"
          />
          {{ formOpen ? 'Fechar' : 'Entrar' }}
        </button>
      </div>
      <form
        v-if="formOpen"
        class="account__form"
        @submit.prevent="onSubmit"
      >
        <div class="account__tabs">
          <button
            type="button"
            class="account__tab"
            :class="{ 'account__tab--active': mode === 'login' }"
            @click="mode = 'login'"
          >
            Entrar
          </button>
          <button
            type="button"
            class="account__tab"
            :class="{ 'account__tab--active': mode === 'register' }"
            @click="mode = 'register'"
          >
            Criar conta
          </button>
        </div>
        <input
          v-model="email"
          type="email"
          class="account__input"
          placeholder="E-mail"
          autocomplete="email"
        >
        <input
          v-model="password"
          type="password"
          class="account__input"
          placeholder="Senha (mín. 6)"
          autocomplete="current-password"
        >
        <input
          v-if="mode === 'register'"
          v-model="displayName"
          type="text"
          class="account__input"
          placeholder="Seu nome (exibido como autor)"
        >
        <button
          type="submit"
          class="account__btn account__btn--submit"
          :disabled="!isValid || busy"
        >
          {{ busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta' }}
        </button>
      </form>
    </template>
  </div>
</template>

<style scoped>
.account {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--v-theme-surface-variant, rgba(255, 255, 255, 0.08));
  border-radius: 10px;
  margin-bottom: 10px;
}

.account__logged,
.account__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.account__name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account__hint {
  flex: 1;
  font-size: 11.5px;
  opacity: 0.72;
}

.account__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--v-theme-surface-variant, rgba(255, 255, 255, 0.12));
  background: transparent;
  color: inherit;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12.5px;
  cursor: pointer;
}

.account__btn--ghost {
  border: none;
  padding: 4px 6px;
  opacity: 0.75;
}

.account__btn--submit {
  justify-content: center;
  padding: 7px;
}

.account__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.account__btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.07);
}

.account__form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.account__tabs {
  display: flex;
  gap: 4px;
}

.account__tab {
  flex: 1;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  font-size: 12px;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
}

.account__tab--active {
  opacity: 1;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.08);
}

.account__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--v-theme-surface-variant, rgba(255, 255, 255, 0.12));
  background: transparent;
  color: inherit;
  border-radius: 8px;
  padding: 6px 9px;
  font-size: 13px;
}

.account__input::placeholder {
  opacity: 0.5;
}
</style>
