import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type FontSize = 'small' | 'medium' | 'large';

interface FontSizeContextType {
  fontSize: number;
  setFontSizeMode: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
};

interface FontSizeProviderProps {
  children: ReactNode;
}

export const FontSizeProvider: React.FC<FontSizeProviderProps> = ({ children }) => {
  const [fontSize, setFontSize] = useState<number>(14); // default medium

  const setFontSizeMode = (size: FontSize) => {
    switch (size) {
      case 'small':
        setFontSize(12);
        break;
      case 'medium':
        setFontSize(14);
        break;
      case 'large':
        setFontSize(18);
        break;
    }
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSizeMode }}>
      {children}
    </FontSizeContext.Provider>
  );
};