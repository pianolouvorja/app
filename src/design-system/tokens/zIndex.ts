export const zIndex = {
  base: 0,
  content: 10,
  header: 40,
  dock: 50,
  modal: 60,
  toast: 70,
} as const

export type ZIndexToken = keyof typeof zIndex
