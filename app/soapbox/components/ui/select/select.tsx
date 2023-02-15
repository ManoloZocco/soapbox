import clsx from 'clsx';
import React from 'react';

interface ISelect extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: Iterable<React.ReactNode>
}

/** Multiple-select dropdown. */
const Select = React.forwardRef<HTMLSelectElement, ISelect>((props, ref) => {
  const { children, className, ...filteredProps } = props;

  return (
    <select
      ref={ref}
      className={clsx(
        'focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-500 dark:focus:ring-primary-500 w-full truncate rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:outline-none disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:ring-1 dark:ring-gray-800 sm:text-sm',
        className,
      )}
      {...filteredProps}
    >
      {children}
    </select>
  );
});

export default Select;
