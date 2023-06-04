import {
  Map as ImmutableMap,
  List as ImmutableList,
  OrderedSet as ImmutableOrderedSet,
  fromJS,
} from 'immutable';
import { createSelector } from 'reselect';

import { getSettings } from 'soapbox/actions/settings';
import { Entities } from 'soapbox/entity-store/entities';
import { getDomain } from 'soapbox/utils/accounts';
import { validId } from 'soapbox/utils/auth';
import ConfigDB from 'soapbox/utils/config-db';
import { getFeatures } from 'soapbox/utils/features';
import { shouldFilter } from 'soapbox/utils/timelines';

import type { ContextType } from 'soapbox/normalizers/filter';
import type { ReducerAccount } from 'soapbox/reducers/accounts';
import type { ReducerChat } from 'soapbox/reducers/chats';
import type { RootState } from 'soapbox/store';
import type { Filter as FilterEntity, Notification, Status, Group } from 'soapbox/types/entities';

const normalizeId = (id: any): string => typeof id === 'string' ? id : '';

const getAccountBase         = (state: RootState, id: string) => state.accounts.get(id);
const getAccountCounters     = (state: RootState, id: string) => state.accounts_counters.get(id);
const getAccountRelationship = (state: RootState, id: string) => state.relationships.get(id);
const getAccountMoved        = (state: RootState, id: string) => state.accounts.get(state.accounts.get(id)?.moved || '');
const getAccountMeta         = (state: RootState, id: string) => state.accounts_meta.get(id);
const getAccountAdminData    = (state: RootState, id: string) => state.admin.users.get(id);
const getAccountPatron       = (state: RootState, id: string) => {
  const url = state.accounts.get(id)?.url;
  return url ? state.patron.accounts.get(url) : null;
};

export const makeGetAccount = () => {
  return createSelector([
    getAccountBase,
    getAccountCounters,
    getAccountRelationship,
    getAccountMoved,
    getAccountMeta,
    getAccountAdminData,
    getAccountPatron,
  ], (base, counters, relationship, moved, meta, admin, patron) => {
    if (!base) return null;

    return base.withMutations(map => {
      if (counters) map.merge(counters);
      if (meta) {
        map.merge(meta);
        map.set('pleroma', meta.pleroma.merge(base.get('pleroma', ImmutableMap()))); // Lol, thanks Pleroma
      }
      if (relationship) map.set('relationship', relationship);
      map.set('moved', moved || null);
      map.set('patron', patron || null);
      map.setIn(['pleroma', 'admin'], admin);
    });
  });
};

const findAccountsByUsername = (state: RootState, username: string) => {
  const accounts = state.accounts;

  return accounts.filter(account => {
    return username.toLowerCase() === account?.acct.toLowerCase();
  });
};

export const findAccountByUsername = (state: RootState, username: string) => {
  const accounts = findAccountsByUsername(state, username);

  if (accounts.size > 1) {
    const me = state.me;
    const meURL = state.accounts.get(me)?.url || '';

    return accounts.find(account => {
      try {
        // If more than one account has the same username, try matching its host
        const { host } = new URL(account.url);
        const { host: meHost } = new URL(meURL);
        return host === meHost;
      } catch {
        return false;
      }
    });
  } else {
    return accounts.first();
  }
};

const toServerSideType = (columnType: string): ContextType => {
  switch (columnType) {
    case 'home':
    case 'notifications':
    case 'public':
    case 'thread':
      return columnType;
    default:
      if (columnType.includes('list:')) {
        return 'home';
      } else {
        return 'public'; // community, account, hashtag
      }
  }
};

type FilterContext = { contextType?: string };

export const getFilters = (state: RootState, query: FilterContext) => {
  return state.filters.filter((filter) => {
    return (!query?.contextType || filter.context.includes(toServerSideType(query.contextType)))
      && (filter.expires_at === null || Date.parse(filter.expires_at) > new Date().getTime());
  });
};

const escapeRegExp = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string

export const regexFromFilters = (filters: ImmutableList<FilterEntity>) => {
  if (filters.size === 0) return null;

  return new RegExp(filters.map(filter =>
    filter.keywords.map(keyword => {
      let expr = escapeRegExp(keyword.keyword);

      if (keyword.whole_word) {
        if (/^[\w]/.test(expr)) {
          expr = `\\b${expr}`;
        }

        if (/[\w]$/.test(expr)) {
          expr = `${expr}\\b`;
        }
      }

      return expr;
    }).join('|'),
  ).join('|'), 'i');
};

const checkFiltered = (index: string, filters: ImmutableList<FilterEntity>) =>
  filters.reduce((result, filter) =>
    result.concat(filter.keywords.reduce((result, keyword) => {
      let expr = escapeRegExp(keyword.keyword);

      if (keyword.whole_word) {
        if (/^[\w]/.test(expr)) {
          expr = `\\b${expr}`;
        }

        if (/[\w]$/.test(expr)) {
          expr = `${expr}\\b`;
        }
      }

      const regex = new RegExp(expr);

      if (regex.test(index)) return result.concat(filter.title);
      return result;
    }, ImmutableList<string>())), ImmutableList<string>());

type APIStatus = { id: string, username?: string };

export const makeGetStatus = () => {
  return createSelector(
    [
      (state: RootState, { id }: APIStatus) => state.statuses.get(id) as Status | undefined,
      (state: RootState, { id }: APIStatus) => state.statuses.get(state.statuses.get(id)?.reblog || '') as Status | undefined,
      (state: RootState, { id }: APIStatus) => state.accounts.get(state.statuses.get(id)?.account || '') as ReducerAccount | undefined,
      (state: RootState, { id }: APIStatus) => state.accounts.get(state.statuses.get(state.statuses.get(id)?.reblog || '')?.account || '') as ReducerAccount | undefined,
      (state: RootState, { id }: APIStatus) => state.entities[Entities.GROUPS]?.store[state.statuses.get(id)?.group || ''] as Group | undefined,
      (_state: RootState, { username }: APIStatus) => username,
      getFilters,
      (state: RootState) => state.me,
      (state: RootState) => getFeatures(state.instance),
    ],

    (statusBase, statusReblog, accountBase, accountReblog, group, username, filters, me, features) => {
      if (!statusBase || !accountBase) return null;

      const accountUsername = accountBase.acct;
      //Must be owner of status if username exists
      if (accountUsername !== username && username !== undefined) {
        return null;
      }

      if (statusReblog && accountReblog) {
        // @ts-ignore AAHHHHH
        statusReblog = statusReblog.set('account', accountReblog);
      } else {
        statusReblog = undefined;
      }

      return statusBase.withMutations((map: Status) => {
        map.set('reblog', statusReblog || null);
        // @ts-ignore :(
        map.set('account', accountBase || null);
        // @ts-ignore
        map.set('group', group || null);

        if ((features.filters) && (accountReblog || accountBase).id !== me) {
          const filtered = checkFiltered(statusReblog?.search_index || statusBase.search_index, filters);

          map.set('filtered', filtered);
        }
      });
    },
  );
};

export const makeGetNotification = () => {
  return createSelector([
    (_state: RootState, notification: Notification) => notification,
    (state: RootState, notification: Notification) => state.accounts.get(normalizeId(notification.account)),
    (state: RootState, notification: Notification) => state.accounts.get(normalizeId(notification.target)),
    (state: RootState, notification: Notification) => state.statuses.get(normalizeId(notification.status)),
  ], (notification, account, target, status) => {
    return notification.merge({
      // @ts-ignore
      account: account || null,
      // @ts-ignore
      target: target || null,
      // @ts-ignore
      status: status || null,
    });
  });
};

export const getAccountGallery = createSelector([
  (state: RootState, id: string) => state.timelines.get(`account:${id}:media`)?.items || ImmutableOrderedSet<string>(),
  (state: RootState)       => state.statuses,
  (state: RootState)       => state.accounts,
], (statusIds, statuses, accounts) => {

  return statusIds.reduce((medias: ImmutableList<any>, statusId: string) => {
    const status = statuses.get(statusId);
    if (!status) return medias;
    if (status.reblog) return medias;
    if (typeof status.account !== 'string') return medias;

    const account = accounts.get(status.account);

    return medias.concat(
      status.media_attachments.map(media => media.merge({ status, account })));
  }, ImmutableList());
});

export const getGroupGallery = createSelector([
  (state: RootState, id: string) => state.timelines.get(`group:${id}:media`)?.items || ImmutableOrderedSet<string>(),
  (state: RootState) => state.statuses,
  (state: RootState) => state.accounts,
], (statusIds, statuses, accounts) => {

  return statusIds.reduce((medias: ImmutableList<any>, statusId: string) => {
    const status = statuses.get(statusId);
    if (!status) return medias;
    if (status.reblog) return medias;
    if (typeof status.account !== 'string') return medias;

    const account = accounts.get(status.account);

    return medias.concat(
      status.media_attachments.map(media => media.merge({ status, account })));
  }, ImmutableList());
});

type APIChat = { id: string, last_message: string };

export const makeGetChat = () => {
  return createSelector(
    [
      (state: RootState, { id }: APIChat) => state.chats.items.get(id) as ReducerChat,
      (state: RootState, { id }: APIChat) => state.accounts.get(state.chats.items.getIn([id, 'account'])),
      (state: RootState, { last_message }: APIChat) => state.chat_messages.get(last_message),
    ],

    (chat, account, lastMessage) => {
      if (!chat || !account) return null;

      return chat.withMutations((map) => {
        // @ts-ignore
        map.set('account', account);
        // @ts-ignore
        map.set('last_message', lastMessage);
      });
    },
  );
};

export const makeGetReport = () => {
  const getStatus = makeGetStatus();

  return createSelector(
    [
      (state: RootState, id: string) => state.admin.reports.get(id),
      (state: RootState, id: string) => state.accounts.get(state.admin.reports.get(id)?.account || ''),
      (state: RootState, id: string) => state.accounts.get(state.admin.reports.get(id)?.target_account || ''),
      // (state: RootState, id: string) => state.accounts.get(state.admin.reports.get(id)?.action_taken_by_account || ''),
      // (state: RootState, id: string) => state.accounts.get(state.admin.reports.get(id)?.assigned_account || ''),
      (state: RootState, id: string) => ImmutableList(fromJS(state.admin.reports.get(id)?.statuses)).map(
        statusId => state.statuses.get(normalizeId(statusId)))
        .filter((s: any) => s)
        .map((s: any) => getStatus(state, s.toJS())),
    ],

    (report, account, targetAccount, statuses) => {
      if (!report) return null;
      return report.withMutations((report) => {
        // @ts-ignore
        report.set('account', account);
        // @ts-ignore
        report.set('target_account', targetAccount);
        // @ts-ignore
        report.set('statuses', statuses);
      });
    },
  );
};

const getAuthUserIds = createSelector([
  (state: RootState) => state.auth.users,
], authUsers => {
  return authUsers.reduce((ids: ImmutableOrderedSet<string>, authUser) => {
    try {
      const id = authUser.id;
      return validId(id) ? ids.add(id) : ids;
    } catch {
      return ids;
    }
  }, ImmutableOrderedSet<string>());
});

export const makeGetOtherAccounts = () => {
  return createSelector([
    (state: RootState) => state.accounts,
    getAuthUserIds,
    (state: RootState) => state.me,
  ],
  (accounts, authUserIds, me) => {
    return authUserIds
      .reduce((list: ImmutableList<any>, id: string) => {
        if (id === me) return list;
        const account = accounts.get(id);
        return account ? list.push(account) : list;
      }, ImmutableList());
  });
};

const getSimplePolicy = createSelector([
  (state: RootState) => state.admin.configs,
  (state: RootState) => state.instance.pleroma.getIn(['metadata', 'federation', 'mrf_simple'], ImmutableMap()) as ImmutableMap<string, any>,
], (configs, instancePolicy: ImmutableMap<string, any>) => {
  return instancePolicy.merge(ConfigDB.toSimplePolicy(configs));
});

const getRemoteInstanceFavicon = (state: RootState, host: string) => (
  (state.accounts.find(account => getDomain(account) === host, null) || ImmutableMap())
    .getIn(['pleroma', 'favicon'])
);

const getRemoteInstanceFederation = (state: RootState, host: string) => (
  getSimplePolicy(state)
    .map(hosts => hosts.includes(host))
);

export const makeGetHosts = () => {
  return createSelector([getSimplePolicy], (simplePolicy) => {
    return simplePolicy
      .deleteAll(['accept', 'reject_deletes', 'report_removal'])
      .reduce((acc, hosts) => acc.union(hosts), ImmutableOrderedSet())
      .sort();
  });
};

export const makeGetRemoteInstance = () => {
  return createSelector([
    (_state: RootState, host: string) => host,
    getRemoteInstanceFavicon,
    getRemoteInstanceFederation,
  ], (host, favicon, federation) => {
    return ImmutableMap({
      host,
      favicon,
      federation,
    });
  });
};

type ColumnQuery = { type: string, prefix?: string };

export const makeGetStatusIds = () => createSelector([
  (state: RootState, { type, prefix }: ColumnQuery) => getSettings(state).get(prefix || type, ImmutableMap()),
  (state: RootState, { type }: ColumnQuery) => state.timelines.get(type)?.items || ImmutableOrderedSet(),
  (state: RootState) => state.statuses,
], (columnSettings, statusIds: ImmutableOrderedSet<string>, statuses) => {
  return statusIds.filter((id: string) => {
    const status = statuses.get(id);
    if (!status) return true;
    return !shouldFilter(status, columnSettings);
  });
});

export const makeGetGroup = () => {
  return createSelector([
    (state: RootState, id: string) => state.groups.items.get(id),
    (state: RootState, id: string) => state.group_relationships.get(id),
  ], (base, relationship) => {
    if (!base) return null;

    return base.withMutations(map => {
      if (relationship) map.set('relationship', relationship);
    });
  });
};
