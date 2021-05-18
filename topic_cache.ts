export {};

export interface TopicMeta {
    name: string,
    activePage: number,
    lastIndex: number,
    pageSize: number,
    folder: string,
}

export interface TopicCacheValue {
  topicMeta: TopicMeta;
}

export type TopicCache = Record<string, TopicCacheValue>

export const topicCache: () => TopicCache = () => ({});

