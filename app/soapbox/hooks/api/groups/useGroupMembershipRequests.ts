import { Entities } from 'soapbox/entity-store/entities';
import { useEntities, useIncrementEntity } from 'soapbox/entity-store/hooks';
import { useApi } from 'soapbox/hooks/useApi';
import { accountSchema } from 'soapbox/schemas';

import type { ExpandedEntitiesPath } from 'soapbox/entity-store/hooks/types';

function useGroupMembershipRequests(groupId: string) {
  const api = useApi();
  const path: ExpandedEntitiesPath = [Entities.ACCOUNTS, 'membership_requests', groupId];

  const { entities, invalidate, ...rest } = useEntities(
    path,
    () => api.get(`/api/v1/groups/${groupId}/membership_requests`),
    { schema: accountSchema },
  );

  const { incrementEntity: authorize } = useIncrementEntity(path, -1, async (accountId: string) => {
    const response = await api.post(`/api/v1/groups/${groupId}/membership_requests/${accountId}/authorize`);
    invalidate();
    return response;
  });

  const { incrementEntity: reject } = useIncrementEntity(path, -1, async (accountId: string) => {
    const response = await api.post(`/api/v1/groups/${groupId}/membership_requests/${accountId}/reject`);
    invalidate();
    return response;
  });

  return {
    accounts: entities,
    authorize,
    reject,
    ...rest,
  };
}

export { useGroupMembershipRequests };