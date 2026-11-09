import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_SIDE = 1600;

/**
 * Redraws a picked photo as a JPEG no more than 1600 px on its longer side, usually a
 * few hundred KB. The API takes up to 1 MB per photo and the database has 200 MB in total.
 */
export async function shrinkPhoto(asset: { uri: string; width: number; height: number }): Promise<string> {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return saved.uri;
}
