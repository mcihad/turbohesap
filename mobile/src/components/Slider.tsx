// Slider — a minimal, dependency-free horizontal slider built on the RN core
// PanResponder (the app intentionally avoids react-native-gesture-handler). Used
// by the image editor's colour controls, but generic enough for any 0–1-style
// range input.

import * as React from 'react'
import { PanResponder, View, type LayoutChangeEvent } from 'react-native'

import { useTheme } from '../theme/theme-context'

export function Slider({
  value,
  min = 0,
  max = 1,
  step,
  onChange,
  onComplete,
  trackColor,
  fillColor,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  onComplete?: (value: number) => void
  trackColor?: string
  fillColor?: string
}) {
  const t = useTheme()
  const widthRef = React.useRef(0)
  // Keep the latest onChange/value in refs so the PanResponder (created once)
  // always sees fresh values without being recreated mid-gesture.
  const onChangeRef = React.useRef(onChange)
  const onCompleteRef = React.useRef(onComplete)
  onChangeRef.current = onChange
  onCompleteRef.current = onComplete

  const clampSnap = React.useCallback(
    (raw: number) => {
      let v = Math.min(max, Math.max(min, raw))
      if (step && step > 0) v = Math.round((v - min) / step) * step + min
      return v
    },
    [min, max, step],
  )

  const valueAt = React.useCallback(
    (x: number) => {
      const w = widthRef.current || 1
      const ratio = Math.min(1, Math.max(0, x / w))
      return clampSnap(min + ratio * (max - min))
    },
    [clampSnap, min, max],
  )

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => onChangeRef.current(valueAt(e.nativeEvent.locationX)),
        onPanResponderMove: (e) => onChangeRef.current(valueAt(e.nativeEvent.locationX)),
        onPanResponderRelease: (e) => {
          const v = valueAt(e.nativeEvent.locationX)
          onChangeRef.current(v)
          onCompleteRef.current?.(v)
        },
      }),
    [valueAt],
  )

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width
  }

  const pct = max > min ? ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100 : 0

  return (
    <View
      {...responder.panHandlers}
      onLayout={onLayout}
      style={{ height: 36, justifyContent: 'center' }}
      hitSlop={{ top: 8, bottom: 8 }}
    >
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: trackColor ?? t.colors.muted,
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            borderRadius: 2,
            backgroundColor: fillColor ?? t.colors.primary,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          left: `${pct}%`,
          marginLeft: -11,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: t.colors.background,
          borderWidth: 2,
          borderColor: fillColor ?? t.colors.primary,
          ...t.elevation('sm'),
        }}
      />
    </View>
  )
}
