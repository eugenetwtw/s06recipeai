'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/i18n/I18nContext';

const LanguageSelector: React.FC = () => {
  const { locale, setLocale, t, availableLocales } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('common.language')}
      >
        <span>{t('common.language')}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 py-1 border border-gray-200"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="language-menu"
        >
          {Object.entries(availableLocales).map(([code, name]) => (
            <button
              key={code}
              onClick={() => handleLanguageChange(code)}
              className={`block w-full text-left px-4 py-2 text-sm ${
                locale === code ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
              role="menuitem"
              aria-current={locale === code ? 'true' : 'false'}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
