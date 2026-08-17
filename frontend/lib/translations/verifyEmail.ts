export const verifyEmail = {
  en: {
    title: "Check your email",
    sentTo: (email: string) => `We sent a six digit code to ${email}.`,
    code: "Confirmation code",
    submit: "Confirm",
    missingEmail: "We do not know which account to confirm. Please sign up again.",
    genericError: "We could not confirm your account. Please try again.",
  },
  tr: {
    title: "E-postanızı kontrol edin",
    sentTo: (email: string) => `${email} adresine altı haneli bir kod gönderdik.`,
    code: "Doğrulama kodu",
    submit: "Onayla",
    missingEmail: "Hangi hesabın onaylanacağını bilmiyoruz. Lütfen tekrar kayıt olun.",
    genericError: "Hesabınız onaylanamadı. Lütfen tekrar deneyin.",
  },
};
