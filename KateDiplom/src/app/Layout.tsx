import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { HamburgerIcon, MoonIcon, SunIcon } from '@chakra-ui/icons';
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { useTheme } from './providers/useTheme';
import styles from './Layout.module.css';

interface Props {
  children: ReactNode;
}

const navItems = [
  { to: '/calculator', label: 'Калькулятор' },
  { to: '/theory', label: 'Теория' },
  { to: '/scenarios', label: 'Сценарии' },
  { to: '/trainer', label: 'Тренажер' },
];

export function Layout({ children }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isLight = theme === 'light';

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/calculator" className={styles.logo}>
            SopromatLab
          </NavLink>
          <nav className={styles.nav}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            className={styles.menuButton}
            type="button"
            onClick={onOpen}
            aria-label="Открыть меню"
          >
            <HamburgerIcon boxSize={5} />
          </button>
          <button
            className={styles.themeToggle}
            type="button"
            onClick={toggleTheme}
            aria-label={isLight ? 'Включить темную тему' : 'Включить светлую тему'}
            title={isLight ? 'Темная тема' : 'Светлая тема'}
          >
            {isLight ? <MoonIcon boxSize={4} /> : <SunIcon boxSize={4} />}
            <span>{isLight ? 'Темная' : 'Светлая'}</span>
          </button>
        </div>
      </header>

      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent bg="var(--color-bg-card)" color="var(--color-text)">
          <DrawerCloseButton top="0.75rem" right="0.75rem" />
          <DrawerHeader borderBottomWidth="1px" borderColor="var(--color-border)">
            SopromatLab
          </DrawerHeader>
          <DrawerBody padding="1rem">
            <nav className={styles.drawerNav}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `${styles.drawerNavLink} ${isActive ? styles.drawerNavLinkActive : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
