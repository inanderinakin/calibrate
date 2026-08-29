export const legal = {
  en: {
    footer: {
      privacy: "Privacy",
      terms: "Terms",
      contact: "Contact",
      note: "Calibrate is a student project built for the Amazon mentorship programme.",
    },
    settingsHeading: "Legal",
    settingsNote: "What we collect, what we do with it, and how to reach us.",
    privacy: {
      title: "Privacy Notice",
      updated: "Last updated 31 August 2026",
      intro: "Calibrate reads your CV, compares it against skills employers are asking for in job postings, and writes you a learning roadmap. Doing that means handling your personal data. This page says exactly what happens to it.",
      sections: [
        {
          heading: "Your CV",
          body: [
            "The file you upload is stored in Amazon S3 in the eu-central-1 region, under an uploads prefix. Amazon Textract reads the text out of it, and that text is what the rest of the analysis works from.",
            "A lifecycle rule on the bucket deletes the file one day after it is uploaded. In practice the window is up to about 48 hours, because S3 rounds the expiry to midnight UTC and sweeps asynchronously. We do not keep the file beyond that.",
            "What we do keep is the file name, size, type and upload time, so the app can tell you which CV is on file after you close the tab.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Your account",
          body: [
            "Amazon Cognito holds your account. It stores:",
          ],
          note: "Your password is handled by Cognito and is never visible to us. If you sign in with Google, Google tells us your email address and name and nothing else.",
          list: [
            "Email address",
            "First and last name",
            "Field of study",
            "Country",
          ],
        },
        {
          heading: "What we store about your analysis",
          body: [
            "Amazon DynamoDB holds the results of your analysis so they survive closing the tab:",
          ],
          note: "",
          list: [
            "The skills read out of your CV",
            "The roles you picked as targets",
            "The skill gaps we calculated",
            "The roadmap that was written for you",
            "Which skills and projects you have ticked off",
            "Your consent record, with the date and the version of this notice you accepted",
          ],
        },
        {
          heading: "How the analysis is produced",
          body: [
            "Two models on Amazon Bedrock do the work. Cohere embed-multilingual-v3 matches the skills on your CV against the skills in job postings, across Turkish and English. Claude Sonnet 4.6 writes the roadmap text and the project briefs.",
            "The skills and role names from your analysis are sent to these models to produce your result. Amazon Bedrock does not use content sent to it to train models.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Where the data lives",
          body: [
            "Everything runs in the eu-central-1 region in Frankfurt. Your CV, your account and your analysis stay in the European Union.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Who else is involved",
          body: [
            "We use these providers and no others:",
          ],
          note: "",
          list: [
            "Amazon Web Services, for hosting, storage, the models, accounts and email",
            "Cloudflare, for DNS only, which means it resolves the domain name and does not see your data",
            "Google, only if you choose to sign in with a Google account",
          ],
        },
        {
          heading: "Deleting your data",
          body: [
            "Settings has a delete account control. It removes your Cognito account and the whole DynamoDB record: your analysis, your roadmap, your progress and your consent record. This cannot be undone.",
            "One honest limitation: deleting your account does not reach back and delete a CV uploaded inside the current lifecycle window. That file expires on its own, within about 48 hours of upload.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Your rights",
          body: [
            "Under KVKK and the GDPR you can ask what we hold about you, ask for it to be corrected, and ask for it to be erased. The delete account control does the last one immediately. For anything else, write to us on the contact page.",
          ],
          note: "",
          list: [],
        },
      ],
    },
    terms: {
      title: "Terms of Service",
      updated: "Last updated 31 August 2026",
      intro: "Calibrate is a student project. These terms are short because the service is small, and they say what you can expect from it and what it expects from you.",
      sections: [
        {
          heading: "What Calibrate does",
          body: [
            "It reads your CV, compares the skills on it against the skills employers ask for in job postings we collect from public job boards, and writes you a learning roadmap aimed at the roles you picked.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "What it is not",
          body: [
            "It is not career advice and it is not a promise of employment. The roadmap is written by a language model working from job posting data, and it can be wrong, out of date, or a poor fit for your situation. Read it as a starting point and use your own judgement.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "The job posting data",
          body: [
            "Postings are collected from public job boards. We do not control what they say, whether a listing is still open, or whether the employer behind it is real. Apply through the original posting and check it yourself.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Your account and what you upload",
          body: [
            "Keep your password to yourself. Only upload a CV that is yours or that you have permission to upload, and do not upload other people's personal data.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Acceptable use",
          body: [
            "Do not scrape the service, do not run automated requests against it, and do not try to get at other people's data. We can suspend an account that does.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Availability",
          body: [
            "The service is provided as it is, with no uptime promise. It is a student project running on a free tier budget, so it can change, break, or stop.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Changes",
          body: [
            "If these terms change, the date at the top changes with them. Continuing to use Calibrate after that means you accept the new version.",
          ],
          note: "",
          list: [],
        },
      ],
    },
    contact: {
      title: "Contact",
      intro: "Questions about your data, something broken, or feedback on the roadmap you were given. Write to us and we will reply to the address you leave here.",
      name: "Your name",
      email: "Your email",
      message: "Message",
      messagePlaceholder: "What would you like to tell us?",
      submit: "Send message",
      sending: "Sending",
      sent: "Thank you. Your message is on its way and we will reply to the address you gave.",
      failed: "We could not send your message. Please try again in a moment.",
      invalidEmail: "Please check the email address you entered.",
      empty: "Please fill in your name, your email and a message.",
    },
    consent: {
      before: "I have read and accept the ",
      privacy: "Privacy Notice",
      between: " and the ",
      terms: "Terms of Service",
      after: ".",
      notice: "Your CV is processed to produce your analysis, stored in the European Union, and deleted from storage within about 48 hours. You can delete your account and everything on it at any time.",
      required: "Please accept the privacy notice and the terms to continue.",
    },
  },
  tr: {
    footer: {
      privacy: "Gizlilik",
      terms: "Koşullar",
      contact: "İletişim",
      note: "Calibrate, Amazon mentorluk programı için yapılmış bir öğrenci projesidir.",
    },
    settingsHeading: "Yasal",
    settingsNote: "Neleri topluyoruz, onlarla ne yapıyoruz ve bize nasıl ulaşırsınız.",
    privacy: {
      title: "Gizlilik Bildirimi",
      updated: "Son güncelleme 31 Ağustos 2026",
      intro: "Calibrate CV'nizi okur, iş ilanlarında işverenlerin aradığı becerilerle karşılaştırır ve size bir öğrenme yol haritası yazar. Bunu yapmak kişisel verilerinizi işlemeyi gerektirir. Bu sayfa verilerinize tam olarak ne olduğunu anlatır.",
      sections: [
        {
          heading: "CV'niz",
          body: [
            "Yüklediğiniz dosya eu-central-1 bölgesinde Amazon S3'te, uploads önekiyle saklanır. Amazon Textract metni dosyadan çıkarır ve analizin geri kalanı bu metin üzerinden çalışır.",
            "Paketteki bir yaşam döngüsü kuralı dosyayı yüklenmesinden bir gün sonra siler. Pratikte bu süre yaklaşık 48 saate kadar çıkabilir, çünkü S3 son kullanma zamanını UTC gece yarısına yuvarlar ve silmeyi eşzamansız yapar. Dosyayı bunun ötesinde tutmayız.",
            "Sakladığımız şey dosyanın adı, boyutu, türü ve yüklenme zamanıdır. Bu, sekmeyi kapattıktan sonra uygulamanın hangi CV'nin kayıtlı olduğunu size gösterebilmesi içindir.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Hesabınız",
          body: [
            "Hesabınızı Amazon Cognito tutar. Sakladıkları:",
          ],
          note: "Parolanız Cognito tarafından yönetilir ve bizim tarafımızdan hiçbir zaman görülmez. Google ile giriş yaparsanız Google bize yalnızca e-posta adresinizi ve adınızı bildirir.",
          list: [
            "E-posta adresi",
            "Ad ve soyad",
            "Çalışma alanı",
            "Ülke",
          ],
        },
        {
          heading: "Analiziniz hakkında ne saklıyoruz",
          body: [
            "Analiz sonuçlarınız, sekmeyi kapattığınızda kaybolmasınlar diye Amazon DynamoDB'de tutulur:",
          ],
          note: "",
          list: [
            "CV'nizden çıkarılan beceriler",
            "Hedef olarak seçtiğiniz roller",
            "Hesapladığımız beceri açıkları",
            "Sizin için yazılan yol haritası",
            "Tamamlandı olarak işaretlediğiniz beceriler ve projeler",
            "Onay kaydınız, tarihi ve kabul ettiğiniz bildirim sürümü ile birlikte",
          ],
        },
        {
          heading: "Analiz nasıl üretiliyor",
          body: [
            "İşi Amazon Bedrock üzerindeki iki model yapar. Cohere embed-multilingual-v3, CV'nizdeki becerileri iş ilanlarındaki becerilerle Türkçe ve İngilizce arasında eşleştirir. Claude Sonnet 4.6, yol haritası metnini ve proje açıklamalarını yazar.",
            "Analizinizdeki beceri ve rol adları sonucunuzu üretmek için bu modellere gönderilir. Amazon Bedrock kendisine gönderilen içeriği model eğitmek için kullanmaz.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Veriler nerede duruyor",
          body: [
            "Her şey Frankfurt'taki eu-central-1 bölgesinde çalışır. CV'niz, hesabınız ve analiziniz Avrupa Birliği içinde kalır.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Başka kimler devrede",
          body: [
            "Kullandığımız sağlayıcılar bunlardır, başkası yoktur:",
          ],
          note: "",
          list: [
            "Amazon Web Services: barındırma, depolama, modeller, hesaplar ve e-posta",
            "Cloudflare: yalnızca DNS, yani alan adını çözer ve verilerinizi görmez",
            "Google: yalnızca bir Google hesabıyla giriş yapmayı seçerseniz",
          ],
        },
        {
          heading: "Verilerinizi silmek",
          body: [
            "Ayarlar sayfasında hesap silme seçeneği vardır. Cognito hesabınızı ve DynamoDB kaydınızın tamamını siler: analiziniz, yol haritanız, ilerlemeniz ve onay kaydınız. Bu geri alınamaz.",
            "Dürüst bir sınır: hesabınızı silmek, o anki yaşam döngüsü penceresi içinde yüklenmiş bir CV'yi geri dönüp silmez. O dosya yüklenmesinden yaklaşık 48 saat içinde kendiliğinden silinir.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Haklarınız",
          body: [
            "KVKK ve GDPR kapsamında hakkınızda ne tuttuğumuzu sorabilir, düzeltilmesini isteyebilir ve silinmesini talep edebilirsiniz. Hesap silme seçeneği sonuncusunu anında yapar. Diğer her şey için iletişim sayfasından bize yazın.",
          ],
          note: "",
          list: [],
        },
      ],
    },
    terms: {
      title: "Kullanım Koşulları",
      updated: "Son güncelleme 31 Ağustos 2026",
      intro: "Calibrate bir öğrenci projesidir. Servis küçük olduğu için bu koşullar da kısadır. Ondan ne bekleyebileceğinizi ve onun sizden ne beklediğini anlatırlar.",
      sections: [
        {
          heading: "Calibrate ne yapar",
          body: [
            "CV'nizi okur, üzerindeki becerileri açık iş sitelerinden topladığımız ilanlarda işverenlerin aradığı becerilerle karşılaştırır ve seçtiğiniz rollere yönelik bir öğrenme yol haritası yazar.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Ne değildir",
          body: [
            "Kariyer danışmanlığı değildir ve iş bulma garantisi vermez. Yol haritası, iş ilanı verilerinden çalışan bir dil modeli tarafından yazılır. Yanlış, güncelliğini yitirmiş veya sizin durumunuza uymayan şeyler söyleyebilir. Onu bir başlangıç noktası olarak okuyun ve kendi muhakemenizi kullanın.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "İş ilanı verileri",
          body: [
            "İlanlar açık iş sitelerinden toplanır. Ne yazdıklarını, ilanın hâlâ açık olup olmadığını veya arkasındaki işverenin gerçek olup olmadığını biz denetlemeyiz. Başvurunuzu özgün ilan üzerinden yapın ve ilanı kendiniz kontrol edin.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Hesabınız ve yüklediğiniz dosya",
          body: [
            "Parolanızı kendinize saklayın. Yalnızca size ait olan veya yükleme izniniz olan bir CV yükleyin ve başkalarının kişisel verilerini yüklemeyin.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Kabul edilebilir kullanım",
          body: [
            "Servisi kazımayın, üzerine otomatik istekler çalıştırmayın ve başkalarının verilerine erişmeye çalışmayın. Bunu yapan bir hesabı askıya alabiliriz.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Erişilebilirlik",
          body: [
            "Servis olduğu haliyle sunulur, çalışma süresi taahhüdü yoktur. Ücretsiz katman bütçesiyle çalışan bir öğrenci projesidir, dolayısıyla değişebilir, bozulabilir veya durabilir.",
          ],
          note: "",
          list: [],
        },
        {
          heading: "Değişiklikler",
          body: [
            "Bu koşullar değişirse yukarıdaki tarih de onlarla birlikte değişir. Bundan sonra Calibrate'i kullanmaya devam etmeniz yeni sürümü kabul ettiğiniz anlamına gelir.",
          ],
          note: "",
          list: [],
        },
      ],
    },
    contact: {
      title: "İletişim",
      intro: "Verilerinizle ilgili sorular, bozuk bir şey veya size verilen yol haritası hakkında geri bildirim. Bize yazın, burada bıraktığınız adrese yanıt verelim.",
      name: "Adınız",
      email: "E-posta adresiniz",
      message: "Mesaj",
      messagePlaceholder: "Bize ne anlatmak istersiniz?",
      submit: "Mesajı gönder",
      sending: "Gönderiliyor",
      sent: "Teşekkürler. Mesajınız yola çıktı, verdiğiniz adrese yanıt vereceğiz.",
      failed: "Mesajınız gönderilemedi. Lütfen biraz sonra tekrar deneyin.",
      invalidEmail: "Lütfen girdiğiniz e-posta adresini kontrol edin.",
      empty: "Lütfen adınızı, e-posta adresinizi ve bir mesaj yazın.",
    },
    consent: {
      before: "",
      privacy: "Gizlilik Bildirimi",
      between: "'ni ve ",
      terms: "Kullanım Koşulları",
      after: "'nı okudum ve kabul ediyorum.",
      notice: "CV'niz analizinizi üretmek için işlenir, Avrupa Birliği içinde saklanır ve yaklaşık 48 saat içinde depolamadan silinir. Hesabınızı ve üzerindeki her şeyi dilediğiniz zaman silebilirsiniz.",
      required: "Devam etmek için lütfen gizlilik bildirimini ve koşulları kabul edin.",
    },
  },
};
