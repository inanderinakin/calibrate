import type { Language } from "@/contexts/LanguageContext";

export type KvkkBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] };

export interface KvkkSection {
  heading: string;
  blocks: KvkkBlock[];
}

export interface KvkkDocument {
  title: string;
  updated: string;
  sections: KvkkSection[];
}

const aydinlatmaTr: KvkkDocument = {
  title: "KİŞİSEL VERİLERİN İŞLENMESİNE İLİŞKİN AYDINLATMA METNİ",
  updated: "Son güncelleme: 29 Ağustos 2026",
  sections: [
    {
      heading: "",
      blocks: [
        { kind: "p", text: "Calibrate olarak, www.usecalibrate.dev web sitesi üzerinden toplanan kişisel verilerinizin korunmasına büyük önem vermekteyiz. Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (\"KVKK\") kapsamında veri sorumlusu sıfatıyla sizleri bilgilendirmek amacıyla hazırlanmıştır." },
      ],
    },
    {
      heading: "1. Veri Sorumlusu",
      blocks: [
        { kind: "p", text: "Veri Sorumlusu: Calibrate" },
        { kind: "p", text: "Web Sitesi: www.usecalibrate.dev" },
        { kind: "p", text: "E-posta: contact@usecalibrate.dev" },
      ],
    },
    {
      heading: "2. İşlenen Kişisel Veriler",
      blocks: [
        { kind: "p", text: "www.usecalibrate.dev web sitesi aracılığıyla aşağıdaki kişisel verileriniz işlenebilmektedir:" },
        {
          kind: "ul",
          items: [
            "Ad, soyad",
            "E-posta adresi",
            "Telefon numarası",
            "IP adresi ve tarayıcı bilgileri",
            "Çerez verileri",
            "İletişim formu aracılığıyla iletilen ad, e-posta, telefon ve mesaj içeriği",
            "Üyelik bilgileri (kullanıcı adı, şifre hash, profil bilgileri)",
            "Çerez verileri (oturum çerezleri, tercih çerezleri, analitik çerezler)",
            "Öğrenim alanı ve ülke bilgisi",
            "Yüklediğiniz CV dosyası ve bu dosyadan çıkarılan metin",
            "CV'nizden tespit edilen beceriler, seçtiğiniz hedef roller ve beceri açığı analizinin sonuçları",
            "Sizin için oluşturulan öğrenme yol haritası ile tamamladığınızı işaretlediğiniz beceri ve projeler",
          ],
        },
      ],
    },
    {
      heading: "3. CV'nizin İşlenmesi ve Yapay Zeka Kullanımı",
      blocks: [
        { kind: "p", text: "Yüklediğiniz CV dosyası, Amazon Web Services bünyesindeki Amazon S3 hizmetinde eu-central-1 (Frankfurt) bölgesinde saklanmakta ve dosyadaki metin Amazon Textract hizmeti ile çıkarılmaktadır." },
        { kind: "p", text: "Analiziniz, Amazon Bedrock üzerinde çalışan iki model ile üretilmektedir. Cohere embed-multilingual-v3 modeli, CV'nizdeki becerileri iş ilanlarında yer alan becerilerle Türkçe ve İngilizce arasında eşleştirmektedir. Claude Sonnet 4.6 modeli, öğrenme yol haritası metnini ve proje açıklamalarını yazmaktadır." },
        { kind: "p", text: "Analizinizde yer alan beceri ve rol adları, yalnızca sonucunuzun üretilmesi amacıyla bu modellere iletilmektedir. Amazon Bedrock, kendisine iletilen içeriği model eğitimi amacıyla kullanmamaktadır." },
      ],
    },
    {
      heading: "4. Kişisel Verilerin İşlenme Amaçları",
      blocks: [
        { kind: "p", text: "Toplanan kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:" },
        {
          kind: "ul",
          items: [
            "İletişim taleplerinin yanıtlanması",
            "Hizmet sunumu ve bilgilendirme",
            "Web sitesi güvenliğinin sağlanması",
            "İstatistiksel analiz ve performans ölçümü",
            "İletişim taleplerinin değerlendirilmesi ve yanıtlanması",
            "Üyelik hesabının oluşturulması ve yönetimi",
            "Kişiselleştirilmiş hizmet sunumu",
            "Web sitesi işlevselliğinin sağlanması",
            "Kullanıcı tercihlerinin hatırlanması",
            "CV'nizin analiz edilmesi ve beceri açıklarınızın tespit edilmesi",
            "Hedef rollerinize yönelik öğrenme yol haritasının oluşturulması",
            "İlerlemenizin kaydedilmesi ve tarafınıza gösterilmesi",
          ],
        },
      ],
    },
    {
      heading: "5. Kişisel Verilerin Saklanma Süresi",
      blocks: [
        { kind: "p", text: "Yüklediğiniz CV dosyası, Amazon S3 üzerinde tanımlı yaşam döngüsü kuralı uyarınca yüklenmesinden bir gün sonra silinmektedir. Amazon S3 son kullanma zamanını UTC gece yarısına yuvarladığı ve silme işlemini eşzamansız yürüttüğü için gerçek süre yaklaşık 48 saate kadar çıkabilmektedir." },
        { kind: "p", text: "Hesap bilgileriniz, analiz sonuçlarınız, yol haritanız ve ilerleme kayıtlarınız, siz hesabınızı silene kadar saklanmaktadır." },
      ],
    },
    {
      heading: "6. Kişisel Verilerin Aktarılması",
      blocks: [
        { kind: "p", text: "Kişisel verileriniz, yukarıda belirtilen amaçlar doğrultusunda ve KVKK'nın 8. ve 9. maddelerine uygun olarak aşağıdaki taraflara aktarılabilmektedir:" },
        {
          kind: "ul",
          items: [
            "Hosting ve altyapı hizmet sağlayıcıları",
            "E-posta hizmet sağlayıcıları",
            "Yasal yükümlülükler kapsamında yetkili kamu kurum ve kuruluşları",
            "Amazon Web Services (barındırma, depolama, yapay zeka modelleri, hesap yönetimi ve e-posta gönderimi)",
            "Cloudflare (yalnızca alan adı çözümlemesi)",
            "Google (yalnızca Google hesabı ile giriş yapmayı tercih etmeniz hâlinde)",
          ],
        },
        { kind: "p", text: "Verileriniz Avrupa Birliği sınırları içinde, eu-central-1 (Frankfurt) bölgesinde işlenmekte ve saklanmaktadır. Anılan hizmet sağlayıcıları Türkiye dışında yerleşik olduğundan bu işlem yurt dışına aktarım niteliğinde olup, açık rızanıza dayanmaktadır." },
      ],
    },
    {
      heading: "7. Kişisel Verilerin Toplanma Yöntemi ve Hukuki Sebebi",
      blocks: [
        { kind: "p", text: "Kişisel verileriniz, aşağıdaki yöntemlerle toplanmaktadır:" },
        {
          kind: "ul",
          items: [
            "Web sitesi iletişim formları",
            "Otomatik yollarla (çerezler, log kayıtları)",
            "Web sitesi iletişim formu",
            "Üyelik kayıt formu",
            "Otomatik yollarla (çerezler)",
          ],
        },
        { kind: "p", text: "Bu verilerin işlenmesinin hukuki sebepleri genel çerçevede şunlardır:" },
        {
          kind: "ul",
          items: [
            "Meşru menfaat (iletişim, güvenlik)",
            "Sözleşmenin ifası (hizmet sunumu)",
            "Açık rıza (pazarlama, bülten)",
          ],
        },
      ],
    },
    {
      heading: "8. Kişisel Verilerinizin Silinmesi",
      blocks: [
        { kind: "p", text: "Ayarlar sayfasında yer alan hesap silme seçeneği ile hesabınızı ve üzerindeki tüm kayıtları silebilirsiniz. Bu işlem hesabınızı, analiz sonuçlarınızı, yol haritanızı, ilerleme kayıtlarınızı ve açık rıza kaydınızı kaldırmakta olup geri alınamaz." },
        { kind: "p", text: "Hesabınızın silinmesi, o sırada yaşam döngüsü penceresi içinde bulunan bir CV dosyasını geriye dönük olarak silmemektedir. Söz konusu dosya, beşinci maddede belirtilen süre içinde kendiliğinden silinmektedir." },
      ],
    },
    {
      heading: "9. KVKK Kapsamındaki Haklarınız",
      blocks: [
        { kind: "p", text: "KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:" },
        {
          kind: "ul",
          items: [
            "Kişisel verilerinizin işlenip işlenmediğini öğrenme",
            "Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme",
            "Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme",
            "Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme",
            "Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme",
            "KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme",
            "Yapılan düzeltme, silme ve yok etme işlemlerinin, kişisel verilerinizin aktarıldığı üçüncü kişilere bildirilmesini isteme",
            "İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme",
            "Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme",
          ],
        },
      ],
    },
    {
      heading: "10. Başvuru Yöntemi",
      blocks: [
        { kind: "p", text: "Yukarıda belirtilen haklarınızı kullanmak için aşağıdaki yöntemlerle Calibrate'e başvurabilirsiniz:" },
        {
          kind: "ul",
          items: [
            "E-posta yoluyla: contact@usecalibrate.dev adresine kimliğinizi tespit edici bilgiler ile birlikte yazılı başvuru göndererek",
          ],
        },
        { kind: "p", text: "Başvurularınız, talebin niteliğine göre en kısa sürede ve en geç 30 (otuz) gün içinde ücretsiz olarak sonuçlandırılacaktır." },
      ],
    },
  ],
};

const aydinlatmaEn: KvkkDocument = {
  title: "INFORMATION NOTICE ON THE PROCESSING OF PERSONAL DATA",
  updated: "Last updated: 29 August 2026",
  sections: [
    {
      heading: "",
      blocks: [
        { kind: "p", text: "At Calibrate, we attach great importance to the protection of the personal data collected through the www.usecalibrate.dev website. This information notice has been prepared in order to inform you, in our capacity as data controller, within the scope of Personal Data Protection Law no. 6698 (\"KVKK\")." },
      ],
    },
    {
      heading: "1. Data Controller",
      blocks: [
        { kind: "p", text: "Data Controller: Calibrate" },
        { kind: "p", text: "Website: www.usecalibrate.dev" },
        { kind: "p", text: "Email: contact@usecalibrate.dev" },
      ],
    },
    {
      heading: "2. Personal Data Processed",
      blocks: [
        { kind: "p", text: "The following personal data may be processed through the www.usecalibrate.dev website:" },
        {
          kind: "ul",
          items: [
            "First name and surname",
            "Email address",
            "Telephone number",
            "IP address and browser information",
            "Cookie data",
            "The name, email, telephone and message content submitted through the contact form",
            "Membership information (username, password hash, profile information)",
            "Cookie data (session cookies, preference cookies, analytics cookies)",
            "Field of study and country",
            "The CV file you upload and the text extracted from it",
            "The skills identified from your CV, the target roles you select and the results of the skill gap analysis",
            "The learning roadmap produced for you, together with the skills and projects you mark as completed",
          ],
        },
      ],
    },
    {
      heading: "3. Processing of Your CV and Use of Artificial Intelligence",
      blocks: [
        { kind: "p", text: "The CV file you upload is stored in the Amazon S3 service of Amazon Web Services in the eu-central-1 (Frankfurt) region, and the text within the file is extracted using the Amazon Textract service." },
        { kind: "p", text: "Your analysis is produced by two models running on Amazon Bedrock. The Cohere embed-multilingual-v3 model matches the skills on your CV against the skills appearing in job postings, across Turkish and English. The Claude Sonnet 4.6 model writes the learning roadmap text and the project descriptions." },
        { kind: "p", text: "The skill and role names contained in your analysis are transmitted to these models solely for the purpose of producing your result. Amazon Bedrock does not use the content transmitted to it for the purpose of training models." },
      ],
    },
    {
      heading: "4. Purposes of Processing Personal Data",
      blocks: [
        { kind: "p", text: "The personal data collected is processed for the following purposes:" },
        {
          kind: "ul",
          items: [
            "Responding to contact requests",
            "Provision of the service and provision of information",
            "Ensuring the security of the website",
            "Statistical analysis and performance measurement",
            "Evaluating and responding to contact requests",
            "Creation and management of the membership account",
            "Provision of a personalised service",
            "Ensuring the functionality of the website",
            "Remembering user preferences",
            "Analysing your CV and identifying your skill gaps",
            "Producing a learning roadmap directed at your target roles",
            "Recording your progress and displaying it to you",
          ],
        },
      ],
    },
    {
      heading: "5. Retention Period of Personal Data",
      blocks: [
        { kind: "p", text: "The CV file you upload is deleted one day after it is uploaded, pursuant to the lifecycle rule defined on Amazon S3. Because Amazon S3 rounds the expiry time to midnight UTC and carries out deletion asynchronously, the actual period may extend to approximately 48 hours." },
        { kind: "p", text: "Your account information, analysis results, roadmap and progress records are retained until you delete your account." },
      ],
    },
    {
      heading: "6. Transfer of Personal Data",
      blocks: [
        { kind: "p", text: "Your personal data may be transferred to the following parties in line with the purposes stated above and in accordance with articles 8 and 9 of the KVKK:" },
        {
          kind: "ul",
          items: [
            "Hosting and infrastructure service providers",
            "Email service providers",
            "Authorised public institutions and organisations within the scope of legal obligations",
            "Amazon Web Services (hosting, storage, artificial intelligence models, account management and sending email)",
            "Cloudflare (domain name resolution only)",
            "Google (only if you choose to sign in with a Google account)",
          ],
        },
        { kind: "p", text: "Your data is processed and stored within the borders of the European Union, in the eu-central-1 (Frankfurt) region. As the service providers named above are established outside Türkiye, this constitutes a transfer abroad and is based on your explicit consent." },
      ],
    },
    {
      heading: "7. Method of Collection and Legal Grounds",
      blocks: [
        { kind: "p", text: "Your personal data is collected by the following methods:" },
        {
          kind: "ul",
          items: [
            "Website contact forms",
            "By automated means (cookies, log records)",
            "Website contact form",
            "Membership registration form",
            "By automated means (cookies)",
          ],
        },
        { kind: "p", text: "The legal grounds for processing this data are, in general terms, as follows:" },
        {
          kind: "ul",
          items: [
            "Legitimate interest (communication, security)",
            "Performance of a contract (provision of the service)",
            "Explicit consent (marketing, newsletter)",
          ],
        },
      ],
    },
    {
      heading: "8. Deletion of Your Personal Data",
      blocks: [
        { kind: "p", text: "You may delete your account and all records held on it using the delete account option on the settings page. This operation removes your account, your analysis results, your roadmap, your progress records and your explicit consent record, and cannot be undone." },
        { kind: "p", text: "Deleting your account does not retroactively delete a CV file that is within the lifecycle window at that time. That file is deleted automatically within the period stated in article five." },
      ],
    },
    {
      heading: "9. Your Rights Under the KVKK",
      blocks: [
        { kind: "p", text: "Pursuant to article 11 of the KVKK, you have the following rights:" },
        {
          kind: "ul",
          items: [
            "To learn whether your personal data is being processed",
            "To request information if your personal data has been processed",
            "To learn the purpose of processing your personal data and whether it is used in accordance with that purpose",
            "To know the third parties to whom your personal data is transferred, domestically or abroad",
            "To request correction of your personal data where it has been processed incompletely or incorrectly",
            "To request the erasure or destruction of your personal data within the conditions set out in article 7 of the KVKK",
            "To request that correction, erasure and destruction operations be notified to the third parties to whom your personal data has been transferred",
            "To object to a result arising against you through the analysis of the processed data exclusively by automated systems",
            "To claim compensation for damage suffered as a result of the unlawful processing of your personal data",
          ],
        },
      ],
    },
    {
      heading: "10. Method of Application",
      blocks: [
        { kind: "p", text: "You may apply to Calibrate by the following methods in order to exercise the rights stated above:" },
        {
          kind: "ul",
          items: [
            "By email: by sending a written application to contact@usecalibrate.dev together with information establishing your identity",
          ],
        },
        { kind: "p", text: "Your applications will be concluded free of charge as soon as possible and within 30 (thirty) days at the latest, depending on the nature of the request." },
      ],
    },
  ],
};

const acikRizaTr: KvkkDocument = {
  title: "AÇIK RIZA METNİ",
  updated: "Son güncelleme: 29 Ağustos 2026",
  sections: [
    {
      heading: "",
      blocks: [
        { kind: "p", text: "Calibrate tarafından sunulan aydınlatma metnini okudum ve anladım." },
        { kind: "p", text: "Aşağıda belirtilen kapsamda kişisel verilerimin işlenmesine özgür iradem ile açık rızam bulunmaktadır:" },
        {
          kind: "ul",
          items: [
            "Kişisel verilerimin yurt dışında bulunan hizmet sağlayıcılara aktarılması",
          ],
        },
        { kind: "p", text: "Açık rızamı dilediğim zaman, herhangi bir gerekçe belirtmeksizin contact@usecalibrate.dev adresine başvurarak geri çekebileceğimi biliyorum. Açık rızanın geri çekilmesi, geri çekilme öncesi yapılan işlemlerin hukuka uygunluğunu etkilemeyecektir." },
      ],
    },
  ],
};

const acikRizaEn: KvkkDocument = {
  title: "EXPLICIT CONSENT STATEMENT",
  updated: "Last updated: 29 August 2026",
  sections: [
    {
      heading: "",
      blocks: [
        { kind: "p", text: "I have read and understood the information notice provided by Calibrate." },
        { kind: "p", text: "I give my explicit consent, of my own free will, to the processing of my personal data within the scope stated below:" },
        {
          kind: "ul",
          items: [
            "The transfer of my personal data to service providers located abroad",
          ],
        },
        { kind: "p", text: "I know that I may withdraw my explicit consent at any time, without stating any reason, by applying to contact@usecalibrate.dev. Withdrawal of explicit consent will not affect the lawfulness of processing carried out before the withdrawal." },
      ],
    },
  ],
};

export function kvkkDocuments(language: Language) {
  return language === "tr"
    ? { aydinlatma: aydinlatmaTr, acikRiza: acikRizaTr }
    : { aydinlatma: aydinlatmaEn, acikRiza: acikRizaEn };
}
