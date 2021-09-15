import { SubstrateExtrinsic,SubstrateEvent,SubstrateBlock } from "@subql/types";
import { CollectionEntity, NFTEntity } from "../types";
import { processCollection, log, processTransfer, processBurn, processMetada, getEventArgs, getSigner } from './utils/extract';
import { getCollectionOrElseCreate } from './utils/getter';
import { createTokenId, exists, isEmpty, matchEvent } from './utils/helpers';

export async function handleCreateCollection(event: SubstrateEvent): Promise<void> {
    const collection = processCollection(event.extrinsic)
    const [id, caller, admin] = getEventArgs(event, 0);
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
    const [id, metadata, frozen] = getEventArgs(event, 0);
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
    const [id] = getEventArgs(event, 0);
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
    const [id] = getEventArgs(event, 0);
    const caller = getSigner(event);
    const final = await getCollectionOrElseCreate(id, caller);
    const isFreze = matchEvent(event.event, 'ClassFrozen', 'uniques');
    log('FREEZE', { id, method: event.event.method, section: event.event.section, freeze: isFreze });
    final.frozen = isFreze;
    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleCollectionTransfer(event: SubstrateEvent): Promise<void> {
    const [id, newOwner] = getEventArgs(event, 0);
    const caller = getSigner(event);
    const final = await getCollectionOrElseCreate(id.toString(), caller);
    final.currentOwner = newOwner;
    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleCollectionPermission(event: SubstrateEvent): Promise<void> {
    const [id, newIssuer, newAdmin, newFreezer] = getEventArgs(event, 0);
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
    const [id, tokenId, key, value] = getEventArgs(event, 0);
    const caller = getSigner(event);
    log('ATTRIBUTE_SET', { id, tokenId, key, value })
    if (tokenId) {
        log('TOKEN_ATTRIBUTE_SET', { id, tokenId, key, value })  
    } else {
        const final = await getCollectionOrElseCreate(id.toString(), caller);
        final.attributes.push({ key, value });
        await final.save();
    }

    // const final = await NFTEntity.get(id.toString());
    // final.attributes.push({ key, value });
    // logger.info(`SAVED [COLLECTION] ${final.id}`)
    // await final.save();
}