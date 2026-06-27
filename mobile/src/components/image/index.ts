// Barrel for the mobile image-management module — a reusable, polymorphic image
// gallery + editor (crop/rotate/colour) + full-screen viewer, all wired to the
// shared files API. Import from '../components/image'.

export { ImageManager } from './ImageManager'
export { QuickImageAdd } from './QuickImageAdd'
export { ImageEditor } from './ImageEditor'
export { ImageViewer } from './ImageViewer'
export { imageUrl, uploadImage, useEntityImages, type EntityImages } from './image-files'
export { pickFromCamera, pickFromLibrary } from './pick-image'
export { bakeImage, type BakedImage, type BakeOptions, type CropRect } from './edit-image'
export {
  adjustToMatrix,
  IDENTITY_ADJUST,
  isIdentityAdjust,
  type ImageAdjust,
  type ColorMatrix,
} from './color-matrix'
