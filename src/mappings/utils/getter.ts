import { CollectionEntity, NFTEntity } from '../../types';

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
  });
  
}

export async function getTokenOrElseCreate(id: string, caller: string): Promise<NFTEntity> {
  const instance = await NFTEntity.get(id);
  if (instance) {
    return instance;
  }
  return NFTEntity.create({
    id,
    issuer: caller,
    currentOwner: caller,
    burned: false,
    frozen: false,
    attributes: [],
  });
  
}