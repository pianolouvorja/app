<script setup lang="ts">
/**
 * Fundo otimizado para projeção (sem glow intenso).
 */
</script>

<template>
  <div class="ds-projection-bg">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.ds-projection-bg {
  min-height: 100%;
  width: 100%;
  background-color: #000000;
  color: #ffffff;
}
</style>
