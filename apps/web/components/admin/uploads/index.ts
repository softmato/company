/**
 * The global uploader — the one way the admin puts an image into storage.
 *
 * UI:      <ImageUploader />      self-managed field (dropzone | button | compact)
 *          <ImageUploaderView />  same field, driven by a useImageUpload instance
 * Hook:    useImageUpload()       headless: held file + upload + status
 * Direct:  uploadImage()          imperative, from `@/lib/admin/upload-image`
 *
 * Every one of these routes through the presigned flow in
 * `app/api/admin/upload` — bytes go browser → R2, and the server verifies the
 * object before returning a URL. Call sites never talk to R2 themselves.
 */
export {
  ImageUploader,
  ImageUploaderView,
  type ImageUploaderPresentation,
  type ImageUploaderProps,
  type ImageUploaderVariant,
} from './image-uploader';
export {
  useImageUpload,
  type ImageUploadApi,
  type UploadedImage,
  type UploadStatus,
  type UseImageUploadOptions,
} from './use-image-upload';
