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

export const aydinlatmaMetni: KvkkDocument = {
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
          ],
        },
      ],
    },
    {
      heading: "3. Kişisel Verilerin İşlenme Amaçları",
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
          ],
        },
      ],
    },
    {
      heading: "4. Kişisel Verilerin Aktarılması",
      blocks: [
        { kind: "p", text: "Kişisel verileriniz, yukarıda belirtilen amaçlar doğrultusunda ve KVKK'nın 8. ve 9. maddelerine uygun olarak aşağıdaki taraflara aktarılabilmektedir:" },
        {
          kind: "ul",
          items: [
            "Hosting ve altyapı hizmet sağlayıcıları",
            "E-posta hizmet sağlayıcıları",
            "Yasal yükümlülükler kapsamında yetkili kamu kurum ve kuruluşları",
          ],
        },
      ],
    },
    {
      heading: "5. Kişisel Verilerin Toplanma Yöntemi ve Hukuki Sebebi",
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
      heading: "6. KVKK Kapsamındaki Haklarınız",
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
      heading: "7. Başvuru Yöntemi",
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

export const acikRizaMetni: KvkkDocument = {
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
