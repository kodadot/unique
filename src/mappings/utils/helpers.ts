import { Call as TCall } from '@polkadot/types/interfaces'
import { EventRecord, Event } from '@polkadot/types/interfaces'

export const matchEvent = (
  event: Event,
  method: string,
  section: string
): boolean => {
  return (
    event.method.toString() === method && event.section.toString() === section
  )
}

export function exists<T>(entity: T | undefined): boolean {
  return !!entity
}

export function isEmpty<T>(entity: T | undefined, event: string): boolean {
  if (!exists(entity)) {
    logger.warn(`${event}: No ID found on entity is undefined`)
    return true
  } 

  return false
}

export const createTokenId = (collection: string, id: string) => `${collection}-${id}`

export const tokenIdOf = (collectionAndId: [string, string] | string): string => {
  const [collection, id] = Array.isArray(collectionAndId) ? collectionAndId : collectionAndId.split(',')
  return createTokenId(collection, id)
}

export const splitTokenId = (tokenId: string): [string, string] => {
  const [collection, id] = tokenId.split('-')
  return [collection, id]
}

export const isTokenClassCreated = ({ event }: EventRecord): boolean =>
  matchEvent(event, 'TokenClassCreated', 'nft')

export const isTokenMinted = ({ event }: EventRecord): boolean =>
  matchEvent(event, 'TokenMinted', 'nft')

export const isTokenBurned = ({ event }: EventRecord): boolean =>
  matchEvent(event, 'TokenBurned', 'nft')

export const isTokenTransferred = ({ event }: EventRecord): boolean =>
  matchEvent(event, 'TokenTransferred', 'nft')

export const isCreateCollection = (call: TCall): boolean =>
  isExtrinsic(call, 'createClass', 'nft')
export const isCreateToken = (call: TCall): boolean =>
  isExtrinsic(call, 'mint', 'nft')

export const isExtrinsic = (
  call: TCall,
  method: string,
  section: string
): boolean => call.section === section && call.method === method
