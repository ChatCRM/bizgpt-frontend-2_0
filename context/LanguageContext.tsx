// context/LanguageContext.tsx
import React, { createContext, useState, useEffect, ReactNode, FC } from 'react'
import GlobalConfig from '@/app/app.config.js'

interface LanguageContextProps {
  language: string
  setLanguage: (language: string) => void
  direction: 'ltr' | 'rtl'
}

const LanguageContext = createContext<LanguageContextProps | undefined>(
  undefined
)

interface LanguageProviderProps {
  children: ReactNode
}

const LanguageProvider: FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<string>(GlobalConfig.LANG || 'en')
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr')

  useEffect(() => {
    if (language) {
      setDirection(language.toLowerCase() == 'fa' ? 'rtl' : 'ltr')
      document.documentElement.style.setProperty('--text-direction', direction)
      document.documentElement.style.setProperty(
        '--list-padding-left',
        direction == 'rtl' ? '0' : '1.625em' || '0'
      )
      document.documentElement.style.setProperty(
        '--list-padding-right',
        direction == 'rtl' ? '1.625em' : '0' || '1.625em'
      )
    }
  }, [language, direction])

  return (  
    <LanguageContext.Provider value={{ language, setLanguage, direction }}>
      {children}
    </LanguageContext.Provider>
  )
}

export { LanguageContext, LanguageProvider }
