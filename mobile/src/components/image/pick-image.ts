// Thin wrappers over expo-image-picker that request the right permission and
// return a single local uri (or null if cancelled / denied). Editing is left to
// our own ImageEditor, so the native picker's allowsEditing is off.

import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'

async function ensure(granted: boolean, message: string): Promise<boolean> {
  if (!granted) {
    Alert.alert('İzin gerekli', message)
    return false
  }
  return true
}

/** Pick one photo from the library. Returns its local uri or null. */
export async function pickFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!(await ensure(perm.granted, 'Fotoğraf seçmek için galeri erişimine izin verin.'))) {
    return null
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: false,
  })
  if (result.canceled || result.assets.length === 0) return null
  return result.assets[0].uri
}

/** Capture a photo with the camera. Returns its local uri or null. */
export async function pickFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!(await ensure(perm.granted, 'Fotoğraf çekmek için kamera erişimine izin verin.'))) {
    return null
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 1,
  })
  if (result.canceled || result.assets.length === 0) return null
  return result.assets[0].uri
}
