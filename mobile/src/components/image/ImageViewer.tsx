// ImageViewer — full-screen, swipeable image viewer. Tap any thumbnail in the
// ImageManager to open the large version here. Horizontal paging between images;
// each page pinch-zooms via the core ScrollView's built-in zoom (iOS) and
// double-tap-free panning. No gesture-handler dependency.

import * as React from 'react'
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'

import { Icon, Text } from '..'

export function ImageViewer({
  visible,
  urls,
  index,
  onClose,
}: {
  visible: boolean
  urls: string[]
  index: number
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const pagerRef = React.useRef<ScrollView>(null)
  const [page, setPage] = React.useState(index)

  // Jump to the tapped image when (re)opened.
  React.useEffect(() => {
    if (visible) {
      setPage(index)
      // Defer so the ScrollView has laid out before scrolling.
      const id = setTimeout(() => {
        pagerRef.current?.scrollTo({ x: index * width, animated: false })
      }, 0)
      return () => clearTimeout(id)
    }
  }, [visible, index, width])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' }}>
        <View
          style={{
            position: 'absolute',
            top: insets.top + 4,
            left: 0,
            right: 0,
            zIndex: 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 14,
          }}
        >
          <Text variant="label" style={{ color: '#fff' }}>
            {urls.length > 1 ? `${page + 1} / ${urls.length}` : ''}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={{ padding: 6 }}>
            <Icon name="x" size={26} color="#fff" />
          </Pressable>
        </View>

        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setPage(Math.round(e.nativeEvent.contentOffset.x / width))
          }
        >
          {urls.map((url, i) => (
            <ZoomPage key={`${url}-${i}`} url={url} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
}

function ZoomPage({ url }: { url: string }) {
  const { width, height } = Dimensions.get('window')
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={{ width, height, alignItems: 'center', justifyContent: 'center' }}
      maximumZoomScale={4}
      minimumZoomScale={1}
      centerContent
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <Image
        source={{ uri: url }}
        style={{ width, height }}
        contentFit="contain"
        transition={150}
      />
    </ScrollView>
  )
}
