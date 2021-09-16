import { SubstrateExtrinsic,SubstrateEvent,SubstrateBlock } from "@subql/types";
import { CollectionEntity, NFTEntity } from "../types";
import { processCollection, log, processTransfer, processBurn, processMetada, getEventArgs, getSigner, processToken } from './utils/extract';
import { getCollectionOrElseCreate, getTokenOrElseCreate } from './utils/getter';
import { createTokenId, exists, isEmpty, matchEvent } from './utils/helpers';

export async function handleCreateCollection(event: SubstrateEvent): Promise<void> {
    const collection = processCollection(event.extrinsic)
    const [id, caller, admin] = getEventArgs(event, [0]);
    log('CREATE', { id, caller, admin });
    if (!id) {
        logger.warn("No collection ID found in extrinsic");
        return;
    }

    const final = await getCollectionOrElseCreate(id.toString(), caller);    
    final.admin = admin;
    final.blockNumber = BigInt(collection.blockNumber);


    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleCollectionMetadata(event: SubstrateEvent): Promise<void> {
    const [id, metadata, frozen] = getEventArgs(event, [0]);
    const caller = getSigner(event);
    log('METADATA', { id, metadata, frozen })
    if (isEmpty(id, 'Collection Metadata')) {
        return;
    }

    const final = await getCollectionOrElseCreate(id, caller);

    final.metadata = metadata;
    final.metadataFrozen = frozen === 'true'; 
    

    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleCollectionDestroy(event: SubstrateEvent): Promise<void> {
    const [id] = getEventArgs(event, [0]);
    const caller = getSigner(event);

    if (isEmpty(id, 'DESTROY')) {
        return;
    }

    const final = await getCollectionOrElseCreate(id.toString(), caller);
    final.burned = true;
    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleCollectionFreeze(event: SubstrateEvent): Promise<void> {
    const [id] = getEventArgs(event, [0]);
    const caller = getSigner(event);
    const final = await getCollectionOrElseCreate(id, caller);
    const isFreze = matchEvent(event.event, 'ClassFrozen', 'uniques');
    log('FREEZE', { id, method: event.event.method, section: event.event.section, freeze: isFreze });
    final.frozen = isFreze;
    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleCollectionTransfer(event: SubstrateEvent): Promise<void> {
    const [id, newOwner] = getEventArgs(event, [0]);
    const caller = getSigner(event);
    const final = await getCollectionOrElseCreate(id, caller);
    final.currentOwner = newOwner;
    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleCollectionPermission(event: SubstrateEvent): Promise<void> {
    const [id, newIssuer, newAdmin, newFreezer] = getEventArgs(event, [0]);
    const caller = getSigner(event);
    const final = await getCollectionOrElseCreate(id.toString(), caller);
    log('ROOT', { id, newIssuer, newAdmin, newFreezer });
    final.admin = newAdmin;
    final.issuer = newIssuer;
    final.freezer = newFreezer;
    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleAttributeSet(event: SubstrateEvent): Promise<void> {
    const [id, tokenId, key, value] = getEventArgs(event, [0,1]);
    const caller = getSigner(event);
    log('ATTRIBUTE_SET', { id, tokenId, key, value })
    if (tokenId) {
        log('TOKEN_ATTRIBUTE_SET', { id, tokenId, key, value })  
    } else {
        const final = await getCollectionOrElseCreate(id.toString(), caller);
        const alreadyDefined = final.attributes.findIndex(a => a.key === key)
        if (alreadyDefined >= 0) {
            final.attributes[alreadyDefined].value = value;
        } else {
            final.attributes.push({ key, value });
        }
        await final.save();
    }
}

export async function handleAttributeClear(event: SubstrateEvent): Promise<void> {
    const [id, tokenId, key] = getEventArgs(event, [0]);
    const caller = getSigner(event);
    log('ATTRIBUTE_CLEAR', { id, tokenId, key })
    if (tokenId) {
        log('TOKEN_ATTRIBUTE_CLEAR', { id, tokenId, key })  
    } else {
        const final = await getCollectionOrElseCreate(id.toString(), caller);
        const alreadyDefined = final.attributes.findIndex(a => a.key === key)
        if (alreadyDefined >= 0) {
            final.attributes.splice(alreadyDefined, 1)   
        }
        await final.save();
    }
}

export async function handleTokenCreate(event: SubstrateEvent): Promise<void> {
    const token = processToken(event.extrinsic);
    const [collectionId, id, owner] = getEventArgs(event, [0, 1]);
    log('MINT', token)
    if (!collectionId || !id) {
        logger.warn("No collection/token ID found in extrinsic");
        return;
    }

    const final = await getTokenOrElseCreate(createTokenId(collectionId, id), token.caller);
    final.currentOwner = owner;
    final.id = createTokenId(collectionId, id);
    final.blockNumber = BigInt(token.blockNumber);
    final.collectionId = collectionId;
    

    logger.info(`SAVED [TOKEN] ${final.id}`)
    await final.save();
}

export async function handleTokenTransfer(event: SubstrateEvent): Promise<void> {
    const [collectionId, id, from, to] = getEventArgs(event, [0, 1]);
    const final = await getTokenOrElseCreate(createTokenId(collectionId, id), from);
    final.currentOwner = to;
    logger.info(`SAVED [TOKEN] ${final.id}`)
    await final.save();
}

export async function handleTokenBurn(event: SubstrateEvent): Promise<void> {
    const [collectionId, id] = getEventArgs(event, [0,1]);
    const caller = getSigner(event);
    const final = await getTokenOrElseCreate(createTokenId(collectionId, id), caller);

    final.burned = true;
    logger.info(`SAVED [TOKEN] ${final.id}`)
    await final.save();
}

export async function handleTokenFreeze(event: SubstrateEvent): Promise<void> {
    const [collectionId, id] = getEventArgs(event, [0,1]);
    const caller = getSigner(event);
    const final = await getTokenOrElseCreate(createTokenId(collectionId, id), caller);
    const isFreze = matchEvent(event.event, 'Frozen', 'uniques');
    log('FREEZE', { id, method: event.event.method, section: event.event.section, freeze: isFreze });
    final.frozen = isFreze;
    logger.info(`SAVED [TOKEN] ${final.id}`)
    await final.save();
}

export async function handleTokenMetadata(event: SubstrateEvent): Promise<void> {
    const [collectionId, id, metadata, frozen] = getEventArgs(event, [0, 1]);
    const caller = getSigner(event);
    log('TOKEN METADATA', { id, metadata, frozen })
    if (isEmpty(id, 'Collection Metadata')) {
        return;
    }

    const final = await getTokenOrElseCreate(createTokenId(collectionId, id), caller);

    final.metadata = metadata;
    final.metadataFrozen = frozen === 'true'; 

    logger.info(`SAVED [TOKEN] ${final.id}`)
    await final.save();
}

export async function handleTokenMetadataClear(event: SubstrateEvent): Promise<void> {
    const [collectionId, id] = getEventArgs(event, [0, 1]);
    const caller = getSigner(event);
    const final = await getTokenOrElseCreate(createTokenId(collectionId, id), caller);
    log('TOKEN METADATA CLEAR', { id })
    final.metadata = null;
    final.metadataFrozen = null;
    logger.info(`SAVED [TOKEN] ${final.id}`)
    await final.save();
}

