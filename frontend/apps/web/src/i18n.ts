import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from '@ordo/i18n';

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locales.includes(locale as typeof locales[number])
    ? (locale as typeof locales[number])
    : defaultLocale;

  const messages = await import(`@ordo/i18n/src/locales/${resolvedLocale}`);

  return {
    locale: resolvedLocale,
    messages: messages.default,
  };
});
