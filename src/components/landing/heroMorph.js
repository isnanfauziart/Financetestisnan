export function getHeroMorphTransform(sourceRect, targetRect, targetTravelY = 0) {
  const sourceCenterX = sourceRect.left + sourceRect.width / 2
  const sourceCenterY = sourceRect.top + sourceRect.height / 2
  const targetCenterX = targetRect.left + targetRect.width / 2
  const targetCenterY = targetRect.top + targetRect.height / 2 + targetTravelY

  return {
    x: targetCenterX - sourceCenterX,
    y: targetCenterY - sourceCenterY,
    scale: sourceRect.width > 0 && sourceRect.height > 0
      ? Math.min(targetRect.width / sourceRect.width, targetRect.height / sourceRect.height)
      : 1,
  }
}

export function getHeroProductTravel(
  frameRect,
  { viewportHeight, topInset = 72, bottomInset = 24 },
) {
  const availableHeight = Math.max(0, viewportHeight - topInset - bottomInset)
  const breathingRoom = Math.max(0, availableHeight - frameRect.height)
  const targetTop = topInset + breathingRoom / 2

  return targetTop - frameRect.top
}
