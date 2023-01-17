import * as OfflinePluginRuntime from '@lcdp/offline-plugin/runtime';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { defineMessages } from 'react-intl';

import { setSwUpdating } from 'soapbox/actions/sw';
import * as BuildConfig from 'soapbox/build-config';
import { store } from 'soapbox/store';
import { printConsoleWarning } from 'soapbox/utils/console';

import '@fontsource/inter/200.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/900.css';
import '@fontsource/roboto-mono/400.css';
import 'line-awesome/dist/font-awesome-line-awesome/css/all.css';
import 'react-datepicker/dist/react-datepicker.css';

import '../soapbox/iframe';
import '../styles/application.scss';

import './precheck';
import { default as Soapbox } from './containers/soapbox';
import * as monitoring from './monitoring';
import * as perf from './performance';
import ready from './ready';
import toast from './toast';

const messages = defineMessages({
  update: { id: 'sw.update', defaultMessage: 'Update' },
  updateText: { id: 'sw.update_text', defaultMessage: 'An update is available.' },
});

perf.start('main()');

// Sentry
monitoring.start();

// Print console warning
if (BuildConfig.NODE_ENV === 'production') {
  printConsoleWarning();
}

ready(() => {
  const container = document.getElementById('soapbox') as HTMLElement;
  const root = createRoot(container);

  root.render(<Soapbox />);

  if (BuildConfig.NODE_ENV === 'production') {
    // avoid offline in dev mode because it's harder to debug
    // https://github.com/NekR/offline-plugin/pull/201#issuecomment-285133572
    OfflinePluginRuntime.install({
      onUpdateReady: function() {
        toast.info(messages.updateText, {
          actionLabel: messages.update,
          action: () => {
            store.dispatch(setSwUpdating(true));
            OfflinePluginRuntime.applyUpdate();
          },
          duration: Infinity,
        });
      },
      onUpdated: function() {
        window.location.reload();
      },
    });
  }
  perf.stop('main()');
});