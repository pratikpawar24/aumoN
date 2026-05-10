import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('aumo_theme') || 'dark'
  );

  useEffect(() => {
    const root = document.documentElement;
    // Tailwind dark-variant class
    root.classList.toggle('dark', theme === 'dark');
    // Belt-and-suspenders: data attribute so CSS-var rules can target either.
    root.setAttribute('data-theme', theme);
    // Sync color-scheme so the browser also picks correct scrollbar / form
    // colors out-of-the-box.
    root.style.colorScheme = theme;
    localStorage.setItem('aumo_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const setLight = () => setTheme('light');
  const setDark = () => setTheme('dark');

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setLight, setDark, isDark: theme === 'dark' }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
