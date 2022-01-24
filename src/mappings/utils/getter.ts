import { CollectionEntity, NFTEntity } from '../../types';
import { splitTokenId } from './helpers';

export async function getCollectionOrElseCreate(id: string, caller: string): Promise<CollectionEntity> {
  const instance = await CollectionEntity.get(id);
  if (instance) {
    return instance;
  }
  return CollectionEntity.create({
    id,
    issuer: caller,
    currentOwner: caller,
    freezer: caller,
    burned: false,
    frozen: false,
    attributes: [],
    createdAt: new Date()
  });
  
}

export async function getTokenOrElseCreate(id: string, caller: string): Promise<NFTEntity> {
  const instance = await NFTEntity.get(id);
  if (instance) {
    return instance;
  }

  const [collection, ] = splitTokenId(id)
  return NFTEntity.create({
    id,
    collectionId: collection,
    issuer: caller,
    currentOwner: caller,
    burned: false,
    frozen: false,
    attributes: [],
    createdAt: new Date()
  });
  
}

export async function collectionExist(id: string): Promise<Boolean> {
  return !!(await CollectionEntity.get(id));
}