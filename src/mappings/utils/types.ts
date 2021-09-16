export interface BasicExtrinsicData {
  caller: string;
  blockNumber: string;
  timestamp: Date;
}

export interface ExtrinsicData extends BasicExtrinsicData {
  id: string;
}

export interface Collection extends ExtrinsicData {
  admin: string;
}

export interface CollectionMetadata extends ExtrinsicData {
  metadata: string;
  frozen: boolean;
}

export interface Token extends ExtrinsicData {
  owner: string;
  collectionId: string;
}

export interface Interaction extends BasicExtrinsicData {
  id: string;
  value: string;
}

export type Some<T> = T | undefined;