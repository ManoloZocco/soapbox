import classNames from 'classnames';
import React from 'react';

import { useSoapboxConfig, useSettings, useSystemTheme } from 'soapbox/hooks';

interface ISiteLogo extends React.ComponentProps<'img'> {
  /** Extra class names for the <img> element. */
  className?: string,
}

/** Display the most appropriate site logo based on the theme and configuration. */
const SiteLogo: React.FC<ISiteLogo> = ({ className, ...rest }) => {
  const { logo, logoDarkMode } = useSoapboxConfig();
  const settings = useSettings();

  const systemTheme = useSystemTheme();
  const userTheme = settings.get('themeMode');
  const darkMode = userTheme === 'dark' || (userTheme === 'system' && systemTheme === 'dark');

  /** Soapbox logo. */
  const soapboxLogo = darkMode
    ? require('images/soapbox-logo-white.svg')
    : require('images/soapbox-logo.svg');

  /** Invisible image. */
  // https://stackoverflow.com/a/30290529/8811886
  const empty = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';

  /** Use the right logo if provided, then use fallbacks. */
  const getSrc = () => {
    // In demo mode, use the Soapbox logo.
    if (settings.get('demo')) return soapboxLogo;

    return (darkMode && logoDarkMode)
      ? logoDarkMode
      : logo || logoDarkMode || empty;
  };

  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      className={classNames('object-contain', className)}
      src={getSrc()}
      {...rest}
    />
  );
};

export default SiteLogo;
