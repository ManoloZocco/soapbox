import { z } from 'zod';

import { useAppDispatch, useLoading } from 'soapbox/hooks';

import { importEntities } from '../actions';

import { parseEntitiesPath } from './utils';

import type { Entity } from '../types';
import type { EntityCallbacks, EntityFn, EntitySchema, ExpandedEntitiesPath } from './types';

interface UseCreateEntityOpts<TEntity extends Entity = Entity> {
  schema?: EntitySchema<TEntity>
}

function useCreateEntity<TEntity extends Entity = Entity, Data = unknown>(
  expandedPath: ExpandedEntitiesPath,
  entityFn: EntityFn<Data>,
  opts: UseCreateEntityOpts<TEntity> = {},
) {
  const dispatch = useAppDispatch();

  const [isLoading, setPromise] = useLoading();
  const { entityType, listKey } = parseEntitiesPath(expandedPath);

  async function createEntity(data: Data, callbacks: EntityCallbacks<TEntity> = {}): Promise<void> {
    try {
      const result = await setPromise(entityFn(data));
      const schema = opts.schema || z.custom<TEntity>();
      const entity = schema.parse(result.data);

      // TODO: optimistic updating
      dispatch(importEntities([entity], entityType, listKey));

      if (callbacks.onSuccess) {
        callbacks.onSuccess(entity);
      }
    } catch (error) {
      if (callbacks.onError) {
        callbacks.onError(error);
      }
    }
  }

  return {
    createEntity,
    isLoading,
  };
}

export { useCreateEntity };