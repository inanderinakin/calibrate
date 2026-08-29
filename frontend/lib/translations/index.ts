import type { Language } from "@/contexts/LanguageContext";
import { common } from "./common";
import { sidebar } from "./sidebar";
import { stepIndicator } from "./stepIndicator";
import { landing } from "./landing";
import { legal } from "./legal";
import { login } from "./login";
import { signup } from "./signup";
import { verifyEmail } from "./verifyEmail";
import { forgotPassword } from "./forgotPassword";
import { accountCreated } from "./accountCreated";
import { uploadCv } from "./uploadCv";
import { selectRole } from "./selectRole";
import { analyseCv } from "./analyseCv";
import { dashboard } from "./dashboard";
import { roadmap } from "./roadmap";
import { postings } from "./postings";
import { profile } from "./profile";
import { settings } from "./settings";
import { trendChart } from "./trendChart";
import { completeProfile } from "./completeProfile";

// Adding a new page: create lib/translations/<page>.ts exporting
// { en: {...}, tr: {...} }, then add one import + one line below.
// Every page still reads via getTranslations(language).<page>.xxx.
function pick(language: Language) {
  return {
    common: common[language],
    sidebar: sidebar[language],
    stepIndicator: stepIndicator[language],
    landing: landing[language],
    legal: legal[language],
    login: login[language],
    signup: signup[language],
    verifyEmail: verifyEmail[language],
    forgotPassword: forgotPassword[language],
    accountCreated: accountCreated[language],
    uploadCv: uploadCv[language],
    selectRole: selectRole[language],
    analyseCv: analyseCv[language],
    dashboard: dashboard[language],
    roadmap: roadmap[language],
    postings: postings[language],
    profile: profile[language],
    settings: settings[language],
    trendChart: trendChart[language],
    completeProfile: completeProfile[language],
  };
}

export function getTranslations(language: Language) {
  return pick(language);
}

export type Translations = ReturnType<typeof getTranslations>;
