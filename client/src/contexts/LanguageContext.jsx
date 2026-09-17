import { createContext, useContext, useEffect, useState } from 'react';

const Dictionary = {
  en: {
    'boards': 'Boards',
    'boards.sub': 'Pin up the numbers you care about — all in one place.',
    'summary': 'Analytics',
    'myData': 'My data',
    'wallet': 'Document wallet',
    'wallet.short': 'Papers',
    'reports': 'Reports',
    'invoices': 'Invoices',
    'gst': 'GST summary',
    'settings': 'Settings',
    'signOut': 'Sign out',
    'newBoard': '+ New board',
    'newInvoice': '+ New invoice',
  },
  hi: {
    'boards': 'बोर्ड',
    'boards.sub': 'जो आँकड़े आपके लिए ज़रूरी हैं, सब एक जगह।',
    'summary': 'एनालिटिक्स',
    'myData': 'मेरा डेटा',
    'wallet': 'दस्तावेज़ वॉलेट',
    'wallet.short': 'कागज़ात',
    'reports': 'रिपोर्ट्स',
    'invoices': 'बिल / इनवॉइस',
    'gst': 'जीएसटी सारांश',
    'settings': 'सेटिंग्स',
    'signOut': 'साइन आउट',
    'newBoard': '+ नया बोर्ड',
    'newInvoice': '+ नया बिल',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('dp_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('dp_lang', lang);
  }, [lang]);

  const t = (key) => Dictionary[lang]?.[key] ?? Dictionary.en[key] ?? key;

  const value = {
    lang,
    setLang,
    t,
    toggle: () => setLang((l) => (l === 'en' ? 'hi' : 'en')),
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
