import { ContentType } from '@standardnotes/common'
import { injectable } from 'inversify'
import { ItemSaveValidationDTO } from '../SaveValidator/ItemSaveValidationDTO'
import { ItemSaveRuleResult } from './ItemSaveRuleResult'
import { ItemSaveRuleInterface } from './ItemSaveRuleInterface'
import { ItemErrorType } from '../ItemErrorType'

@injectable()
export class ContentTypeFilter implements ItemSaveRuleInterface {
  async check(dto: ItemSaveValidationDTO): Promise<ItemSaveRuleResult> {
    const validContentType = Object.values(ContentType).includes(dto.itemHash.content_type as ContentType)

    if (!validContentType) {
      return {
        passed: false,
        conflict: {
          unsavedItem: dto.itemHash,
          type: ItemErrorType.ContentTypeError,
        },
      }
    }

    return {
      passed: true,
    }
  }
}
