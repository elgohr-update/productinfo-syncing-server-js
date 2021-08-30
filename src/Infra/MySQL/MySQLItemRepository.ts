import { TimerInterface } from '@standardnotes/time'
import { inject, injectable } from 'inversify'
import { EntityRepository, Repository } from 'typeorm'
import TYPES from '../../Bootstrap/Types'
import { ContentType } from '../../Domain/Item/ContentType'
import { Item } from '../../Domain/Item/Item'
import { ItemQuery } from '../../Domain/Item/ItemQuery'
import { ItemRepositoryInterface } from '../../Domain/Item/ItemRepositoryInterface'

@injectable()
@EntityRepository(Item)
export class MySQLItemRepository extends Repository<Item> implements ItemRepositoryInterface {
  constructor(
    @inject(TYPES.Timer) private timer: TimerInterface,
  ) {
    super()
  }

  async findByUuid(uuid: string): Promise<Item | undefined> {
    return this.createQueryBuilder('item')
      .where(
        'item.uuid = :uuid',
        {
          uuid,
        }
      )
      .getOne()
  }

  async findDatesForComputingIntegrityHash(userUuid: string): Promise<number[]> {
    const queryBuilder = this.createQueryBuilder('item')
    queryBuilder.select('item.updated_at_timestamp')
    queryBuilder.addSelect('item.content_type')
    queryBuilder.where('item.user_uuid = :userUuid', { userUuid: userUuid })
    queryBuilder.andWhere('item.deleted = :deleted', { deleted: false })

    const items = await queryBuilder.getRawMany()

    return items
      .filter(item => item.content_type !== null)
      .sort((itemA, itemB) => itemB.updated_at_timestamp - itemA.updated_at_timestamp)
      .map(item => this.timer.convertMicrosecondsToMilliseconds(item.updated_at_timestamp))
  }

  async findByUuidAndUserUuid(uuid: string, userUuid: string): Promise<Item | undefined> {
    return this.createQueryBuilder('item')
      .where(
        'item.uuid = :uuid AND item.user_uuid = :userUuid',
        {
          uuid,
          userUuid,
        }
      )
      .getOne()
  }

  async findAll(query: ItemQuery): Promise<Item[]> {
    const queryBuilder = this.createQueryBuilder('item')
    queryBuilder.orderBy(`item.${query.sortBy}`, query.sortOrder)

    if (query.userUuid !== undefined) {
      queryBuilder.where('item.user_uuid = :userUuid', { userUuid: query.userUuid })
    }
    if (query.uuids) {
      queryBuilder.andWhere('item.uuid IN (:...uuids)', { uuids: query.uuids })
    }
    if (query.deleted !== undefined) {
      queryBuilder.andWhere('item.deleted = :deleted', { deleted: query.deleted })
    }
    if (query.contentType) {
      queryBuilder.andWhere('item.content_type = :contentType', { contentType: query.contentType })
    }
    if (query.lastSyncTime && query.syncTimeComparison) {
      queryBuilder.andWhere(`item.updated_at_timestamp ${query.syncTimeComparison} :lastSyncTime`, { lastSyncTime: query.lastSyncTime })
    }
    if (query.offset !== undefined) {
      queryBuilder.skip(query.offset)
    }
    if (query.limit !== undefined) {
      queryBuilder.take(query.limit)
    }

    return queryBuilder.getMany()
  }

  async findMFAExtensionByUserUuid(userUuid: string): Promise<Item | undefined> {
    return this.createQueryBuilder('item')
      .where(
        'item.user_uuid = :user_uuid AND item.content_type = :content_type AND deleted = :deleted',
        {
          user_uuid: userUuid,
          content_type: ContentType.MFA,
          deleted: false,
        }
      )
      .getOne()
  }

  async deleteMFAExtensionByUserUuid(userUuid: string): Promise<void> {
    await this.createQueryBuilder('item')
      .delete()
      .from('items')
      .where(
        'user_uuid = :user_uuid AND content_type = :content_type',
        {
          user_uuid: userUuid,
          content_type: ContentType.MFA,
        }
      )
      .execute()
  }
}
