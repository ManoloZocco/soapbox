import { z } from 'zod';

import { Entities } from 'soapbox/entity-store/entities';
import { useEntities, useEntity } from 'soapbox/entity-store/hooks';
import { useApi } from 'soapbox/hooks';
import { groupSchema, Group } from 'soapbox/schemas/group';
import { groupRelationshipSchema, GroupRelationship } from 'soapbox/schemas/group-relationship';

import { useFeatures } from './useFeatures';

function useGroups() {
  const api = useApi();
  const features = useFeatures();

  const { entities, ...result } = useEntities<Group>(
    [Entities.GROUPS],
    () => api.get('/api/v1/groups'),
    { enabled: features.groups, schema: groupSchema },
  );
  const { relationships } = useGroupRelationships(entities.map(entity => entity.id));

  const groups = entities.map((group) => ({
    ...group,
    relationship: relationships[group.id] || null,
  }));

  return {
    ...result,
    groups,
  };
}

function useGroup(groupId: string, refetch = true) {
  const api = useApi();

  const { entity: group, ...result } = useEntity<Group>(
    [Entities.GROUPS, groupId],
    () => api.get(`/api/v1/groups/${groupId}`),
    { schema: groupSchema, refetch },
  );
  const { entity: relationship } = useGroupRelationship(groupId);

  return {
    ...result,
    group: group ? { ...group, relationship: relationship || null } : undefined,
  };
}

function useGroupRelationship(groupId: string) {
  const api = useApi();

  return useEntity<GroupRelationship>(
    [Entities.GROUP_RELATIONSHIPS, groupId],
    () => api.get(`/api/v1/groups/relationships?id[]=${groupId}`),
    { schema: z.array(groupRelationshipSchema).transform(arr => arr[0]) },
  );
}

function useGroupRelationships(groupIds: string[]) {
  const api = useApi();
  const q = groupIds.map(id => `id[]=${id}`).join('&');
  const { entities, ...result } = useEntities<GroupRelationship>(
    [Entities.GROUP_RELATIONSHIPS, ...groupIds],
    () => api.get(`/api/v1/groups/relationships?${q}`),
    { schema: groupRelationshipSchema, enabled: groupIds.length > 0 },
  );

  const relationships = entities.reduce<Record<string, GroupRelationship>>((map, relationship) => {
    map[relationship.id] = relationship;
    return map;
  }, {});

  return {
    ...result,
    relationships,
  };
}

export { useGroup, useGroups, useGroupRelationships };
