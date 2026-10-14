// emoji-datasource (iamcal/emoji-data) no trae tipos; solo los campos que usamos.
declare module "emoji-datasource" {
  export interface EmojiDatasource {
    unified: string
    short_names: string[]
    category: string
    sort_order: number
    has_img_google: boolean
    obsoleted_by?: string | null
  }
  const emojis: EmojiDatasource[]
  export default emojis
}
