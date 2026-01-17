// src/context/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // මුලින්ම Load වෙද්දී LocalStorage එකේ තියෙනවද බලනවා
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('app-theme');
    return savedTheme === 'dark';
  });

  useEffect(() => {
    // Dark Mode එක වෙනස් වෙන හැම වෙලේම HTML එකට සහ Storage එකට දානවා
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('app-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('app-theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);