/**
 * Catalogue des prestations — HYPOTHÈSES DE PRÉSENTATION à faire valider.
 *
 * Ajouter une prestation : copier un bloc, changer `id`, `category`, les textes
 * et `options` (durée en minutes), puis ajouter la clé de prix correspondante
 * dans site.config.mjs › prices (« id-durée »).
 * Supprimer une prestation : supprimer son bloc (et sa clé de prix).
 * Supprimer une famille : retirer l'entrée de `categories` et ses prestations.
 *
 * `groups: true` = proposée pour plusieurs personnes (riads, villas, événements).
 */

export const categories = [
  {
    id: 'massages',
    slug: { fr: 'massages-bien-etre', en: 'wellbeing-massages', ar: 'wellbeing-massages' },
    title: { fr: 'Massages bien-être', en: 'Wellbeing massages', ar: 'تدليك الاسترخاء' },
    kicker: { fr: 'Détente', en: 'Unwind', ar: 'استرخاء' },
    intro: {
      fr: "Des massages de détente réalisés chez vous, sur une table installée dans la pièce de votre choix. Vous n'avez rien à prévoir, sinon un peu d'espace et le temps de souffler.",
      en: 'Relaxing massages in your own home, on a table set up in the room of your choice. All you need is a little space and time to breathe.',
      ar: 'جلسات تدليك للاسترخاء في بيتك، على طاولة تُنصب في الغرفة التي تختارونها. لا تحتاجون إلى تحضير شيء سوى قليل من المساحة ووقت للراحة.',
    },
  },
  {
    id: 'ongles',
    slug: { fr: 'manucure-pedicure-onglerie', en: 'manicure-pedicure-nails', ar: 'manicure-pedicure-nails' },
    title: { fr: 'Manucure, pédicure & onglerie', en: 'Manicure, pedicure & nails', ar: 'العناية باليدين والقدمين والأظافر' },
    kicker: { fr: 'Mains & pieds', en: 'Hands & feet', ar: 'اليدان والقدمان' },
    intro: {
      fr: 'Des mains et des pieds soignés sans vous déplacer : soin des ongles et des cuticules, vernis classique ou semi-permanent, pose de gel. Le poste de travail est installé sur une simple table.',
      en: 'Well-groomed hands and feet without leaving home: nail and cuticle care, classic or gel polish, gel extensions. The workstation sets up on any table.',
      ar: 'يدان وقدمان بعناية دون أن تتنقّلوا: تهذيب الأظافر والجُليدات، طلاء عادي أو شبه دائم، وتركيب الجل. تُجهَّز محطة العمل على أي طاولة بسيطة.',
    },
  },
  {
    id: 'visage',
    slug: { fr: 'soins-du-visage', en: 'facials', ar: 'facials' },
    title: { fr: 'Soins du visage', en: 'Facials', ar: 'العناية بالوجه' },
    kicker: { fr: 'Visage', en: 'Face', ar: 'الوجه' },
    intro: {
      fr: 'Des soins du visage de beauté, pensés comme un vrai moment de calme : nettoyage, gommage doux, masque et modelage, avec des produits choisis selon votre type de peau.',
      en: 'Beauty facials designed as a genuine moment of calm: cleansing, gentle exfoliation, mask and facial massage, with products chosen for your skin type.',
      ar: 'علاجات تجميلية للوجه صُممت كلحظة هدوء حقيقية: تنظيف، تقشير لطيف، قناع وتدليك، بمنتجات تُختار حسب نوع بشرتك.',
    },
  },
];

/** Textes communs réutilisés par plusieurs prestations */
const common = {
  massageKit: {
    fr: ['Table de massage pliante', 'Linge de table, serviettes et couverture', "Huiles de massage (composition communiquée sur demande)", 'Lumière douce'],
    en: ['Folding massage table', 'Table linen, towels and blanket', 'Massage oils (ingredients available on request)', 'Soft lighting'],
    ar: ['طاولة تدليك قابلة للطي', 'مفارش ومناشف وغطاء', 'زيوت التدليك (تُقدَّم مكوّناتها عند الطلب)', 'إضاءة هادئة'],
  },
  massagePrep: {
    fr: ['Un espace libre d’environ 2 × 3 m', 'Une pièce tempérée et calme', 'Signaler à l’avance tout doute sur une contre-indication éventuelle'],
    en: ['A clear space of about 2 × 3 m', 'A calm room at a comfortable temperature', 'Mention in advance if you have any doubt about a possible contraindication'],
    ar: ['مساحة فارغة تقارب 2 × 3 أمتار', 'غرفة هادئة بدرجة حرارة معتدلة', 'الإشارة مسبقاً إلى أي شكّ بشأن موانع محتملة'],
  },
  nailKit: {
    fr: ['Instruments désinfectés ou à usage unique', 'Limes et polissoirs neufs', 'Vernis et produits de soin', 'Lampe LED pour le semi-permanent et le gel'],
    en: ['Disinfected or single-use tools', 'New files and buffers', 'Polishes and care products', 'LED lamp for gel polish and gel'],
    ar: ['أدوات معقّمة أو للاستعمال مرة واحدة', 'مبارد وأدوات تلميع جديدة', 'طلاءات ومنتجات عناية', 'مصباح LED للطلاء شبه الدائم والجل'],
  },
  nailPrep: {
    fr: ['Une table et deux chaises, près d’une prise électrique', 'Un bon éclairage', 'Pour les pieds : une chaise confortable et un accès à l’eau'],
    en: ['A table and two chairs near a power socket', 'Good lighting', 'For feet: a comfortable chair and access to water'],
    ar: ['طاولة وكرسيان قرب مقبس كهربائي', 'إضاءة جيدة', 'للقدمين: كرسي مريح وإمكانية الوصول إلى الماء'],
  },
  faceKit: {
    fr: ['Produits de soin adaptés au type de peau', 'Serviettes chaudes et linge propre', 'Bandeau et petit matériel', 'Coussin de nuque'],
    en: ['Skincare products suited to your skin type', 'Hot towels and clean linen', 'Headband and small equipment', 'Neck cushion'],
    ar: ['منتجات عناية مناسبة لنوع البشرة', 'مناشف ساخنة وبياضات نظيفة', 'عصابة رأس وأدوات صغيرة', 'وسادة للرقبة'],
  },
  facePrep: {
    fr: ['Un lit, un canapé ou un espace pour la table', 'Une prise électrique et un point d’eau à proximité', 'Venir le visage sans maquillage si possible'],
    en: ['A bed, sofa or space for the table', 'A power socket and water nearby', 'Come without make-up if possible'],
    ar: ['سرير أو أريكة أو مساحة للطاولة', 'مقبس كهربائي ومصدر ماء قريبان', 'الحضور دون مكياج إن أمكن'],
  },
};

export const services = [
  // ——— Massages ———
  {
    id: 'massage-relaxant', category: 'massages', groups: true,
    options: [60, 90],
    name: { fr: 'Massage relaxant', en: 'Relaxing massage', ar: 'تدليك مريح' },
    summary: {
      fr: 'Un massage du corps enveloppant, aux gestes lents et réguliers.',
      en: 'A soothing full-body massage with slow, steady strokes.',
      ar: 'تدليك شامل للجسم بحركات بطيئة ومنتظمة.',
    },
    description: {
      fr: 'Un massage complet aux huiles, du dos jusqu’aux pieds, dont la pression s’ajuste à votre préférence. Un moment pour relâcher la journée sans quitter votre intérieur.',
      en: 'A full-body oil massage, from back to feet, with pressure adjusted to your preference. A moment to let the day go without leaving your home.',
      ar: 'تدليك كامل بالزيوت من الظهر إلى القدمين، بضغط يُعدَّل حسب رغبتك. لحظة للتخلّص من تعب اليوم دون مغادرة بيتك.',
    },
    includes: {
      fr: ['Échange rapide sur vos préférences de pression', 'Massage du dos, des jambes, des bras et de la nuque', 'Quelques minutes de repos à la fin'],
      en: ['Short chat about your pressure preferences', 'Back, legs, arms and neck', 'A few quiet minutes at the end'],
      ar: ['حديث قصير حول الضغط المفضّل لديك', 'تدليك الظهر والساقين والذراعين والرقبة', 'دقائق من الراحة في النهاية'],
    },
    kit: common.massageKit, prep: common.massagePrep,
  },
  {
    id: 'massage-dos-nuque', category: 'massages', groups: true,
    options: [30, 45],
    name: { fr: 'Dos, nuque & épaules', en: 'Back, neck & shoulders', ar: 'الظهر والرقبة والكتفان' },
    summary: {
      fr: 'Un massage ciblé, idéal pour une pause courte.',
      en: 'A focused massage, ideal for a short break.',
      ar: 'تدليك مركّز، مثالي لاستراحة قصيرة.',
    },
    description: {
      fr: 'Un massage concentré sur le haut du corps, là où l’on accumule souvent les tensions du quotidien. Peut se faire sur table ou assis·e.',
      en: 'A massage focused on the upper body, where everyday tension tends to build up. Can be done on the table or seated.',
      ar: 'تدليك يركّز على الجزء العلوي من الجسم حيث يتراكم توتر الحياة اليومية. يمكن إجراؤه على الطاولة أو جلوساً.',
    },
    includes: {
      fr: ['Massage du dos, des épaules et de la nuque', 'Pression ajustée à votre confort'],
      en: ['Back, shoulders and neck', 'Pressure adjusted to your comfort'],
      ar: ['تدليك الظهر والكتفين والرقبة', 'ضغط يُعدَّل حسب راحتك'],
    },
    kit: common.massageKit, prep: common.massagePrep,
  },
  {
    id: 'rituel-argan', category: 'massages', groups: false,
    options: [75],
    name: { fr: 'Rituel à l’huile d’argan', en: 'Argan oil ritual', ar: 'طقس زيت الأركان' },
    summary: {
      fr: 'Un massage complet à l’huile d’argan, aux notes chaleureuses.',
      en: 'A full-body massage with warm-scented argan oil.',
      ar: 'تدليك كامل بزيت الأركان بروائح دافئة.',
    },
    description: {
      fr: 'Un hommage aux gestes et aux produits du Maroc : un massage complet à l’huile d’argan tiédie, dans une ambiance très douce. La provenance de l’huile sera précisée par la professionnelle.',
      en: 'A nod to Moroccan rituals: a full-body massage with gently warmed argan oil, in a calm atmosphere. The origin of the oil will be specified by the practitioner.',
      ar: 'تحية لطقوس المغرب ومنتجاته: تدليك كامل بزيت الأركان الدافئ في أجواء هادئة جداً. ستحدّد المختصة مصدر الزيت.',
    },
    includes: {
      fr: ['Huile d’argan tiédie', 'Massage complet du corps', 'Serviette chaude pour terminer'],
      en: ['Gently warmed argan oil', 'Full-body massage', 'Hot towel to finish'],
      ar: ['زيت أركان دافئ', 'تدليك كامل للجسم', 'منشفة ساخنة في الختام'],
    },
    kit: common.massageKit, prep: common.massagePrep,
  },
  {
    id: 'massage-pieds-jambes', category: 'massages', groups: true,
    options: [30, 45],
    name: { fr: 'Pieds & jambes', en: 'Feet & legs', ar: 'القدمان والساقان' },
    summary: {
      fr: 'Un massage doux des pieds et des jambes, en position assise ou allongée.',
      en: 'A gentle foot and leg massage, seated or lying down.',
      ar: 'تدليك لطيف للقدمين والساقين، جلوساً أو استلقاءً.',
    },
    description: {
      fr: 'Un moment simple et apprécié après une journée de visite ou de marche dans la ville. Se combine facilement avec une manucure ou un soin du visage.',
      en: 'A simple, much-appreciated treat after a day of sightseeing or walking around the city. Pairs easily with a manicure or a facial.',
      ar: 'لحظة بسيطة ومحبّبة بعد يوم من الزيارات أو المشي في المدينة. تُجمع بسهولة مع العناية باليدين أو بالوجه.',
    },
    includes: {
      fr: ['Bain de pieds tiède', 'Massage des pieds, des chevilles et des mollets'],
      en: ['Warm foot bath', 'Feet, ankles and calves'],
      ar: ['حمّام قدمين فاتر', 'تدليك القدمين والكاحلين وربلتي الساقين'],
    },
    kit: common.massageKit, prep: common.massagePrep,
  },

  // ——— Ongles ———
  {
    id: 'manucure-classique', category: 'ongles', groups: true,
    options: [45],
    name: { fr: 'Manucure classique', en: 'Classic manicure', ar: 'عناية كلاسيكية باليدين' },
    summary: { fr: 'Forme, cuticules et vernis classique.', en: 'Shaping, cuticles and classic polish.', ar: 'تشكيل الأظافر والجُليدات وطلاء عادي.' },
    description: {
      fr: 'Des ongles nets et réguliers : mise en forme, soin des cuticules, hydratation des mains et pose d’un vernis classique.',
      en: 'Neat, even nails: shaping, cuticle care, hand moisturising and a classic polish.',
      ar: 'أظافر مرتّبة ومتناسقة: تشكيل، عناية بالجُليدات، ترطيب لليدين ووضع طلاء عادي.',
    },
    includes: {
      fr: ['Mise en forme des ongles', 'Soin des cuticules', 'Crème pour les mains', 'Vernis classique'],
      en: ['Nail shaping', 'Cuticle care', 'Hand cream', 'Classic polish'],
      ar: ['تشكيل الأظافر', 'العناية بالجُليدات', 'كريم لليدين', 'طلاء عادي'],
    },
    kit: common.nailKit, prep: common.nailPrep,
  },
  {
    id: 'manucure-semi-permanent', category: 'ongles', groups: true,
    options: [60],
    name: { fr: 'Manucure semi-permanent', en: 'Gel polish manicure', ar: 'عناية باليدين بطلاء شبه دائم' },
    summary: { fr: 'Une couleur qui tient plus longtemps, séchée sous lampe.', en: 'Longer-lasting colour, cured under a lamp.', ar: 'لون يدوم أطول، يُجفَّف تحت المصباح.' },
    description: {
      fr: 'La manucure complète avec un vernis semi-permanent, pratique avant un voyage ou un événement. La tenue varie selon les ongles et les activités.',
      en: 'A full manicure with gel polish, handy before a trip or an event. Wear time varies with your nails and activities.',
      ar: 'عناية كاملة باليدين مع طلاء شبه دائم، عملية قبل سفر أو مناسبة. تختلف مدة الثبات حسب الأظافر والأنشطة.',
    },
    includes: {
      fr: ['Préparation de l’ongle', 'Base, couleur et top coat', 'Séchage sous lampe LED'],
      en: ['Nail preparation', 'Base, colour and top coat', 'LED curing'],
      ar: ['تحضير الظفر', 'طبقة أساس ولون وطبقة نهائية', 'تجفيف تحت مصباح LED'],
    },
    kit: common.nailKit, prep: common.nailPrep,
  },
  {
    id: 'pedicure-classique', category: 'ongles', groups: true,
    options: [50],
    name: { fr: 'Pédicure classique', en: 'Classic pedicure', ar: 'عناية كلاسيكية بالقدمين' },
    summary: { fr: 'Bain de pieds, soin des ongles et vernis.', en: 'Foot soak, nail care and polish.', ar: 'حمّام قدمين، عناية بالأظافر وطلاء.' },
    description: {
      fr: 'Un soin esthétique des pieds : bain tiède, mise en forme des ongles, travail doux des callosités et vernis classique. Ce soin n’est pas un soin de podologie.',
      en: 'A cosmetic foot treatment: warm soak, nail shaping, gentle smoothing of rough skin and classic polish. This is not a podiatry treatment.',
      ar: 'عناية تجميلية بالقدمين: حمّام فاتر، تشكيل الأظافر، تنعيم لطيف للجلد القاسي وطلاء عادي. ليست هذه عناية طبية بالقدم.',
    },
    includes: {
      fr: ['Bain de pieds', 'Ongles et cuticules', 'Lissage doux des talons', 'Vernis classique'],
      en: ['Foot soak', 'Nails and cuticles', 'Gentle heel smoothing', 'Classic polish'],
      ar: ['حمّام للقدمين', 'الأظافر والجُليدات', 'تنعيم لطيف للكعبين', 'طلاء عادي'],
    },
    kit: common.nailKit, prep: common.nailPrep,
  },
  {
    id: 'pedicure-semi-permanent', category: 'ongles', groups: true,
    options: [70],
    name: { fr: 'Pédicure semi-permanent', en: 'Gel polish pedicure', ar: 'عناية بالقدمين بطلاء شبه دائم' },
    summary: { fr: 'La pédicure complète, finition semi-permanente.', en: 'The full pedicure with a gel polish finish.', ar: 'عناية كاملة بالقدمين بلمسة طلاء شبه دائم.' },
    description: {
      fr: 'La pédicure classique, terminée par un vernis semi-permanent séché sous lampe. Idéal avant les vacances ou une saison de sandales.',
      en: 'The classic pedicure, finished with gel polish cured under a lamp. Ideal before a holiday or sandal season.',
      ar: 'العناية الكلاسيكية بالقدمين، تُختتم بطلاء شبه دائم يُجفَّف تحت المصباح. مثالية قبل العطلة أو موسم الصنادل.',
    },
    includes: {
      fr: ['Pédicure classique', 'Base, couleur et top coat', 'Séchage sous lampe LED'],
      en: ['Classic pedicure', 'Base, colour and top coat', 'LED curing'],
      ar: ['عناية كلاسيكية بالقدمين', 'طبقة أساس ولون وطبقة نهائية', 'تجفيف تحت مصباح LED'],
    },
    kit: common.nailKit, prep: common.nailPrep,
  },
  {
    id: 'pose-gel', category: 'ongles', groups: false,
    options: [120],
    name: { fr: 'Pose de gel', en: 'Gel extensions', ar: 'تركيب الجل' },
    summary: { fr: 'Allongement ou renfort de l’ongle au gel.', en: 'Nail lengthening or overlay with gel.', ar: 'إطالة الظفر أو تقويته بالجل.' },
    description: {
      fr: 'Une pose de gel sur ongle naturel ou avec allongement, avec la forme et la longueur de votre choix. Les styles et décorations possibles seront précisés par la professionnelle.',
      en: 'Gel on natural nails or with extensions, in the shape and length you choose. Available styles and nail art will be confirmed by the practitioner.',
      ar: 'تركيب الجل على الظفر الطبيعي أو مع إطالة، بالشكل والطول اللذين تختارونهما. ستحدّد المختصة الأنماط والزخارف المتاحة.',
    },
    includes: {
      fr: ['Préparation de l’ongle', 'Construction au gel', 'Mise en forme et finition', 'Couleur unie'],
      en: ['Nail preparation', 'Gel build', 'Shaping and finishing', 'Solid colour'],
      ar: ['تحضير الظفر', 'بناء بالجل', 'تشكيل ولمسة نهائية', 'لون موحّد'],
    },
    kit: common.nailKit, prep: common.nailPrep,
  },
  {
    id: 'depose', category: 'ongles', groups: true,
    options: [30],
    name: { fr: 'Dépose', en: 'Removal', ar: 'إزالة الطلاء أو الجل' },
    summary: { fr: 'Retrait soigneux du semi-permanent ou du gel.', en: 'Careful removal of gel polish or gel.', ar: 'إزالة متأنية للطلاء شبه الدائم أو الجل.' },
    description: {
      fr: 'Le retrait du semi-permanent ou du gel, en préservant l’ongle naturel. Peut précéder une nouvelle pose.',
      en: 'Removal of gel polish or gel while protecting the natural nail. Can be followed by a new set.',
      ar: 'إزالة الطلاء شبه الدائم أو الجل مع الحفاظ على الظفر الطبيعي. يمكن أن تسبق تركيباً جديداً.',
    },
    includes: {
      fr: ['Retrait du produit', 'Mise en forme', 'Huile pour cuticules'],
      en: ['Product removal', 'Shaping', 'Cuticle oil'],
      ar: ['إزالة المنتج', 'تشكيل الأظافر', 'زيت للجُليدات'],
    },
    kit: common.nailKit, prep: common.nailPrep,
  },

  // ——— Visage ———
  {
    id: 'soin-visage-essentiel', category: 'visage', groups: true,
    options: [45],
    name: { fr: 'Soin du visage essentiel', en: 'Essential facial', ar: 'العناية الأساسية بالوجه' },
    summary: { fr: 'Nettoyage, gommage doux, masque et hydratation.', en: 'Cleanse, gentle exfoliation, mask and moisturiser.', ar: 'تنظيف، تقشير لطيف، قناع وترطيب.' },
    description: {
      fr: 'Les étapes de base d’un bon soin, pour un visage frais et une sensation de confort. Les produits sont choisis selon votre type de peau.',
      en: 'The core steps of a good facial, for a fresh, comfortable feel. Products are chosen for your skin type.',
      ar: 'الخطوات الأساسية لعناية جيدة، لوجه منتعش وإحساس بالراحة. تُختار المنتجات حسب نوع بشرتك.',
    },
    includes: {
      fr: ['Démaquillage et nettoyage', 'Gommage doux', 'Masque', 'Crème hydratante'],
      en: ['Make-up removal and cleansing', 'Gentle exfoliation', 'Mask', 'Moisturiser'],
      ar: ['إزالة المكياج والتنظيف', 'تقشير لطيف', 'قناع', 'كريم مرطّب'],
    },
    kit: common.faceKit, prep: common.facePrep,
  },
  {
    id: 'soin-visage-complet', category: 'visage', groups: false,
    options: [75],
    name: { fr: 'Soin du visage complet', en: 'Signature facial', ar: 'العناية الكاملة بالوجه' },
    summary: { fr: 'Le soin essentiel, avec modelage du visage et du cou.', en: 'The essential facial, plus face and neck massage.', ar: 'العناية الأساسية مع تدليك الوجه والرقبة.' },
    description: {
      fr: 'Un soin plus long, qui ajoute un modelage du visage, du cou et du décolleté ainsi qu’un masque adapté. Le moment le plus enveloppant de la gamme visage.',
      en: 'A longer facial adding a face, neck and décolleté massage and a tailored mask. The most indulgent of the facial range.',
      ar: 'عناية أطول تضيف تدليكاً للوجه والرقبة وأعلى الصدر وقناعاً مناسباً. أكثر لحظات العناية بالوجه دفئاً.',
    },
    includes: {
      fr: ['Nettoyage et gommage', 'Serviettes chaudes', 'Modelage visage, cou et décolleté', 'Masque et soin final'],
      en: ['Cleansing and exfoliation', 'Hot towels', 'Face, neck and décolleté massage', 'Mask and finishing care'],
      ar: ['تنظيف وتقشير', 'مناشف ساخنة', 'تدليك الوجه والرقبة وأعلى الصدر', 'قناع وعناية ختامية'],
    },
    kit: common.faceKit, prep: common.facePrep,
  },
  {
    id: 'soin-visage-express', category: 'visage', groups: true,
    options: [30],
    name: { fr: 'Soin express avant sortie', en: 'Express pre-event facial', ar: 'عناية سريعة قبل الخروج' },
    summary: { fr: 'Un soin court pour arriver fraîche à une soirée.', en: 'A short facial to feel fresh before an evening out.', ar: 'عناية قصيرة للشعور بالانتعاش قبل سهرة.' },
    description: {
      fr: 'Un soin rapide pour préparer la peau avant une sortie ou un maquillage : nettoyage, masque express et hydratation.',
      en: 'A quick facial to prepare the skin before an evening out or make-up: cleanse, express mask and moisturiser.',
      ar: 'عناية سريعة لتحضير البشرة قبل الخروج أو قبل المكياج: تنظيف، قناع سريع وترطيب.',
    },
    includes: {
      fr: ['Nettoyage', 'Masque express', 'Hydratation'],
      en: ['Cleanse', 'Express mask', 'Moisturiser'],
      ar: ['تنظيف', 'قناع سريع', 'ترطيب'],
    },
    kit: common.faceKit, prep: common.facePrep,
  },
];

/** Packs — compositions proposées, à valider */
export const packs = [
  {
    id: 'pack-detente', duration: 105, guests: { fr: '1 personne', en: '1 person', ar: 'شخص واحد' },
    name: { fr: 'Pack Détente', en: 'Unwind pack', ar: 'باقة الاسترخاء' },
    contents: ['massage-relaxant', 'soin-visage-essentiel'],
    description: {
      fr: 'Un massage relaxant de 60 minutes suivi d’un soin du visage essentiel.',
      en: 'A 60-minute relaxing massage followed by an essential facial.',
      ar: 'تدليك مريح لمدة 60 دقيقة تليه عناية أساسية بالوجه.',
    },
  },
  {
    id: 'pack-mains-pieds', duration: 95, guests: { fr: '1 personne', en: '1 person', ar: 'شخص واحد' },
    name: { fr: 'Pack Mains & Pieds', en: 'Hands & Feet pack', ar: 'باقة اليدين والقدمين' },
    contents: ['manucure-classique', 'pedicure-classique'],
    description: {
      fr: 'Manucure et pédicure classiques réunies en un seul rendez-vous.',
      en: 'Classic manicure and pedicure in a single appointment.',
      ar: 'عناية كلاسيكية باليدين والقدمين في موعد واحد.',
    },
  },
  {
    id: 'pack-entre-amies', duration: null, guests: { fr: '2 à 4 personnes', en: '2 to 4 people', ar: 'من 2 إلى 4 أشخاص' },
    name: { fr: 'Pack Entre amies', en: 'Friends pack', ar: 'باقة الصديقات' },
    contents: ['massage-dos-nuque', 'manucure-semi-permanent', 'soin-visage-express'],
    description: {
      fr: 'Un après-midi à composer à plusieurs, chacune choisissant ses soins parmi une sélection courte.',
      en: 'An afternoon to put together as a group, each guest choosing from a short selection.',
      ar: 'أمسية تُنظَّم جماعياً، يختار فيها كل شخص علاجاته من قائمة قصيرة.',
    },
  },
  {
    id: 'pack-evenement', duration: null, guests: { fr: 'Groupes', en: 'Groups', ar: 'مجموعات' },
    name: { fr: 'Pack Événement', en: 'Event pack', ar: 'باقة المناسبات' },
    contents: ['manucure-semi-permanent', 'soin-visage-express', 'massage-pieds-jambes'],
    description: {
      fr: 'Pour une fête, un mariage ou un séjour en riad : programme et organisation établis sur demande.',
      en: 'For a party, a wedding or a riad stay: programme and logistics arranged on request.',
      ar: 'لحفلة أو زفاف أو إقامة في رياض: يُعدّ البرنامج والتنظيم حسب الطلب.',
    },
  },
];
