<script setup lang="ts">
import { GlassCard } from "@design-system/index";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import {
	type CommunityCollectionSummary,
	listCommunityCollections,
} from "../services/community-catalog";

const { t } = useI18n();
const router = useRouter();

const collections = ref<CommunityCollectionSummary[]>([]);
const isLoading = ref(true);

async function load() {
	isLoading.value = true;
	collections.value = await listCommunityCollections();
	// listCommunityCollections nunca lança; falha de rede/API = lista vazia.
	isLoading.value = false;
}

async function saveCopy(collection: CommunityCollectionSummary) {
	// F0.4: cópia local editável, SEM tocar na do autor.
	// A cópia em si é criada pelo editor de Minhas Coletâneas (fluxo existente);
	// aqui navegamos pra Central com a origem indicada via query.
	await router.push({
		path: "/albums",
		query: { copyFromCommunity: String(collection.id) },
	});
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
      </div>
    </header>

    <p
      v-if="isLoading"
      class="community-view__status"
    >
      {{ t('community.loading') }}
    </p>

    <div
      v-else-if="collections.length > 0"
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
          <button
            type="button"
            class="community-view__copy-btn"
            @click="saveCopy(collection)"
          >
            <i class="ti ti-copy" aria-hidden="true" />
            {{ t('community.saveCopy') }}
          </button>
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

.community-view__copy-btn:hover {
  filter: brightness(1.15);
}
</style>
