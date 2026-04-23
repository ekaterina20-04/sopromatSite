import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Layout.module.css';

interface Props {
  children: ReactNode;
}

export function Layout({ children }: Props) {
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
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
