import { Entities } from 'soapbox/entity-store/entities.ts';
import { useEntityActions } from 'soapbox/entity-store/hooks/index.ts';

import type { Account, Group, GroupMember } from 'soapbox/schemas/index.ts';

function useBlockGroupMember(group: Group, account: Account) {
  const { createEntity } = useEntityActions<GroupMember>(
    [Entities.GROUP_MEMBERSHIPS, account.id],
    { post: `/api/v1/groups/${group?.id}/blocks` },
  );

  return createEntity;
}

export { useBlockGroupMember };