import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useTheme } from './providers/useTheme';
import styles from './Layout.module.css';

interface Props {
  children: ReactNode;
}

export function Layout({ children }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/calculator" className={styles.logo}>
            SopromatLab
          </NavLink>
          <nav className={styles.nav}>
            <NavLink
              to="/calculator"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              Калькулятор
            </NavLink>
            <NavLink
              to="/theory"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              Теория
            </NavLink>
            <NavLink
              to="/scenarios"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              Сценарии
            </NavLink>
            <NavLink
              to="/trainer"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              Тренажёр
            </NavLink>
          </nav>
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
      <main className={styles.main}>{children}</main>
    </div>
  );
}
