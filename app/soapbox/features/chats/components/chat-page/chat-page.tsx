import classNames from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
import { matchPath, Route, Switch, useHistory } from 'react-router-dom';

import { Stack } from 'soapbox/components/ui';
import { useOwnAccount } from 'soapbox/hooks';

import ChatPageMain from './components/chat-page-main';
import ChatPageNew from './components/chat-page-new';
import ChatPageSettings from './components/chat-page-settings';
import ChatPageSidebar from './components/chat-page-sidebar';
import Welcome from './components/welcome';

interface IChatPage {
  chatId?: string,
}

const ChatPage: React.FC<IChatPage> = ({ chatId }) => {
  const account = useOwnAccount();
  const history = useHistory();

  const isOnboarded = account?.chats_onboarded;

  const path = history.location.pathname;
  const isSidebarHidden = matchPath(path, {
    path: ['/chats/settings', '/chats/new', '/chats/:chatId'],
    exact: true,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<string | number>('100%');

  const calculateHeight = () => {
    if (!containerRef.current) {
      return null;
    }

    const { top } = containerRef.current.getBoundingClientRect();
    const fullHeight = document.body.offsetHeight;

    // On mobile, account for bottom navigation.
    const offset = document.body.clientWidth < 976 ? -61 : 0;

    setHeight(fullHeight - top + offset);
  };

  useEffect(() => {
    calculateHeight();
  }, [containerRef.current]);

  useEffect(() => {
    window.addEventListener('resize', calculateHeight);

    return () => {
      window.removeEventListener('resize', calculateHeight);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className='h-screen bg-white dark:bg-primary-900 text-gray-900 dark:text-gray-100 shadow-lg dark:shadow-none overflow-hidden sm:rounded-t-xl'
    >
      {isOnboarded ? (
        <div
          className='grid grid-cols-9 overflow-hidden h-full dark:divide-x-2 dark:divide-solid dark:divide-gray-800'
          data-testid='chat-page'
        >
          <Stack
            className={classNames('col-span-9 sm:col-span-3 bg-gradient-to-r from-white to-gray-100 dark:bg-gray-900 dark:bg-none overflow-hidden dark:inset', {
              'hidden sm:block': isSidebarHidden,
            })}
          >
            <ChatPageSidebar />
          </Stack>

          <Stack
            className={classNames('col-span-9 sm:col-span-6 h-full overflow-hidden', {
              'hidden sm:block': !isSidebarHidden,
            })}
          >
            <Switch>
              <Route path='/chats/new'>
                <ChatPageNew />
              </Route>
              <Route path='/chats/settings'>
                <ChatPageSettings />
              </Route>
              <Route>
                <ChatPageMain />
              </Route>
            </Switch>
          </Stack>
        </div>
      ) : (
        <Welcome />
      )}
    </div>
  );
};

export default ChatPage;
