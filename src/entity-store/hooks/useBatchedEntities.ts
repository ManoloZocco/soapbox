import { useEffect } from 'react';
import { z } from 'zod';

import { useAppDispatch } from 'soapbox/hooks/useAppDispatch.ts';
import { useAppSelector } from 'soapbox/hooks/useAppSelector.ts';
import { useGetState } from 'soapbox/hooks/useGetState.ts';
import { filteredArray } from 'soapbox/schemas/utils.ts';

import { entitiesFetchFail, entitiesFetchRequest, entitiesFetchSuccess } from '../actions.ts';
import { selectCache, selectListState, useListState } from '../selectors.ts';

import { parseEntitiesPath } from './utils.ts';

import type { EntitiesPath, EntityFn, EntitySchema, ExpandedEntitiesPath } from './types.ts';
import type { Entity } from '../types.ts';
import type { RootState } from 'soapbox/store.ts';

interface UseBatchedEntitiesOpts<TEntity extends Entity> {
  schema?: EntitySchema<TEntity>;
  enabled?: boolean;
}

function useBatchedEntities<TEntity extends Entity>(
  expandedPath: ExpandedEntitiesPath,
  ids: string[],
  entityFn: EntityFn<string[]>,
  opts: UseBatchedEntitiesOpts<TEntity> = {},
) {
  const getState = useGetState();
  const dispatch = useAppDispatch();
  const { entityType, listKey, path } = parseEntitiesPath(expandedPath);
  const schema = opts.schema || z.custom<TEntity>();

  const isEnabled = opts.enabled ?? true;
  const isFetching = useListState(path, 'fetching');
  const lastFetchedAt = useListState(path, 'lastFetchedAt');
  const isFetched = useListState(path, 'fetched');
  const isInvalid = useListState(path, 'invalid');
  const error = useListState(path, 'error');

  /** Get IDs of entities not yet in the store. */
  const filteredIds = useAppSelector((state) => {
    const cache = selectCache(state, path);
    if (!cache) return ids;
    return ids.filter((id) => !cache.store[id]);
  });

  const entityMap = useAppSelector((state) => selectEntityMap<TEntity>(state, path, ids));

  async function fetchEntities() {
    const isFetching = selectListState(getState(), path, 'fetching');
    if (isFetching) return;

    dispatch(entitiesFetchRequest(entityType, listKey));
    try {
      const response = await entityFn(filteredIds);
      const json = await response.json();
      const entities = filteredArray(schema).parse(json);
      dispatch(entitiesFetchSuccess(entities, entityType, listKey, 'end', {
        next: undefined,
        prev: undefined,
        totalCount: undefined,
        fetching: false,
        fetched: true,
        error: null,
        lastFetchedAt: new Date(),
        invalid: false,
      }));
    } catch (e) {
      dispatch(entitiesFetchFail(entityType, listKey, e));
    }
  }

  useEffect(() => {
    if (filteredIds.length && isEnabled) {
      fetchEntities();
    }
  }, [filteredIds.length]);

  return {
    entityMap,
    isFetching,
    lastFetchedAt,
    isFetched,
    isError: !!error,
    isInvalid,
  };
}

function selectEntityMap<TEntity extends Entity>(
  state: RootState,
  path: EntitiesPath,
  entityIds: string[],
): Record<string, TEntity> {
  const cache = selectCache(state, path);

  return entityIds.reduce<Record<string, TEntity>>((result, id) => {
    const entity = cache?.store[id];
    if (entity) {
      result[id] = entity as TEntity;
    }
    return result;
  }, {});
}

export { useBatchedEntities };