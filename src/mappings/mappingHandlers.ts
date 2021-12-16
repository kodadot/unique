import {
  SubstrateExtrinsic,
  SubstrateEvent,
  SubstrateBlock,
} from '@subql/types'
import { CollectionEntity, NFTEntity } from '../types'
import {
  processCollection,
  log,
  getEventArgs,
  getSigner,
  processToken,
  getArgs,
  getBasicData,
} from './utils/extract'
import { getCollectionOrElseCreate, getTokenOrElseCreate } from './utils/getter'
import { createTokenId, exists, isEmpty, matchEvent } from './utils/helpers'

export async function handleCreateCollection(
  event: SubstrateEvent
): Promise<void> {
  const collection = processCollection(event.extrinsic)
  const [id, caller, admin] = getEventArgs(event, [0])
  log('CREATE', { id, caller, admin })
  if (!id) {
    logger.warn('No collection ID found in extrinsic')
    return
  }

  const final = await getCollectionOrElseCreate(id.toString(), caller)
  final.admin = admin
  final.blockNumber = BigInt(collection.blockNumber)
  final.createdAt = collection.timestamp

  logger.info(`SAVED in ${collection.blockNumber} [COLLECTION] ${final.id}`)
  await final.save()
}

export async function handleForceCreateCollection(event: SubstrateEvent): Promise<void> {
  const collection = processCollection(event.extrinsic)
  const [id, admin] = getEventArgs(event, [0])
  const caller = getSigner(event)
  log('CREATE', { id, caller, admin })
  if (!id) {
    logger.warn('No collection ID found in extrinsic')
    return
  }

  const final = await getCollectionOrElseCreate(id.toString(), admin)
  final.admin = admin
  final.blockNumber = BigInt(collection.blockNumber)
  final.createdAt = collection.timestamp

  logger.info(`SAVED [COLLECTION] ${final.id}`)
  await final.save()
}

export async function handleCollectionMetadata(
  event: SubstrateEvent
): Promise<void> {
  const [id, metadata, frozen] = getEventArgs(event, [0])
  const caller = getSigner(event)
  log('METADATA', { id, metadata, frozen })
  if (isEmpty(id, 'Collection Metadata')) {
    return
  }

  const final = await getCollectionOrElseCreate(id, caller)

  final.metadata = metadata
  final.metadataFrozen = frozen === 'true'

  logger.info(`SAVED [COLLECTION] ${final.id}`)
  await final.save()
}

export async function handleCollectionMetadataClear(
  event: SubstrateEvent
): Promise<void> {
  const [id] = getEventArgs(event, [0])
  const caller = getSigner(event)
  const final = await getCollectionOrElseCreate(id.toString(), caller)
  log('COLLECTION METADATA CLEAR', { id })
  final.metadata = null
  final.metadataFrozen = null
  logger.info(`SAVED [TOKEN] ${final.id}`)
  await final.save()
}

export async function handleCollectionDestroy(
  event: SubstrateEvent
): Promise<void> {
  const [id] = getEventArgs(event, [0])

  if (isEmpty(id, 'DESTROY')) {
    return
  }

  logger.info(`REMOVING [COLLECTION] ${id}`)
  await CollectionEntity.remove(id)
}

export async function handleCollectionFreeze(
  event: SubstrateEvent
): Promise<void> {
  const [id] = getEventArgs(event, [0])
  const caller = getSigner(event)
  const final = await getCollectionOrElseCreate(id, caller)
  const isFreze = matchEvent(event.event, 'ClassFrozen', 'uniques')
  log('FREEZE', {
    id,
    method: event.event.method,
    section: event.event.section,
    freeze: isFreze,
  })
  final.frozen = isFreze
  logger.info(`SAVED [COLLECTION] ${final.id}`)
  await final.save()
}

export async function handleCollectionTransfer(
  event: SubstrateEvent
): Promise<void> {
  const [id, newOwner] = getEventArgs(event, [0])
  const caller = getSigner(event)
  const final = await getCollectionOrElseCreate(id, caller)
  final.currentOwner = newOwner
  logger.info(`SAVED [COLLECTION] ${final.id}`)
  await final.save()
}

export async function handleCollectionPermission(
  event: SubstrateEvent
): Promise<void> {
  const [id, newIssuer, newAdmin, newFreezer] = getEventArgs(event, [0])
  const caller = getSigner(event)
  const final = await getCollectionOrElseCreate(id.toString(), caller)
  log('ROOT', { id, newIssuer, newAdmin, newFreezer })
  final.admin = newAdmin
  final.issuer = newIssuer
  final.freezer = newFreezer
  logger.info(`SAVED [COLLECTION] ${final.id}`)
  await final.save()
}

export async function handleAssetStatusChange(event: SubstrateEvent): Promise<void> {
  const {extrinsic: { extrinsic }} = event;
  extrinsic.args
  const [id, newOwner, newIssuer, newAdmin, newFreezer,  ,frozen] = getArgs(extrinsic.args, [0])
  const caller = getSigner(event)

  try {
    BigInt(id) // this will throw if id is not a number
    log('FORCE ROOT', { args: extrinsic.args })
    const final = await getCollectionOrElseCreate(id.toString(), caller)
    final.currentOwner = newOwner;
    final.admin = newAdmin
    final.issuer = newIssuer
    final.freezer = newFreezer
    final.frozen = frozen === 'true'
    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save()
  } catch (e) {
    const other = getBasicData(event.extrinsic);
    logger.warn(`!! BAD ROOT in block ${JSON.stringify(other, null, 2)}:  ${e.message}`);
  }
  
}

export async function handleAttributeSet(event: SubstrateEvent): Promise<void> {
  const [id, tokenId, key, value] = getEventArgs(event, [0, 1])
  const caller = getSigner(event)
  log('ATTRIBUTE_SET', { id, tokenId, key, value })
  let final
  if (tokenId) {
    final = await getTokenOrElseCreate(createTokenId(id, tokenId), caller)
  } else {
    final = await getCollectionOrElseCreate(id.toString(), caller)
  }

  const alreadyDefined = final.attributes.findIndex((a) => a.key === key)
  if (alreadyDefined >= 0) {
    final.attributes[alreadyDefined].value = value
  } else {
    final.attributes.push({ key, value })
  }
  await final.save()
}

export async function handleAttributeClear(
  event: SubstrateEvent
): Promise<void> {
  const [id, tokenId, key] = getEventArgs(event, [0])
  const caller = getSigner(event)
  log('ATTRIBUTE_CLEAR', { id, tokenId, key })
  if (tokenId) {
    log('TOKEN_ATTRIBUTE_CLEAR', { id, tokenId, key })
  } else {
    const final = await getCollectionOrElseCreate(id.toString(), caller)
    const alreadyDefined = final.attributes.findIndex((a) => a.key === key)
    if (alreadyDefined >= 0) {
      final.attributes.splice(alreadyDefined, 1)
    }
    await final.save()
  }
}

export async function handleTokenCreate(event: SubstrateEvent): Promise<void> {
  const token = processToken(event.extrinsic)
  const [collectionId, id, owner] = getEventArgs(event, [0, 1])
  log('MINT', token)
  if (!collectionId || !id) {
    logger.warn('No collection/token ID found in extrinsic')
    return
  }

  const final = await getTokenOrElseCreate(
    createTokenId(collectionId, id),
    token.caller
  )
  final.currentOwner = owner
  final.id = createTokenId(collectionId, id)
  final.blockNumber = BigInt(token.blockNumber)
  final.collectionId = collectionId
  final.createdAt = token.timestamp

  logger.info(`SAVED [TOKEN] ${final.id}`)
  await final.save()
}

export async function handleTokenTransfer(
  event: SubstrateEvent
): Promise<void> {
  const [collectionId, id, from, to] = getEventArgs(event, [0, 1])

  const finalId = createTokenId(collectionId, id)
  const final = await getTokenOrElseCreate(finalId, from)

  if (isEmpty(final.collectionId, `Token Transfer ${finalId} [collectionId]`)) {
    return
  }

  final.currentOwner = to
  logger.info(`SAVED [TOKEN] ${final.id}`)
  await final.save()
}

export async function handleTokenBurn(event: SubstrateEvent): Promise<void> {
  const [collectionId, id] = getEventArgs(event, [0, 1])
  const tokenId = createTokenId(collectionId, id)
  logger.info(`REMOVING [TOKEN] ${tokenId}`)
  await NFTEntity.remove(tokenId)
}

export async function handleTokenFreeze(event: SubstrateEvent): Promise<void> {
  const [collectionId, id] = getEventArgs(event, [0, 1])
  const caller = getSigner(event)
  const final = await getTokenOrElseCreate(
    createTokenId(collectionId, id),
    caller
  )
  const isFreze = matchEvent(event.event, 'Frozen', 'uniques')
  log('FREEZE', {
    id,
    method: event.event.method,
    section: event.event.section,
    freeze: isFreze,
  })
  final.frozen = isFreze
  logger.info(`SAVED [TOKEN] ${final.id}`)
  await final.save()
}

export async function handleTokenMetadata(
  event: SubstrateEvent
): Promise<void> {
  const [collectionId, id, metadata, frozen] = getEventArgs(event, [0, 1])
  const caller = getSigner(event)
  log('TOKEN METADATA', { id, metadata, frozen })
  if (isEmpty(id, 'Token Metadata [id]')) {
    return
  }

  const finalId = createTokenId(collectionId, id)

  const final = await getTokenOrElseCreate(
    finalId,
    caller
  )

  if (isEmpty(final.collectionId, `Token Metadata ${finalId} [collectionId]`)) {
    return
  }

  final.metadata = metadata
  final.metadataFrozen = frozen === 'true'

  logger.info(`SAVED [TOKEN] ${final.id}`)
  await final.save()
}

export async function handleTokenMetadataClear(
  event: SubstrateEvent
): Promise<void> {
  const [collectionId, id] = getEventArgs(event, [0, 1])
  const caller = getSigner(event)
  const finalId = createTokenId(collectionId, id)
  const final = await getTokenOrElseCreate(
    finalId,
    caller
  )
  
  if (isEmpty(final.collectionId, `Token Metadata Clear ${finalId} [collectionId]`)) {
    return
  }

  log('TOKEN METADATA CLEAR', { collectionId, id })

  final.metadata = null
  final.metadataFrozen = null
  logger.info(`SAVED [TOKEN] ${final.id}`)
  await final.save()
}

export async function handleTokenApproval(
  event: SubstrateEvent
): Promise<void> {
  const [collectionId, id, , delegate] = getEventArgs(event, [0, 1])
  const caller = getSigner(event)
  const final = await getTokenOrElseCreate(
    createTokenId(collectionId, id),
    caller
  )
  const isCancel = matchEvent(event.event, 'ApprovalCancelled', 'uniques')
  log('GRANTING TOKEN APPROVAL', { id, delegate, isCancel })
  final.delegate = isCancel ? null : delegate
  logger.info(`SAVED [TOKEN] ${final.id}`)
  await final.save()
}

// Master should handle edge cases like:
handleEventMaster
export async function handleEventMaster(event: SubstrateEvent): Promise<void> {
  const [id] = getEventArgs(event, [0])
  log('MASTER', {
    id,
    method: event.event.method,
    section: event.event.section,
  })

  switch (event.event.method) {
    case 'Created':
      return handleCreateCollection(event)
    case 'ForceCreated':
      return handleForceCreateCollection(event)
    case 'ClassMetadataSet':
      return handleCollectionMetadata(event)
    case 'ClassMetadataCleared':
      return handleCollectionMetadataClear(event)
    case 'ClassThawed':
    case 'ClassFrozen':
      return handleCollectionFreeze(event)
    case 'OwnerChanged':
      return handleCollectionTransfer(event)
    case 'TeamChanged':
      return handleCollectionPermission(event)
    case 'AttributeCleared':
      return handleAttributeClear(event)
    case 'Issued':
      return handleTokenCreate(event)
    case 'Transferred':
      return handleTokenTransfer(event)
    case 'Frozen':
    case 'Thawed':
      return handleTokenFreeze(event)
    case 'MetadataSet':
      return handleTokenMetadata(event)
    case 'MetadataCleared':
      return handleTokenMetadataClear(event)
    case 'ApprovedTransfer':
      return handleTokenApproval(event)
    case 'ApprovalCancelled':
      return handleTokenApproval(event)
    case 'AttributeSet':
      return handleAttributeSet(event)
    case 'Burned':
      return handleTokenBurn(event)
    case 'Destroyed':
      return handleCollectionDestroy(event)
    case 'AssetStatusChanged':
      return handleAssetStatusChange(event)
    case 'Redeposited':
      logger.info(`SKIPPING EVENT: ${event.event.method}`)
      break;
    default:
      logger.warn(`Unknown event ${event.event.method}`)
      break;
  }
}

// AssetStatusChanged
// Burned
// ClassMetadataCleared
// ClassMetadataSet
// Created
// Destroyed
// ForceCreated
// Issued
// MetadataSet
// Redeposited


// Transferred