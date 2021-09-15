import { SubstrateExtrinsic,SubstrateEvent,SubstrateBlock } from "@subql/types";
import { CollectionEntity, NFTEntity } from "../types";
import { processCollection, log, processTransfer, processBurn, processMetada, getEventArgs } from './utils/extract';
import { createTokenId, exists } from './utils/helpers';

export async function handleCreateCollection(event: SubstrateEvent): Promise<void> {
    const collection = processCollection(event.extrinsic)
    const [id, caller, admin] = getEventArgs(event);
    log('CREATE', { id, caller, admin });
    if (!id) {
        logger.warn("No collection ID found in extrinsic");
        return;
    }

    const final = CollectionEntity.create(collection);
    final.id = id;
    final.issuer = caller;
    final.currentOwner = caller;
    final.admin = admin;
    final.freezer = caller;
    final.attributes = [];
    final.burned = false;
    final.frozen = false;
    

    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleCollectionMetadata(event: SubstrateEvent): Promise<void> {
    const {event: {data: [id, metadata, frozen]}} = event;

    log('METADATA', { id, metadata, frozen })
    if (!id) {
        logger.warn("No collection ID found in extrinsic");
        return;
    }

    const final = await CollectionEntity.get(id.toString());
    
    if (!exists(final)) {
        logger.error(`Collection ${id} does not exist`);
        return;
    }

    final.metadata = metadata.toHuman().toString();
    final.metadataFrozen = frozen.toHuman() as boolean;
    

    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleCollectionDestroy(event: SubstrateEvent): Promise<void> {
    const [id] = getEventArgs(event);
    const final = await CollectionEntity.get(id);
    final.burned = true;
    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleCollectionFreeze(event: SubstrateEvent): Promise<void> {
    const [id] = getEventArgs(event);
    const final = await CollectionEntity.get(id);
    final.frozen = true; // TODO: decide based on method
    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleCollectionTransfer(event: SubstrateEvent): Promise<void> {
    const [id, newOwner] = getEventArgs(event);
    const final = await CollectionEntity.get(id);
    final.currentOwner = newOwner;
    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleCollectionPermission(event: SubstrateEvent): Promise<void> {
    const [id, newIssuer, newAdmin, newFreezer] = getEventArgs(event);
    const final = await CollectionEntity.get(id);
    final.admin = newAdmin;
    final.issuer = newIssuer;
    final.freezer = newFreezer;
    logger.info(`SAVED [COLLECTION] ${final.id}`)
    await final.save();
}

export async function handleAttributeSet(event: SubstrateEvent): Promise<void> {
    const [id, tokenId, key, value] = getEventArgs(event);
    log('ATTRIBUTE_SET', { id, tokenId, key, value })
    if (tokenId.toString()) {
    }

    // const final = await NFTEntity.get(id.toString());
    // final.attributes.push({ key, value });
    // logger.info(`SAVED [COLLECTION] ${final.id}`)
    // await final.save();
}