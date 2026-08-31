export function revealItemScrollTop({
  scrollTop,
  containerTop,
  containerHeight,
  itemTop,
  itemHeight,
}: {
  scrollTop: number
  containerTop: number
  containerHeight: number
  itemTop: number
  itemHeight: number
}): number {
  return Math.max(
    0,
    scrollTop + itemTop - containerTop - (containerHeight - itemHeight) / 2,
  )
}

export function revealItemInAside(aside: HTMLElement, item: HTMLElement): void {
  const asideBox = aside.getBoundingClientRect()
  const itemBox = item.getBoundingClientRect()

  aside.scrollTo({
    top: revealItemScrollTop({
      scrollTop: aside.scrollTop,
      containerTop: asideBox.top,
      containerHeight: aside.clientHeight,
      itemTop: itemBox.top,
      itemHeight: itemBox.height,
    }),
    behavior: 'auto',
  })
}
