<script setup lang="ts">
/**
 * Preview 16:9 da personalização do Palco — paridade com o preview do
 * StageCustomizationSheet do APK: mostra o BG real (imagem/dataURL ou
 * cor), texto de amostra com sombra/caixinha/alinhamentos e (modo Bíblia)
 * rodapé de referência.
 */
import { computed } from 'vue'

import { resolveBackgroundImage, type StageSettings } from '../types/stage-settings'

const props = defineProps<{
  settings: StageSettings
  module?: string
}>()

const sample = computed(() =>
  props.module === 'bible'
    ? 'Porque Deus amou o mundo de tal maneira'
    : 'O nosso sol\nVeio iluminar',
)

const footer = computed(() =>
  props.module === 'bible' ? 'João 3:16 — ARC' : null,
)

const containerStyle = computed(() => {
  const s = props.settings
  return {
    backgroundColor: s.backgroundColor,
    backgroundImage: resolveBackgroundImage(s.backgroundImage)
      ? `url(${resolveBackgroundImage(s.backgroundImage)})`
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    alignItems:
      s.textVerticalAlign === 'top'
        ? 'flex-start'
        : s.textVerticalAlign === 'bottom'
          ? 'flex-end'
          : 'center',
    justifyContent:
      s.textAlign === 'left'
        ? 'flex-start'
        : s.textAlign === 'right'
          ? 'flex-end'
          : 'center',
  } as Record<string, string>
})

const textStyle = computed(() => {
  const s = props.settings
  const isBible = props.module === 'bible'
  return {
    color: isBible ? s.bibleTextColor : s.textColor,
    // 96px @1920 → 5% da largura do preview (font-size em cqw)
    fontSize: `${((isBible ? s.bibleFontSize : s.fontSize) / 1920) * 100}cqw`,
    fontWeight: String(isBible ? s.bibleFontWeight : s.fontWeight),
    textAlign: s.textAlign,
    textShadow: s.textShadow
      ? `0 0 ${(s.shadowBlur / 108) * 100}cqw rgba(0,0,0,${s.shadowIntensity})`
      : 'none',
  } as Record<string, string>
})

const boxStyle = computed(() => {
  const s = props.settings
  if (!s.textBox) return {}
  return {
    backgroundColor: `rgba(0,0,0,${s.boxOpacity})`,
    border: s.boxBorder ? '1px solid rgba(255,255,255,0.25)' : 'none',
    // Padrão folha característico do design (como o media-projection)
    borderRadius: '1.4cqw 0 1.4cqw 0',
  }
})

const footerStyle = computed(() => ({
  color: props.settings.footerRefColor,
  fontWeight: String(props.settings.footerRefWeight),
}))
</script>

<template>
  <div
    class="stage-preview"
    :style="containerStyle"
  >
    <div
      class="stage-preview__box"
      :style="boxStyle"
    >
      <p
        class="stage-preview__text"
        :style="textStyle"
      >
        {{ sample }}
      </p>
    </div>
    <p
      v-if="footer && settings.showBibleVersion"
      class="stage-preview__footer"
      :style="footerStyle"
    >
      {{ footer }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.stage-preview {
  position: relative;
  display: flex;
  justify-content: center;
  container-type: inline-size;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--ds-radius-lg, 12px);
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 15%, transparent);
}

.stage-preview__box {
  display: flex;
  max-width: calc(100% - 12.5cqw); /* margin 120px @1920 */
  padding: 2cqw;
  /* radius (padrão folha) vem inline do boxStyle quando textBox ativo */
}

.stage-preview__text {
  margin: 0;
  line-height: 1.35;
  white-space: pre-line;
  /* alinhamento horizontal vem inline (textStyle); largura mínima
     para o box acompanhar o texto quando não estica (left/right) */
  width: fit-content;
}

.stage-preview__footer {
  position: absolute;
  right: 3cqw;
  bottom: 2.2cqw;
  margin: 0;
  font-size: 2.2cqw;
}
</style>
