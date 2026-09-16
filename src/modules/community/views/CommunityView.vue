<script setup lang="ts">
import { GlassCard } from "@design-system/index";
import { getAuthSession } from "@modules/media/services/auth-client";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import {
	type CommunityCollectionSummary,
	listCommunityCollections,
	saveCommunityCopy,
} from "../services/community-catalog";
import { registerUse, reportCollection } from "../services/ranking";
import { getWeeklyTasks, type WeeklyTask } from "../services/weekly-tasks";

const { t } = useI18n();
const router = useRouter();

const collections = ref<CommunityCollectionSummary[]>([]);
const isLoading = ref(true);
const copyingId = ref<number | null>(null);
const savedId = ref<number | null>(null);
const savedError = ref<number | null>(null);
const weeklyTasks = ref<WeeklyTask[]>([]);

async function load() {
	isLoading.value = true;
	const [cols, tasks] = await Promise.all([
		listCommunityCollections(),
		getWeeklyTasks(),
	]);
	collections.value = cols;
	if (tasks) weeklyTasks.value = tasks;
	// listCommunityCollections/getWeeklyTasks nunca lançam; falha = vazio/null.
	isLoading.value = false;
}

async function report(collection: CommunityCollectionSummary) {
	const reason = window.prompt(t("ranking.reportPrompt"));
	if (!reason || reason.trim().length < 3) return;
	const ok = await reportCollection(
		collection.id,
		reason.trim(),
		getAuthSession()?.token ?? null,
	);
	if (ok) {
		await load(); // some da lista (servidor esconde)
	}
}

async function saveCopy(collection: CommunityCollectionSummary) {
	// F0.4: cópia LOCAL editável, SEM tocar na do autor.
	// F1: registra o uso (1x/user na API; credita +5 ao dono).
	copyingId.value = collection.id;
	await registerUse(collection.id, getAuthSession()?.token ?? null);
	const localId = await saveCommunityCopy(collection);
	copyingId.value = null;
	if (localId !== null) {
		// O editor de Minhas Coletâneas está oculto por feature flag
		// (SHOW_CUSTOM_COLLECTIONS=false): dar feedback aqui, sem navegar.
		savedId.value = collection.id;
		await load();
	} else {
		savedError.value = collection.id;
	}
}

onMounted(load);
</script>

<template>
  <section class="community-view">
    <header class="community-view__header">
      <button
        type="button"
        class="community-view__back"
        :aria-label="t('community.back')"
        @click="router.back()"
      >
        <i class="ti ti-arrow-left" aria-hidden="true" />
      </button>
      <div class="community-view__headings">
        <h1 class="community-view__title">
          {{ t('community.title') }}
        </h1>
        <p class="community-view__subtitle">
          {{ t('community.subtitle') }}
        </p>
        <button
          type="button"
          class="community-view__ranking-link"
          @click="router.push('/community/ranking')"
        >
          <i class="ti ti-trophy" aria-hidden="true" />
          {{ t('community.ranking') }}
        </button>
      </div>
    </header>

    <p
      v-if="isLoading"
      class="community-view__status"
    >
      {{ t('community.loading') }}
    </p>

    <GlassCard
      v-if="!isLoading && weeklyTasks.length > 0"
      class="community-view__tasks"
      elevated
    >
      <h2 class="community-view__tasks-title">
        <i class="ti ti-target" aria-hidden="true" />
        {{ t('ranking.weeklyTasks') }}
      </h2>
      <ul class="community-view__tasks-list">
        <li
          v-for="task in weeklyTasks"
          :key="task.id"
          class="community-view__task"
          :class="{ 'community-view__task--done': task.done }"
        >
          <i
            class="ti"
            :class="task.done ? 'ti-circle-check' : 'ti-circle'"
            aria-hidden="true"
          />
          <span class="community-view__task-desc">{{ task.description }}</span>
          <span class="community-view__task-bonus">
            {{ t('ranking.points', { points: task.bonus }) }}
          </span>
        </li>
      </ul>
    </GlassCard>

    <div
      v-else-if="!isLoading && collections.length > 0"
      class="community-view__grid"
    >
      <GlassCard
        v-for="collection in collections"
        :key="collection.id"
        class="community-view__card"
        elevated
      >
        <div
          class="community-view__cover"
          :style="
            collection.coverUrl
              ? { backgroundImage: `url(${collection.coverUrl})` }
              : undefined
          "
        >
          <i
            v-if="!collection.coverUrl"
            class="ti ti-music community-view__cover-fallback"
            aria-hidden="true"
          />
        </div>
        <div class="community-view__card-body">
          <h2 class="community-view__card-title">
            {{ collection.name }}
          </h2>
          <p
            v-if="collection.authorName"
            class="community-view__card-author"
          >
            {{ t('community.byAuthor', { author: collection.authorName }) }}
          </p>
          <p class="community-view__card-count">
            <i class="ti ti-disc" aria-hidden="true" />
            {{ t('community.trackCount', { count: collection.musicsCount }) }}
          </p>
          <div class="community-view__actions">
            <button
              type="button"
              class="community-view__copy-btn"
              :disabled="copyingId === collection.id"
              @click="saveCopy(collection)"
            >
              <i
                class="ti"
                :class="
                  copyingId === collection.id
                    ? 'ti-loader-2 ti-spin'
                    : savedId === collection.id
                      ? 'ti-check'
                      : 'ti-copy'
                "
                aria-hidden="true"
              />
              {{
                savedId === collection.id
                  ? t('community.copySaved')
                  : t('community.saveCopy')
              }}
            </button>
            <button
              type="button"
              class="community-view__report-btn"
              :aria-label="t('ranking.report')"
              :title="t('ranking.report')"
              @click="report(collection)"
            >
              <i class="ti ti-flag" aria-hidden="true" />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>

    <p
      v-else
      class="community-view__status"
    >
      {{ t('community.empty') }}
    </p>
  </section>
</template>

<style scoped>
.community-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.community-view__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.community-view__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 1px solid var(--ds-border, rgba(255, 255, 255, 0.2));
  background: var(--ds-glass-fill, rgba(255, 255, 255, 0.08));
  color: inherit;
  cursor: pointer;
}

.community-view__title {
  margin: 0;
  font-size: 1.5rem;
}

.community-view__subtitle {
  margin: 0;
  opacity: 0.7;
}

.community-view__ranking-link {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	margin-top: 0.5rem;
	padding: 0.4rem 0.8rem;
	border-radius: 0.5rem;
	border: 1px solid var(--ds-border, rgba(255, 255, 255, 0.2));
	background: var(--ds-glass-fill, rgba(255, 255, 255, 0.08));
	color: inherit;
	font-size: 0.9rem;
	cursor: pointer;
}

.community-view__tasks {
	padding: 0.75rem 1rem;
}

.community-view__tasks-title {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	margin: 0 0 0.5rem;
	font-size: 1rem;
}

.community-view__tasks-list {
	display: flex;
	flex-direction: column;
	gap: 0.35rem;
	margin: 0;
	padding: 0;
	list-style: none;
}

.community-view__task {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.9rem;
}

.community-view__task--done {
	opacity: 0.55;
	text-decoration: line-through;
}

.community-view__task-desc {
	flex: 1;
}

.community-view__task-bonus {
	font-weight: 600;
	opacity: 0.8;
}

.community-view__status {
  opacity: 0.7;
}

.community-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.community-view__card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.community-view__cover {
  position: relative;
  aspect-ratio: 1 / 1;
  background-size: cover;
  background-position: center;
  background-color: rgba(128, 128, 128, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.community-view__cover-fallback {
  font-size: 2.5rem;
  opacity: 0.5;
}

.community-view__card-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
}

.community-view__card-title {
  margin: 0;
  font-size: 1rem;
}

.community-view__card-author {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.7;
}

.community-view__card-count {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.7;
}

.community-view__copy-btn {
  margin-top: 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--ds-border, rgba(255, 255, 255, 0.2));
  background: var(--ds-glass-fill, rgba(255, 255, 255, 0.08));
  color: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.community-view__actions {
	display: flex;
	gap: 0.4rem;
	margin-top: 0.5rem;
}

.community-view__actions .community-view__copy-btn {
	flex: 1;
}

.community-view__report-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 2.2rem;
	border-radius: 0.5rem;
	border: 1px solid var(--ds-border, rgba(255, 255, 255, 0.2));
	background: var(--ds-glass-fill, rgba(255, 255, 255, 0.08));
	color: inherit;
	cursor: pointer;
}

.community-view__copy-btn:hover {
  filter: brightness(1.15);
}
.ti-spin {
	animation: community-spin 1s linear infinite;
}

@keyframes community-spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
