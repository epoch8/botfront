import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
// don't want to use this?
// have a look at the Quick start guide
// for passing in lng and translations on init
import transENAccount from '../../public/locales/en/account.json';
import transENAdmin from '../../public/locales/en/admin.json';
import transENAnalytics from '../../public/locales/en/analytics.json';
import transENConversations from '../../public/locales/en/conversations.json';
import transENExampleEditor from '../../public/locales/en/example_editor.json';
import transENForms from '../../public/locales/en/forms.json';
import transENIncoming from '../../public/locales/en/incoming.json';
import transENNlu from '../../public/locales/en/nlu.json';
import transENProject from '../../public/locales/en/project.json';
import transENSettings from '../../public/locales/en/settings.json';
import transENSetup from '../../public/locales/en/setup.json';
import transENStories from '../../public/locales/en/stories.json';
import transENSynonyms from '../../public/locales/en/synonyms.json';
import transENTemplates from '../../public/locales/en/templates.json';
import transENTranslation from '../../public/locales/en/translation.json';
import transENUtils from '../../public/locales/en/utils.json';

import transRUAccount from '../../public/locales/ru/account.json';
import transRUAdmin from '../../public/locales/ru/admin.json';
import transRUAnalytics from '../../public/locales/ru/analytics.json';
import transRUConversations from '../../public/locales/ru/conversations.json';
import transRUExampleEditor from '../../public/locales/ru/example_editor.json';
import transRUForms from '../../public/locales/ru/forms.json';
import transRUIncoming from '../../public/locales/ru/incoming.json';
import transRUNlu from '../../public/locales/ru/nlu.json';
import transRUProject from '../../public/locales/ru/project.json';
import transRUSettings from '../../public/locales/ru/settings.json';
import transRUSetup from '../../public/locales/ru/setup.json';
import transRUStories from '../../public/locales/ru/stories.json';
import transRUSynonyms from '../../public/locales/ru/synonyms.json';
import transRUTemplates from '../../public/locales/ru/templates.json';
import transRUTranslation from '../../public/locales/ru/translation.json';
import transRUUtils from '../../public/locales/ru/utils.json';


// the translations
const resources = {
    en: {
        account: transENAccount,
        admin: transENAdmin,
        analytics: transENAnalytics,
        conversations: transENConversations,
        example_editor: transENExampleEditor,
        forms: transENForms,
        incoming: transENIncoming,
        nlu: transENNlu,
        project: transENProject,
        settings: transENSettings,
        setup: transENSetup,
        stories: transENStories,
        synonyms: transENSynonyms,
        templates: transENTemplates,
        translation: transENTranslation,
        utils: transENUtils,
    },
    ru: {
        account: transRUAccount,
        admin: transRUAdmin,
        analytics: transRUAnalytics,
        conversations: transRUConversations,
        example_editor: transRUExampleEditor,
        forms: transRUForms,
        incoming: transRUIncoming,
        nlu: transRUNlu,
        project: transRUProject,
        settings: transRUSettings,
        setup: transRUSetup,
        stories: transRUStories,
        synonyms: transRUSynonyms,
        templates: transRUTemplates,
        translation: transRUTranslation,
        utils: transRUUtils,
    },
};
resources['en-US'] = resources.en;
resources['ru-RU'] = resources.ru;

i18n
    // load translation using http -> see /public/locales (i.e. https://github.com/i18next/react-i18next/tree/master/example/react/public/locales)
    // learn more: https://github.com/i18next/i18next-http-backend
    // want your translations to be loaded from a professional CDN? => https://github.com/locize/react-tutorial#step-2---use-the-locize-cdn
    // .use(Backend)
    // detect user language
    // learn more: https://github.com/i18next/i18next-browser-languageDetector
    // .use(LanguageDetector)
    // pass the i18n instance to react-i18next.
    .use(initReactI18next)
    // init i18next
    // for all options read: https://www.i18next.com/overview/configuration-options
    .init({
        resources,
        fallbackLng: 'en',
        debug: true,

        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },

        lng: localStorage.getItem('language') || 'ru',

        // backend: {
        //     loadPath: 'http://localhost:8000/locales/{{lng}}/{{ns}}.json',
        //     crossDomain: true,
        // },
    });


export default i18n;
