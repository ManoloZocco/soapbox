import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  MenuPopover,
  MenuLink,
  MenuListProps,
} from '@reach/menu-button';
import { positionDefault, positionRight } from '@reach/popover';
import classNames from 'clsx';
import React from 'react';

import './menu.css';

interface IMenuList extends Omit<MenuListProps, 'position'> {
  /** Position of the dropdown menu. */
  position?: 'left' | 'right'
  className?: string
}

/** Renders children as a dropdown menu. */
const MenuList: React.FC<IMenuList> = (props) => {
  const { position, className, ...filteredProps } = props;

  return (
    <MenuPopover position={props.position === 'left' ? positionDefault : positionRight}>
      <MenuItems
        onKeyDown={(event) => event.nativeEvent.stopImmediatePropagation()}
        className={
          classNames(className, 'py-1 bg-white dark:bg-primary-900 rounded-lg shadow-menu')
        }
        {...filteredProps}
      />
    </MenuPopover>
  );
};

/** Divides menu items. */
const MenuDivider = () => <hr />;

export { Menu, MenuButton, MenuDivider, MenuItems, MenuItem, MenuList, MenuLink };
