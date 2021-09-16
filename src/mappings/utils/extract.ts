import { Call as TCall } from "@polkadot/types/interfaces";
import { EventRecord, Event } from '@polkadot/types/interfaces';
import { SubstrateExtrinsic, SubstrateEvent } from "@subql/types";
import { Codec } from '@polkadot/types/types';
import { BasicExtrinsicData, Collection, CollectionMetadata, Interaction, Token } from './types';
import { createTokenId, isCreateCollection, isCreateToken, isTokenClassCreated, isTokenMinted, tokenIdOf } from './helpers';

export const log = (title: string, arg: any) => logger.info(`[${title}] ${JSON.stringify(arg, null, 2)}` )

export const getEvents = (records: EventRecord[], cb: (record: EventRecord) => boolean): string[] => {
  const eventRecord = records.find(cb);
  if (eventRecord) {
    return getArgs(eventRecord.event.data);
  }

  return []
}

const getCollectionEvents = (records: EventRecord[]): string | undefined => {
  return getEvents(records, isTokenClassCreated)[1];
}

const getTokenEvents = (records: EventRecord[]): string[] => {
  return getEvents(records, isTokenMinted);
}


export const getEventArgs = (event: SubstrateEvent, skip: number[] = []): string[] => {
  const {event: { data }} = event;
  return getArgs(data, skip);
}


export const getArgs = (args: Codec[], skip: number[] = []): string[] => {
  // logger.info(`getArgs ${args.toString()}`)
  const cb = (arg: Codec, index: number) => !skip.includes(index) ? arg.toHuman()?.toString() : arg.toString();
  return args.map(cb);
}

export const getSigner = (event: SubstrateEvent): string => {
  const {extrinsic: { extrinsic }} = event;
  return extrinsic.signer.toString();
}

export const getBasicData = (extrinsic: SubstrateExtrinsic): BasicExtrinsicData => {
  if (!extrinsic.success) {
    return {} as BasicExtrinsicData;
  }

  const signer = extrinsic.extrinsic.signer.toString();
  const blockNumber = extrinsic.block.block.header.number.toString()
  const timestamp = extrinsic.block.timestamp;

  return {
    caller: signer,
    blockNumber,
    timestamp,
  }
}

export const processCollection = (extrinsic: SubstrateExtrinsic): Collection => {
  // if (!isCreateCollection(extrinsic.extrinsic.method as TCall)) {
  //   logger.error(`[COLLECTION] ${extrinsic.extrinsic.method.toString()} is not a create collection`);
  //   return;
  // }

  const data = getBasicData(extrinsic);
  const [id, admin] = getArgs(extrinsic.extrinsic.args);

  return {
    ...data,
    id,
    admin,
  }

}

export const processMetada = (extrinsic: SubstrateExtrinsic): CollectionMetadata => {
  // DEV: TODO: handle correctly metadata for NFT
  // if (!isCreateCollection(extrinsic.extrinsic.method as TCall)) {
  //   logger.error(`[COLLECTION] ${extrinsic.extrinsic.method.toString()} is not a create collection`);
  //   return;
  // }

  const data = getBasicData(extrinsic);
  const [id, metadata, frozen] = getArgs(extrinsic.extrinsic.args);

  return {
    ...data,
    id,
    metadata,
    frozen: !!frozen, // DEV: Could be string ('true')
  }
}



export const processToken = (extrinsic: SubstrateExtrinsic): Token => {
  // if (!isCreateToken(extrinsic.extrinsic.method as TCall)) {
  //   logger.error(`[TOKEN] ${extrinsic.extrinsic.method.toString()} is not a create NFT`);
  //   return;
  // }

  const data = getBasicData(extrinsic);
  const [collectionId, id, owner] = getArgs(extrinsic.extrinsic.args);

  return {
    ...data,
    id,
    owner,
    collectionId
  }
}

export const processTransfer = (extrinsic: SubstrateExtrinsic): Interaction => {
  const data = getBasicData(extrinsic);
  const args = getArgs(extrinsic.extrinsic.args);

  return {
    ...data,
    id: tokenIdOf(args[1]),
    value: args[0],
  }
}

export const processBurn = (extrinsic: SubstrateExtrinsic): Interaction => {
  const data = getBasicData(extrinsic);
  const args = getArgs(extrinsic.extrinsic.args);

  return {
    ...data,
    id: tokenIdOf(args[0]),
    value: ''
  }
}