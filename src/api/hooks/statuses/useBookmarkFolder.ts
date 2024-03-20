import { Entities } from 'soapbox/entity-store/entities';
import { selectEntity } from 'soapbox/entity-store/selectors';
import { useAppSelector } from 'soapbox/hooks';
import { type BookmarkFolder } from 'soapbox/schemas/bookmark-folder';

import { useBookmarkFolders } from './useBookmarkFolders';

function useBookmarkFolder(folderId?: string) {
  useBookmarkFolders();

  const folder = useAppSelector(state => folderId
    ? selectEntity<BookmarkFolder>(state, Entities.BOOKMARK_FOLDERS, folderId)
    : undefined);

  return folder;
}

export { useBookmarkFolder };
