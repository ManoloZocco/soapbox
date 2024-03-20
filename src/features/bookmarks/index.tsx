import { OrderedSet as ImmutableOrderedSet } from 'immutable';
import debounce from 'lodash/debounce';
import React from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { fetchBookmarkedStatuses, expandBookmarkedStatuses } from 'soapbox/actions/bookmarks';
import { useBookmarkFolder } from 'soapbox/api/hooks';
import PullToRefresh from 'soapbox/components/pull-to-refresh';
import StatusList from 'soapbox/components/status-list';
import { Column } from 'soapbox/components/ui';
import { useAppSelector, useAppDispatch } from 'soapbox/hooks';

const messages = defineMessages({
  heading: { id: 'column.bookmarks', defaultMessage: 'Bookmarks' },
});

const handleLoadMore = debounce((dispatch, folderId) => {
  dispatch(expandBookmarkedStatuses(folderId));
}, 300, { leading: true });

interface IBookmarks {
  params?: {
    id?: string;
  };
}

const Bookmarks: React.FC<IBookmarks> = ({ params }) => {
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const folderId = params?.id;

  const folder = useBookmarkFolder(folderId);

  const bookmarksKey = folderId ? `bookmarks:${folderId}` : 'bookmarks';

  const statusIds = useAppSelector((state) => state.status_lists.get(bookmarksKey)?.items || ImmutableOrderedSet<string>());
  const isLoading = useAppSelector((state) => state.status_lists.get(bookmarksKey)?.isLoading === true);
  const hasMore = useAppSelector((state) => !!state.status_lists.get(bookmarksKey)?.next);

  React.useEffect(() => {
    dispatch(fetchBookmarkedStatuses(folderId));
  }, []);

  const handleRefresh = () => {
    return dispatch(fetchBookmarkedStatuses(folderId));
  };

  const emptyMessage = <FormattedMessage id='empty_column.bookmarks' defaultMessage="You don't have any bookmarks yet. When you add one, it will show up here." />;

  return (
    <Column label={folder ? folder.name : intl.formatMessage(messages.heading)} transparent>
      <PullToRefresh onRefresh={handleRefresh}>
        <StatusList
          statusIds={statusIds}
          scrollKey='bookmarked_statuses'
          hasMore={hasMore}
          isLoading={typeof isLoading === 'boolean' ? isLoading : true}
          onLoadMore={() => handleLoadMore(dispatch, folderId)}
          emptyMessage={emptyMessage}
          divideType='space'
        />
      </PullToRefresh>
    </Column>
  );
};

export default Bookmarks;
