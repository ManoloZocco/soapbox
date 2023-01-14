import React from 'react';
import { FormattedNumber } from 'react-intl';
import { Link } from 'react-router-dom';

import { Text } from 'soapbox/components/ui';
import { isNumber } from 'soapbox/utils/numbers';

interface IDashCounter {
  count: number | undefined
  label: React.ReactNode
  to?: string
  percent?: boolean
}

/** Displays a (potentially clickable) dashboard statistic. */
const DashCounter: React.FC<IDashCounter> = ({ count, label, to = '#', percent = false }) => {

  if (!isNumber(count)) {
    return null;
  }

  return (
    <Link
      className='bg-gray-200 dark:bg-gray-800 p-4 rounded flex flex-col items-center space-y-2 hover:-translate-y-1 transition-transform cursor-pointer'
      to={to}
    >
      <Text align='center' size='2xl' weight='medium'>
        <FormattedNumber
          value={count}
          style={percent ? 'unit' : undefined}
          unit={percent ? 'percent' : undefined}
        />
      </Text>
      <Text align='center'>
        {label}
      </Text>
    </Link>
  );
};

interface IDashCounters {
  children: React.ReactNode
}

/** Wrapper container for dash counters. */
const DashCounters: React.FC<IDashCounters> = ({ children }) => {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
      {children}
    </div>
  );
};

export {
  DashCounter,
  DashCounters,
};