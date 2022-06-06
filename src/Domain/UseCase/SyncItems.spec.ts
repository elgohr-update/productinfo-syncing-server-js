import 'reflect-metadata'

import { ContentType } from '@standardnotes/common'
import { AnalyticsStoreInterface, Period } from '@standardnotes/analytics'

import { ApiVersion } from '../Api/ApiVersion'
import { Item } from '../Item/Item'
import { ItemHash } from '../Item/ItemHash'
import { ItemServiceInterface } from '../Item/ItemServiceInterface'

import { SyncItems } from './SyncItems'

describe('SyncItems', () => {
  let itemService: ItemServiceInterface
  let item1: Item
  let item2: Item
  let item3: Item
  let itemHash: ItemHash
  let analyticsStore: AnalyticsStoreInterface

  const createUseCase = () => new SyncItems(itemService, analyticsStore)

  beforeEach(() => {
    item1 = {
      uuid: '1-2-3',
    } as jest.Mocked<Item>
    item2 = {
      uuid: '2-3-4',
    } as jest.Mocked<Item>
    item3 = {
      uuid: '3-4-5',
    } as jest.Mocked<Item>

    itemHash = {
      uuid: '2-3-4',
      content: 'asdqwe',
      content_type: ContentType.Note,
      duplicate_of: null,
      enc_item_key: 'qweqwe',
      items_key_id: 'asdasd',
      created_at: '2021-02-19T11:35:45.655Z',
      updated_at: '2021-03-25T09:37:37.944Z',
    }

    itemService = {} as jest.Mocked<ItemServiceInterface>
    itemService.getItems = jest.fn().mockReturnValue({
      items: [item1],
      cursorToken: 'asdzxc',
    })
    itemService.saveItems = jest.fn().mockReturnValue({
      savedItems: [item2],
      conflicts: [],
      syncToken: 'qwerty',
    })
    itemService.frontLoadKeysItemsToTop = jest.fn().mockReturnValue([item3, item1])

    analyticsStore = {} as jest.Mocked<AnalyticsStoreInterface>
    analyticsStore.markActivity = jest.fn()
  })

  it('should sync items', async () => {
    expect(
      await createUseCase().execute({
        userUuid: '1-2-3',
        itemHashes: [itemHash],
        computeIntegrityHash: false,
        syncToken: 'foo',
        cursorToken: 'bar',
        limit: 10,
        readOnlyAccess: false,
        contentType: 'Note',
        apiVersion: ApiVersion.v20200115,
        analyticsId: 123,
      }),
    ).toEqual({
      conflicts: [],
      cursorToken: 'asdzxc',
      retrievedItems: [item1],
      savedItems: [item2],
      syncToken: 'qwerty',
    })

    expect(itemService.frontLoadKeysItemsToTop).not.toHaveBeenCalled()
    expect(itemService.getItems).toHaveBeenCalledWith({
      contentType: 'Note',
      cursorToken: 'bar',
      limit: 10,
      syncToken: 'foo',
      userUuid: '1-2-3',
    })
    expect(itemService.saveItems).toHaveBeenCalledWith({
      itemHashes: [itemHash],
      userUuid: '1-2-3',
      apiVersion: '20200115',
      readOnlyAccess: false,
    })
    expect(analyticsStore.markActivity).toHaveBeenNthCalledWith(1, ['editing-items'], 123, [
      Period.Today,
      Period.ThisWeek,
      Period.ThisMonth,
    ])
    expect(analyticsStore.markActivity).toHaveBeenNthCalledWith(2, ['email-unbacked-up-data'], 123, [
      Period.Today,
      Period.ThisWeek,
    ])
  })

  it('should sync items - no analytics', async () => {
    expect(
      await createUseCase().execute({
        userUuid: '1-2-3',
        itemHashes: [itemHash],
        computeIntegrityHash: false,
        syncToken: 'foo',
        cursorToken: 'bar',
        limit: 10,
        readOnlyAccess: false,
        contentType: 'Note',
        apiVersion: ApiVersion.v20200115,
      }),
    ).toEqual({
      conflicts: [],
      cursorToken: 'asdzxc',
      retrievedItems: [item1],
      savedItems: [item2],
      syncToken: 'qwerty',
    })

    expect(itemService.frontLoadKeysItemsToTop).not.toHaveBeenCalled()
    expect(itemService.getItems).toHaveBeenCalledWith({
      contentType: 'Note',
      cursorToken: 'bar',
      limit: 10,
      syncToken: 'foo',
      userUuid: '1-2-3',
    })
    expect(itemService.saveItems).toHaveBeenCalledWith({
      itemHashes: [itemHash],
      userUuid: '1-2-3',
      apiVersion: '20200115',
      readOnlyAccess: false,
    })
    expect(analyticsStore.markActivity).not.toHaveBeenCalled()
  })

  it('should sync items and return items keys on top for first sync', async () => {
    expect(
      await createUseCase().execute({
        userUuid: '1-2-3',
        itemHashes: [itemHash],
        computeIntegrityHash: false,
        limit: 10,
        readOnlyAccess: false,
        contentType: 'Note',
        apiVersion: ApiVersion.v20200115,
        analyticsId: 123,
      }),
    ).toEqual({
      conflicts: [],
      cursorToken: 'asdzxc',
      retrievedItems: [item3, item1],
      savedItems: [item2],
      syncToken: 'qwerty',
    })
  })

  it('should sync items and return filtered out sync conflicts for consecutive sync operations', async () => {
    itemService.getItems = jest.fn().mockReturnValue({
      items: [item1, item2],
      cursorToken: 'asdzxc',
    })

    itemService.saveItems = jest.fn().mockReturnValue({
      savedItems: [],
      conflicts: [
        {
          serverItem: item2,
          type: 'sync_conflict',
        },
        {
          serverItem: undefined,
          type: 'sync_conflict',
        },
      ],
      syncToken: 'qwerty',
    })

    expect(
      await createUseCase().execute({
        userUuid: '1-2-3',
        itemHashes: [itemHash],
        computeIntegrityHash: false,
        syncToken: 'foo',
        readOnlyAccess: false,
        cursorToken: 'bar',
        limit: 10,
        contentType: 'Note',
        apiVersion: ApiVersion.v20200115,
        analyticsId: 123,
      }),
    ).toEqual({
      conflicts: [
        {
          serverItem: item2,
          type: 'sync_conflict',
        },
        {
          serverItem: undefined,
          type: 'sync_conflict',
        },
      ],
      cursorToken: 'asdzxc',
      retrievedItems: [item1],
      savedItems: [],
      syncToken: 'qwerty',
    })
  })
})
