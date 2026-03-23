
import React from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useThemeStore } from '../store/themeStore';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useThemeStore();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-yellow-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all shadow-sm"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
            {theme === 'dark' ? <FiMoon className="w-5 h-5" /> : <FiSun className="w-5 h-5 text-orange-500" />}
        </button>
    );
};

export default ThemeToggle;
