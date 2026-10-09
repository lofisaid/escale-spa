// Escale Spa — questionnaire de validation (page cachée /validation-projet/).
// Aucune requête réseau, aucune mesure d'audience : les réponses restent dans le navigateur (localStorage)
// et ne sortent que par les fichiers que la propriétaire télécharge elle-même.

const DATA = JSON.parse(document.getElementById('vp-data').textContent);
const UNDEC = '@decide';
const STORE_KEY = 'escale-validation-projet-v1';
const APP = document.getElementById('vp-app');
const LIVE = document.getElementById('vp-live');

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const L = (fr, ar) => ({ fr, ar });
const O = (v, fr, ar) => ({ v, l: L(fr, ar) });
const idOf = (k) => 'f_' + k.replace(/[^a-z0-9]/gi, '_');

let lang = 'fr';
let step = 0;
let answers = {};
const ui = { open: {} };
let storageOK = true;
let savedAt = null;

const tx = (o) => (o ? o[lang] ?? o.fr : '');

/* ————————————————————————————— stockage local */
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d && d.v === 1) {
      answers = d.answers && typeof d.answers === 'object' ? d.answers : {};
      if (d.lang === 'fr' || d.lang === 'ar') lang = d.lang;
      if (Number.isInteger(d.step) && d.step >= 0) step = d.step;
      savedAt = d.savedAt || null;
    }
  } catch { storageOK = false; }
}
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 250);
}
function saveNow() {
  try {
    savedAt = new Date().toISOString();
    localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, lang, step, answers, savedAt }));
    storageOK = true;
  } catch { storageOK = false; }
  const el = document.getElementById('vp-saved');
  if (el) el.textContent = savedText();
}
const savedText = () => {
  if (!storageOK) return tx(S.noStorage);
  if (!savedAt) return tx(S.savedNone);
  const d = new Date(savedAt);
  return tx(S.savedAt).replace('{t}', d.toLocaleTimeString(lang === 'ar' ? 'ar-MA-u-nu-latn' : 'fr-FR', { hour: '2-digit', minute: '2-digit' }));
};

/* ————————————————————————————— textes de l'interface */
const S = {
  skip: L('Aller au questionnaire', 'الانتقال إلى الاستبيان'),
  step: L('Étape {n} sur {t}', 'الخطوة {n} من {t}'),
  prev: L('Retour', 'رجوع'),
  next: L('Continuer', 'متابعة'),
  toRecap: L('Voir le récapitulatif', 'عرض الملخّص'),
  undec: L('À décider', 'لم أقرّر بعد'),
  unanswered: L('Non répondu', 'بدون إجابة'),
  none: L('—', '—'),
  edit: L('Modifier', 'تعديل'),
  stepsNav: L('Étapes du questionnaire', 'خطوات الاستبيان'),
  clear: L('Effacer mes réponses', 'مسح إجاباتي'),
  clearTitle: L('Effacer toutes vos réponses ?', 'هل تريدين مسح كل إجاباتك؟'),
  clearText: L('Les réponses enregistrées sur cet appareil seront supprimées. Si vous n’avez pas téléchargé vos réponses, elles seront perdues.', 'ستُحذف الإجابات المحفوظة على هذا الجهاز. وإن لم تنزّلي إجاباتك فستضيع.'),
  clearYes: L('Oui, tout effacer', 'نعم، امسح كل شيء'),
  cancel: L('Annuler', 'إلغاء'),
  cleared: L('Vos réponses ont été effacées de cet appareil.', 'تم مسح إجاباتك من هذا الجهاز.'),
  savedAt: L('Réponses enregistrées sur cet appareil à {t}.', 'حُفظت الإجابات على هذا الجهاز عند {t}.'),
  savedNone: L('Vos réponses s’enregistrent sur cet appareil au fur et à mesure.', 'تُحفظ إجاباتك على هذا الجهاز تلقائياً أثناء الكتابة.'),
  noStorage: L('Enregistrement automatique indisponible dans ce navigateur : téléchargez vos réponses avant de quitter la page.', 'الحفظ التلقائي غير متاح في هذا المتصفح: نزّلي إجاباتك قبل مغادرة الصفحة.'),
  localBannerT: L('Vos réponses restent sur cet appareil.', 'تبقى إجاباتك على هذا الجهاز.'),
  localBanner: L('Elles sont enregistrées dans ce navigateur uniquement. Rien n’est envoyé automatiquement : à la fin, vous téléchargerez un fichier à transmettre au responsable du projet.', 'تُحفظ في هذا المتصفح فقط. لا يُرسَل أي شيء تلقائياً: في النهاية ستنزّلين ملفاً تسلّمينه إلى مسؤول المشروع.'),
  noSensitive: L('Merci de ne saisir ici aucune pièce d’identité, aucune coordonnée bancaire, aucune information de santé et aucune information sur vos clientes ou clients.', 'يُرجى عدم إدخال أي وثيقة هوية أو بيانات بنكية أو معلومات صحية أو معلومات عن زبوناتك وزبائنك هنا.'),
  footnote: L('Cette page n’est pas listée sur le site, mais une adresse cachée n’est pas une protection : toute personne qui a le lien peut l’ouvrir. Ne partagez pas ce lien.', 'هذه الصفحة غير ظاهرة في الموقع، لكن العنوان المخفي ليس حماية: يمكن لأي شخص يملك الرابط فتحها. لا تشاركي هذا الرابط.'),
  proposal: L('Ce que propose le prototype', 'ما يقترحه النموذج الأولي'),
  proposalNote: L('Ces éléments sont des propositions à valider, pas des informations confirmées.', 'هذه العناصر مجرد اقتراحات للتحقق منها، وليست معلومات مؤكدة.'),
  composition: L('Composition proposée', 'التركيبة المقترحة'),
  durationsProposed: L('Durées proposées', 'المدد المقترحة'),
  priceTbc: L('Prix : à confirmer (aucun prix n’est confirmé)', 'السعر: قيد التأكيد (لا يوجد أي سعر مؤكَّد)'),
  groupsOk: L('Possible à plusieurs.', 'متاحة للمجموعات.'),
  min: L('min', 'دقيقة'),
  mad: L('MAD', 'درهم'),
  people: L('personnes', 'أشخاص'),
  recapTitle: L('Récapitulatif de vos réponses', 'ملخّص إجاباتك'),
  recapLead: L('Relisez, corrigez avec « Modifier », puis téléchargez vos réponses.', 'أعيدي القراءة، وصحّحي بزر «تعديل»، ثم نزّلي إجاباتك.'),
  retained: L('Services retenus', 'الخدمات المعتمدة'),
  retainedNone: L('Aucun service retenu pour l’instant.', 'لا توجد خدمات معتمدة حتى الآن.'),
  decisions: L('Décisions', 'القرارات'),
  missing: L('Informations manquantes', 'معلومات ناقصة'),
  missingNone: L('Aucune information manquante parmi les points essentiels.', 'لا توجد معلومات ناقصة في النقاط الأساسية.'),
  undecidedList: L('Points marqués « À décider »', 'نقاط محدَّدة «لم أقرّر بعد»'),
  finalNote: L('Remarque finale (facultatif)', 'ملاحظة أخيرة (اختياري)'),
  dlJson: L('Télécharger mes réponses (JSON)', 'تنزيل إجاباتي (JSON)'),
  dlTxt: L('Télécharger un résumé lisible (.txt)', 'تنزيل ملخّص مقروء (.txt)'),
  print: L('Imprimer / enregistrer en PDF', 'طباعة / حفظ بصيغة PDF'),
  transmitT: L('Et ensuite ?', 'وماذا بعد؟'),
  transmit: L('Aucune réponse n’a été envoyée : ce questionnaire n’est relié à aucun serveur. Téléchargez le fichier JSON (et, si vous le souhaitez, le résumé .txt ou le PDF), puis transmettez-le vous-même au responsable du projet, par exemple par WhatsApp ou par e-mail. Gardez une copie.', 'لم تُرسَل أي إجابة: هذا الاستبيان غير مرتبط بأي خادم. نزّلي ملف JSON (وإن رغبتِ الملخّص النصي أو ملف PDF) ثم سلّميه بنفسك إلى مسؤول المشروع، مثلاً عبر واتساب أو البريد الإلكتروني. واحتفظي بنسخة.'),
  downloaded: L('Fichier téléchargé. Pensez à le transmettre au responsable du projet.', 'تم تنزيل الملف. لا تنسَي تسليمه إلى مسؤول المشروع.'),
  countProp: L('Je propose', 'أقترحها'), countLater: L('Plus tard', 'لاحقاً'), countNo: L('Je ne propose pas', 'لا أقترحها'),
  countUndec: L('À décider', 'لم أقرّر بعد'), countNone: L('Non répondu', 'بدون إجابة'),
  svcCount: L('Services', 'الخدمات'), packCount: L('Packs', 'الباقات'),
  generated: L('Généré le', 'تاريخ الإنشاء'),
  docTitle: L('Validation du projet Escale Spa — réponses', 'التحقق من مشروع Escale Spa — الإجابات'),
  docNotice: L('Ce document n’a été envoyé à personne. Il contient des propositions et des décisions à valider, pas des informations publiées.', 'لم يُرسَل هذا المستند إلى أحد. يحتوي على اقتراحات وقرارات قيد التحقق، وليس معلومات منشورة.'),
};

/* ————————————————————————————— définition des champs */
const cat = (id) => DATA.categories.find((c) => c.id === id);
const svcName = (s) => tx(s.name);
const optsLabel = (s) => s.options.map((m) => `${m} ${tx(S.min)}`).join(' · ');

const fText = (k, label, o = {}) => ({ k, type: 'text', label, ...o });
const fNum = (k, label, o = {}) => ({ k, type: 'number', label, ...o });
const fLong = (k, label, o = {}) => ({ k, type: 'long', label, ...o });
const fChoice = (k, label, options, o = {}) => ({ k, type: 'choice', label, options, ...o });
const fMulti = (k, label, options, o = {}) => ({ k, type: 'multi', label, options, ...o });

const LANG_OPTS = [
  O('darija', 'Arabe dialectal marocain (darija)', 'العربية الدارجة المغربية'), O('amazigh', 'Amazighe', 'الأمازيغية'),
  O('fr', 'Français', 'الفرنسية'), O('en', 'Anglais', 'الإنجليزية'), O('es', 'Espagnol', 'الإسبانية'), O('other', 'Autre', 'أخرى'),
];

function identityFields() {
  return [
    { group: L('Nom et contact professionnels', 'الاسم ووسائل التواصل المهنية'), fields: [
      fChoice('id.nameChoice', L('Nom commercial', 'الاسم التجاري'), [O('keep', 'Je garde le nom « Escale Spa »', 'أحتفظ بالاسم «Escale Spa»'), O('change', 'Je souhaite un autre nom', 'أرغب في اسم آخر')], { key: true, hint: L('Le nom du prototype est provisoire.', 'اسم النموذج الأولي مؤقت.') }),
      fText('id.nameNew', L('Nom souhaité', 'الاسم المرغوب'), { showIf: (a) => a['id.nameChoice'] === 'change' }),
      fText('id.owner', L('Prénom ou nom d’usage à afficher', 'الاسم الأول أو الاسم المستعمل الذي يظهر في الموقع'), { key: true }),
      fText('id.phone', L('Téléphone professionnel', 'الهاتف المهني'), { key: true, hint: L('Un numéro dédié à l’activité si possible.', 'يفضَّل رقم مخصَّص للنشاط.') }),
      fText('id.whatsapp', L('Numéro WhatsApp professionnel', 'رقم واتساب المهني'), { key: true, hint: L('Format international, par exemple +212 6…', 'بالصيغة الدولية، مثل ‎+212 6…') }),
      fText('id.email', L('Adresse e-mail professionnelle', 'البريد الإلكتروني المهني')),
      fText('id.instagram', L('Compte Instagram professionnel (s’il existe)', 'حساب إنستغرام المهني (إن وُجد)')),
    ] },
    { group: L('Langues parlées avec les clientes', 'اللغات المستعملة مع الزبونات'), fields: [
      fMulti('id.langs', L('Langues dans lesquelles vous pouvez accueillir', 'اللغات التي يمكنك الاستقبال بها'), LANG_OPTS, { key: true }),
      fText('id.langOther', L('Autre(s) langue(s)', 'لغات أخرى'), { showIf: (a) => (a['id.langs'] || []).includes('other'), undec: false }),
    ] },
    { group: L('Expérience et qualifications', 'الخبرة والمؤهلات'), fields: [
      fNum('id.yMassage', L('Années d’expérience en massage', 'سنوات الخبرة في التدليك'), { unit: L('ans', 'سنة'), hint: L('Indiquez 0 si vous ne pratiquez pas ce domaine.', 'اكتبي 0 إن لم تمارسي هذا المجال.') }),
      fNum('id.yNails', L('Années d’expérience en manucure, pédicure et onglerie', 'سنوات الخبرة في العناية بالأظافر'), { unit: L('ans', 'سنة') }),
      fNum('id.yFace', L('Années d’expérience en soins du visage', 'سنوات الخبرة في العناية بالوجه'), { unit: L('ans', 'سنة') }),
      fMulti('id.quals', L('Qualifications que vous pourrez justifier si on vous le demande', 'المؤهلات التي يمكنك إثباتها عند الطلب'), [
        O('diploma', 'Diplôme', 'دبلوم'), O('cert', 'Certificat de formation', 'شهادة تكوين'), O('employer', 'Attestation d’un employeur ou d’un salon', 'شهادة من مشغّل أو صالون'),
        O('brand', 'Formation d’une marque ou d’un fabricant de produits', 'تكوين من علامة أو مُصنِّع منتجات'), O('insurance', 'Assurance responsabilité civile professionnelle', 'تأمين المسؤولية المدنية المهنية'), O('none', 'Aucune pour le moment', 'لا شيء حالياً'),
      ], { key: true }),
      fLong('id.qualsDetail', L('Précisions (intitulé, organisme, année)', 'تفاصيل (العنوان، الجهة، السنة)'), { hint: L('Ne joignez aucun document ici : indiquez seulement ce que vous pourrez prouver.', 'لا تُرفقي أي وثيقة هنا: اكتبي فقط ما يمكنك إثباته.') }),
    ] },
  ];
}

const DEC_SVC = [O('propose', 'Je propose', 'أقترح هذه الخدمة'), O('later', 'Plus tard', 'لاحقاً'), O('no', 'Je ne propose pas', 'لا أقترحها')];
const DEC_PACK = [O('keep', 'Conserver', 'الإبقاء عليها'), O('modify', 'Modifier', 'تعديلها'), O('delete', 'Supprimer', 'حذفها')];

function svcFields(s) {
  const k = (x) => `svc.${s.id}.${x}`;
  const prop = (a) => a[k('decision')] === 'propose';
  return [
    fChoice(k('decision'), L('Proposez-vous cette prestation ?', 'هل ستقترحين هذه الخدمة؟'), DEC_SVC, { key: true }),
    fText(k('name'), L('Correction du nom (laisser vide si le nom convient)', 'تصحيح الاسم (اتركيه فارغاً إن كان مناسباً)'), { showIf: prop, undec: false }),
    fText(k('dur'), L('Durée réelle de la prestation', 'المدة الفعلية للخدمة'), { showIf: prop, key: true, hint: L(`Le prototype propose : ${optsLabel(s)}. Ex. : « 60 min et 90 min ».`, `يقترح النموذج: ${optsLabel(s)}. مثال: «60 دقيقة و90 دقيقة».`) }),
    ...s.options.map((m) => fNum(k('price.' + m), L(`Prix pour ${m} min`, `السعر لمدة ${m} دقيقة`), { showIf: prop, key: true, unit: L('MAD', 'درهم'), hint: L('Le prix pour la durée proposée par le prototype. Si vos durées sont différentes, précisez-le dans « Remarque ».', 'السعر للمدة التي يقترحها النموذج. وإن اختلفت مددك فاذكري ذلك في «ملاحظة».') })),
    fChoice(k('comp'), L('La composition proposée vous convient-elle ?', 'هل تناسبك التركيبة المقترحة؟'), [O('ok', 'Oui, elle convient', 'نعم، تناسبني'), O('modify', 'Je veux la modifier', 'أريد تعديلها')], { showIf: prop, key: true }),
    fLong(k('incl'), L('Ce qui est inclus (vos inclusions réelles)', 'ما تشمله الخدمة (التفاصيل الفعلية)'), { showIf: prop }),
    fLong(k('excl'), L('Ce qui n’est pas inclus (exclusions)', 'ما لا تشمله الخدمة (الاستثناءات)'), { showIf: prop }),
    fLong(k('prod'), L('Produits et marques utilisés', 'المنتجات والعلامات المستعملة'), { showIf: prop }),
    fLong(k('fix'), L('Corrections du texte de présentation', 'تصحيحات نص التقديم'), { showIf: prop, hint: L('Mots à changer, phrases trop fortes, erreurs… Écrivez simplement.', 'كلمات تُغيَّر، جمل مبالغ فيها، أخطاء… اكتبي ببساطة.') }),
    fLong(k('note'), L('Remarque libre', 'ملاحظة حرة'), { undec: false }),
  ];
}

function packFields(p) {
  const k = (x) => `pack.${p.id}.${x}`;
  const act = (a) => ['keep', 'modify'].includes(a[k('decision')]);
  return [
    fChoice(k('decision'), L('Que souhaitez-vous faire de ce pack ?', 'ماذا تريدين أن تفعلي بهذه الباقة؟'), DEC_PACK, { key: true }),
    fLong(k('comp'), L('Composition réelle du pack', 'التركيبة الفعلية للباقة'), { showIf: act, hint: L('Quels soins, dans quel ordre.', 'أي عناية، وبأي ترتيب.') }),
    fText(k('dur'), L('Durée totale réelle', 'المدة الإجمالية الفعلية'), { showIf: act, key: true }),
    fNum(k('price'), L('Prix du pack', 'سعر الباقة'), { showIf: act, key: true, unit: L('MAD', 'درهم') }),
    fNum(k('cap'), L('Nombre maximum de personnes que vous pouvez servir', 'أقصى عدد من الأشخاص الذين يمكنك خدمتهم'), { showIf: act, key: true, unit: L('personnes', 'أشخاص'), hint: L(`Le prototype indique : ${tx(p.guests)}.`, `يذكر النموذج: ${tx(p.guests)}.`) }),
    fLong(k('note'), L('Remarque libre', 'ملاحظة حرة'), { undec: false }),
  ];
}

function orgFields() {
  return [
    { group: L('Votre organisation', 'تنظيم عملك'), fields: [
      fChoice('org.mode', L('Travaillez-vous seule ou en équipe ?', 'هل تعملين وحدك أم ضمن فريق؟'), [O('alone', 'Seule', 'وحدي'), O('team', 'En équipe', 'ضمن فريق'), O('later', 'Seule pour l’instant, en équipe plus tard', 'وحدي حالياً وضمن فريق لاحقاً')], { key: true }),
      fNum('org.team', L('Nombre de personnes dans l’équipe (vous comprise)', 'عدد أفراد الفريق (معك)'), { showIf: (a) => ['team', 'later'].includes(a['org.mode']), unit: L('personnes', 'أشخاص') }),
      fNum('org.perDay', L('Nombre maximum de rendez-vous par jour', 'أقصى عدد من المواعيد في اليوم'), { key: true }),
    ] },
    { group: L('Clientèle acceptée', 'الزبائن المقبولون'), fields: [
      fMulti('org.clients', L('Qui acceptez-vous ?', 'من تقبلين؟'), [
        O('women', 'Femmes', 'نساء'), O('men', 'Hommes', 'رجال'), O('couples', 'Couples', 'أزواج'), O('groups', 'Groupes d’amies ou de famille', 'مجموعات صديقات أو عائلة'),
        O('tourists', 'Visiteuses et visiteurs étrangers', 'زائرات وزوار أجانب'), O('residents', 'Résidentes et résidents de Marrakech', 'مقيمات ومقيمون في مراكش'), O('teens', 'Adolescentes, avec un adulte présent', 'مراهقات بحضور شخص راشد'),
      ], { key: true }),
      fLong('org.clientNote', L('Conditions ou précisions', 'شروط أو توضيحات')),
    ] },
    { group: L('Groupes', 'المجموعات'), fields: [
      fNum('org.groupMax', L('Nombre maximum de personnes pour un rendez-vous de groupe', 'أقصى عدد من الأشخاص في موعد جماعي'), { key: true, unit: L('personnes', 'أشخاص'), hint: L(`Le formulaire du prototype accepte jusqu’à ${DATA.maxGuests} personnes.`, `يقبل نموذج الطلب في النموذج الأولي حتى ${DATA.maxGuests} شخصاً.`) }),
      fChoice('org.groupHow', L('Comment servez-vous un groupe ?', 'كيف تخدمين مجموعة؟'), [O('seq', 'Seule, une personne après l’autre', 'وحدي، شخصاً بعد آخر'), O('team', 'Avec une équipe, en parallèle', 'مع فريق، في الوقت نفسه'), O('none', 'Je ne fais pas de groupes', 'لا أقدّم خدمات جماعية')]),
      fLong('org.groupNote', L('Précisions sur les groupes', 'توضيحات حول المجموعات')),
    ] },
  ];
}

function travelFields() {
  const kitOpts = ['massage', 'ongles', 'visage'].flatMap((cid) => {
    const fr = DATA.kits[cid]?.fr || [], ar = DATA.kits[cid]?.ar || [];
    return fr.map((f, i) => O(`${cid}:${i}`, f, ar[i] ?? f));
  });
  return [
    { group: L('Zones desservies (proposées par le prototype)', 'المناطق المخدومة (يقترحها النموذج الأولي)'), fields: [
      ...DATA.zones.flatMap((z) => [
        fChoice(`trv.zone.${z.id}`, L(`Zone : ${z.name.fr}`, `المنطقة: ${z.name.ar}`), [O('yes', 'Je me déplace', 'أتنقّل إليها'), O('no', 'Je ne me déplace pas', 'لا أتنقّل إليها')], { key: true, inline: true }),
        fNum(`trv.fee.${z.id}`, L(`Frais de déplacement — ${z.name.fr}`, `رسوم التنقل — ${z.name.ar}`), { showIf: (a) => a[`trv.zone.${z.id}`] === 'yes', unit: L('MAD', 'درهم'), hint: L('Indiquez 0 s’il n’y a pas de frais.', 'اكتبي 0 إن لم تكن هناك رسوم.') }),
      ]),
      fLong('trv.other', L('Autres quartiers ou zones à ajouter', 'أحياء أو مناطق أخرى للإضافة')),
      fLong('trv.feeRule', L('Règle générale des frais (ex. selon la distance)', 'القاعدة العامة للرسوم (مثلاً حسب المسافة)')),
    ] },
    { group: L('Conditions de déplacement', 'شروط التنقل'), fields: [
      fNum('trv.min', L('Minimum de commande pour un déplacement', 'الحد الأدنى للطلب لأجل التنقل'), { key: true, unit: L('MAD', 'درهم')}),
      fChoice('trv.riads', L('Intervenez-vous en riads, villas et hôtels ?', 'هل تتدخلين في الرياضات والفيلات والفنادق؟'), [O('yes', 'Oui', 'نعم'), O('cond', 'Oui, sous conditions', 'نعم، بشروط'), O('no', 'Non', 'لا')], { key: true }),
      fLong('trv.riadsNote', L('Conditions pour les riads, villas et hôtels', 'شروط الرياضات والفيلات والفنادق'), { showIf: (a) => ['yes', 'cond'].includes(a['trv.riads']) }),
    ] },
    { group: L('Matériel que vous apportez (liste issue du prototype)', 'المعدات التي تحضرينها (قائمة من النموذج الأولي)'), fields: [
      fMulti('trv.kit', L('Cochez ce que vous apportez réellement', 'حدّدي ما تحضرينه فعلاً'), kitOpts, { key: true }),
      fLong('trv.kitFix', L('Matériel manquant ou à corriger', 'معدات ناقصة أو تحتاج إلى تصحيح')),
    ] },
  ];
}

const DAYS = [O('mon', 'Lundi', 'الاثنين'), O('tue', 'Mardi', 'الثلاثاء'), O('wed', 'Mercredi', 'الأربعاء'), O('thu', 'Jeudi', 'الخميس'), O('fri', 'Vendredi', 'الجمعة'), O('sat', 'Samedi', 'السبت'), O('sun', 'Dimanche', 'الأحد')];
function availFields() {
  return [
    { group: L('Disponibilités', 'أوقات التوفر'), fields: [
      fMulti('av.days', L('Jours où vous pouvez intervenir', 'الأيام التي يمكنك التدخل فيها'), DAYS, { key: true }),
      fText('av.from', L('Heure de début habituelle', 'ساعة البدء المعتادة'), { key: true, hint: L('Ex. : 9 h', 'مثال: 9 صباحاً') }),
      fText('av.to', L('Heure de fin habituelle', 'ساعة الانتهاء المعتادة'), { key: true, hint: L('Ex. : 19 h', 'مثال: 7 مساءً') }),
      fLong('av.hoursNote', L('Précisions (pauses, vendredi, Ramadan, saison…)', 'توضيحات (استراحات، الجمعة، رمضان، الموسم…)')),
      fChoice('av.notice', L('Délai minimum pour réserver', 'أقل مهلة للحجز'), [O('same', 'Le jour même, si possible', 'في اليوم نفسه إن أمكن'), O('24', '24 heures à l’avance', 'قبل 24 ساعة'), O('48', '48 heures à l’avance', 'قبل 48 ساعة'), O('72', '72 heures à l’avance', 'قبل 72 ساعة'), O('week', 'Une semaine à l’avance', 'قبل أسبوع')], { key: true }),
    ] },
    { group: L('Paiement', 'الأداء'), fields: [
      fMulti('av.pay', L('Modes de paiement acceptés', 'طرق الأداء المقبولة'), [O('cash', 'Espèces', 'نقداً'), O('transfer', 'Virement', 'تحويل بنكي'), O('card', 'Carte bancaire', 'بطاقة بنكية'), O('mobile', 'Paiement mobile', 'الأداء عبر الهاتف'), O('other', 'Autre', 'أخرى')], { key: true, hint: L('Indiquez seulement la méthode. N’écrivez aucun numéro de compte ni de carte.', 'اذكري الطريقة فقط. لا تكتبي أي رقم حساب أو بطاقة.') }),
      fChoice('av.deposit', L('Acompte à la réservation', 'عربون عند الحجز'), [O('none', 'Pas d’acompte', 'بدون عربون'), O('deposit', 'Un acompte', 'عربون'), O('full', 'Paiement complet à l’avance', 'أداء كامل مسبقاً')], { key: true }),
      fNum('av.depositPct', L('Montant de l’acompte (en pourcentage)', 'قيمة العربون (نسبة مئوية)'), { showIf: (a) => a['av.deposit'] === 'deposit', unit: L('%', '%') }),
    ] },
    { group: L('Annulation et confirmation', 'الإلغاء والتأكيد'), fields: [
      fLong('av.cancel', L('Règle d’annulation ou de report', 'قاعدة الإلغاء أو التأجيل'), { key: true, hint: L('Ex. : gratuit jusqu’à 24 h avant. À vous de décider.', 'مثال: مجاني حتى 24 ساعة قبل الموعد. القرار لك.') }),
      fMulti('av.confirm', L('Comment confirmez-vous un rendez-vous ?', 'كيف تؤكدين الموعد؟'), [O('wa', 'Message WhatsApp', 'رسالة واتساب'), O('call', 'Appel téléphonique', 'مكالمة هاتفية'), O('mail', 'E-mail', 'بريد إلكتروني')], { key: true }),
      fText('av.confirmDelay', L('Délai pour répondre à une demande', 'المدة التي ترد فيها على الطلب'), { hint: L('Ex. : sous 2 heures en journée.', 'مثال: خلال ساعتين خلال النهار.') }),
    ] },
  ];
}

const LIKE = [O('like', 'Je l’aime', 'يعجبني'), O('change', 'Je l’aime, avec des changements', 'يعجبني مع تغييرات'), O('dislike', 'Je ne l’aime pas', 'لا يعجبني')];
function displayFields() {
  return [
    { group: L('Prix et ordre', 'الأسعار والترتيب'), fields: [
      fChoice('dp.prices', L('Comment afficher les prix sur le site ?', 'كيف تُعرَض الأسعار في الموقع؟'), [O('visible', 'Prix visibles', 'أسعار ظاهرة'), O('from', 'Prix « à partir de »', 'أسعار «ابتداءً من»'), O('request', 'Prix sur demande', 'الأسعار عند الطلب')], { key: true }),
      fChoice('dp.order', L('Ordre des services', 'ترتيب الخدمات'), [O('keep', 'Garder l’ordre du prototype (massages, ongles, visage)', 'الإبقاء على ترتيب النموذج (تدليك، أظافر، وجه)'), O('change', 'Je propose un autre ordre', 'أقترح ترتيباً آخر')], { key: true }),
      fLong('dp.orderNote', L('Ordre souhaité', 'الترتيب المرغوب'), { showIf: (a) => a['dp.order'] === 'change' }),
      fChoice('dp.packs', L('Place des packs', 'مكان الباقات'), [O('top', 'Les mettre en avant', 'إبرازها'), O('discreet', 'Les garder discrets', 'إبقاؤها بشكل هادئ'), O('hide', 'Ne pas les afficher', 'عدم عرضها')], { key: true }),
    ] },
    { group: L('Votre avis sur le prototype', 'رأيك في النموذج الأولي'), fields: [
      fChoice('dp.design', L('Le design général (couleurs, polices, ambiance)', 'التصميم العام (الألوان والخطوط والأجواء)'), LIKE, { key: true }),
      fLong('dp.designNote', L('Ce que vous changeriez dans le design', 'ما الذي تغيّرينه في التصميم')),
      fChoice('dp.video', L('Les vidéos (accueil et services)', 'الفيديوهات (الصفحة الرئيسية والخدمات)'), LIKE, { key: true }),
      fLong('dp.videoNote', L('Ce que vous changeriez dans les vidéos', 'ما الذي تغيّرينه في الفيديوهات')),
      fChoice('dp.photos', L('Photos réelles pour la galerie', 'صور حقيقية للمعرض'), [O('have', 'J’en ai à fournir', 'لدي صور سأقدّمها'), O('later', 'Pas encore, plus tard', 'ليس بعد، لاحقاً'), O('illus', 'Je préfère garder des illustrations', 'أفضّل الإبقاء على الرسوم التوضيحية')]),
      fLong('dp.faq', L('Questions fréquentes à ajouter ou corriger', 'أسئلة شائعة للإضافة أو التصحيح')),
    ] },
  ];
}

const ALLOW = [O('yes', 'J’autorise', 'أسمح'), O('no', 'Je n’autorise pas', 'لا أسمح')];
function publishFields() {
  return [
    { group: L('Autorisation de publication', 'الإذن بالنشر'), fields: [
      fChoice('pub.name', L('Publier mon nom ou nom d’usage', 'نشر اسمي أو الاسم المستعمل'), ALLOW, { key: true, inline: true }),
      fChoice('pub.phone', L('Publier mon téléphone professionnel', 'نشر هاتفي المهني'), ALLOW, { key: true, inline: true }),
      fChoice('pub.whatsapp', L('Publier mon numéro WhatsApp professionnel', 'نشر رقم واتساب المهني'), ALLOW, { key: true, inline: true }),
      fChoice('pub.email', L('Publier mon e-mail professionnel', 'نشر بريدي الإلكتروني المهني'), ALLOW, { key: true, inline: true }),
      fChoice('pub.insta', L('Publier mon compte Instagram professionnel', 'نشر حسابي المهني على إنستغرام'), ALLOW, { inline: true }),
      fChoice('pub.texts', L('Publier les textes validés (descriptions, durées, prix)', 'نشر النصوص المعتمدة (الأوصاف والمدد والأسعار)'), ALLOW, { key: true, inline: true }),
    ] },
    { group: L('Pour terminer', 'للختام'), fields: [
      fLong('pub.extra', L('Services supplémentaires que vous aimeriez proposer', 'خدمات إضافية ترغبين في اقتراحها'), { undec: false }),
      fLong('pub.remarks', L('Autres remarques', 'ملاحظات أخرى'), { undec: false }),
    ] },
  ];
}

/* ————————————————————————————— étapes */
const STEPS = [
  { id: 'intro', title: L('Présentation du prototype', 'تقديم النموذج الأولي') },
  { id: 'identity', prefix: 'id.', title: L('Identité et qualifications', 'الهوية والمؤهلات'), groups: identityFields },
  { id: 'services', prefix: 'svc.', title: L('Vos services', 'خدماتك') },
  { id: 'packs', prefix: 'pack.', title: L('Les packs', 'الباقات') },
  { id: 'org', prefix: 'org.', title: L('Organisation et clientèle', 'التنظيم والزبائن'), groups: orgFields },
  { id: 'travel', prefix: 'trv.', title: L('Déplacements', 'التنقلات'), groups: travelFields },
  { id: 'avail', prefix: 'av.', title: L('Disponibilités, paiement et rendez-vous', 'الأوقات والأداء والمواعيد'), groups: availFields },
  { id: 'display', prefix: 'dp.', title: L('Présentation sur le site', 'العرض في الموقع'), groups: displayFields },
  { id: 'publish', prefix: 'pub.', title: L('Publication et remarques', 'النشر والملاحظات'), groups: publishFields },
  { id: 'recap', title: L('Récapitulatif', 'الملخّص') },
];
const TOTAL = STEPS.length;

/** Tous les groupes de champs d'une étape (étapes dynamiques comprises). */
function stepGroups(i) {
  const st = STEPS[i];
  if (st.groups) return st.groups();
  if (st.id === 'services') return DATA.services.map((s) => ({ svc: s, group: s.name, fields: svcFields(s) }));
  if (st.id === 'packs') return DATA.packs.map((p) => ({ pack: p, group: p.name, fields: packFields(p) }));
  return [];
}

/* ————————————————————————————— valeurs et rendu des champs */
const isUndec = (v) => v === UNDEC || (Array.isArray(v) && v.includes(UNDEC));
const has = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '');
const visible = (f) => !f.showIf || f.showIf(answers);

function optLabel(f, v) {
  const o = f.options.find((x) => x.v === v);
  return o ? tx(o.l) : v;
}
function fmtValue(f, v) {
  if (v === UNDEC) return tx(S.undec);
  if (Array.isArray(v)) return v.map((x) => (x === UNDEC ? tx(S.undec) : optLabel(f, x))).join(lang === 'ar' ? '، ' : ', ');
  if (f.type === 'choice') return optLabel(f, v);
  if (f.type === 'number') return f.unit ? `${v} ${tx(f.unit)}` : String(v);
  return String(v);
}

function renderField(f) {
  if (!visible(f)) return '';
  const id = idOf(f.k);
  const v = answers[f.k];
  const hint = f.hint ? `<span class="vp-hint" id="${id}_h">${esc(tx(f.hint))}</span>` : '';
  const desc = f.hint ? ` aria-describedby="${id}_h"` : '';
  if (f.type === 'choice') {
    const opts = f.options.concat(f.noUndec ? [] : [{ v: UNDEC, l: S.undec, und: true }]);
    return `<fieldset class="vp-field"><legend>${esc(tx(f.label))}${hint}</legend><div class="vp-opts${f.inline ? ' inline' : ''}">${opts.map((o, i) => `<label class="vp-opt${o.und ? ' undec' : ''}"><input type="radio" id="${id}_${i}" name="${id}" data-k="${esc(f.k)}" value="${esc(o.v)}"${v === o.v ? ' checked' : ''}><span>${esc(tx(o.l))}</span></label>`).join('')}</div></fieldset>`;
  }
  if (f.type === 'multi') {
    const cur = Array.isArray(v) ? v : [];
    const opts = f.options.concat([{ v: UNDEC, l: S.undec, und: true }]);
    return `<fieldset class="vp-field"><legend>${esc(tx(f.label))}${hint}</legend><div class="vp-opts">${opts.map((o, i) => `<label class="vp-opt${o.und ? ' undec' : ''}"><input type="checkbox" id="${id}_${i}" data-multi="${esc(f.k)}" value="${esc(o.v)}"${cur.includes(o.v) ? ' checked' : ''}><span>${esc(tx(o.l))}</span></label>`).join('')}</div></fieldset>`;
  }
  const und = v === UNDEC;
  const val = und ? '' : v ?? '';
  let control;
  if (f.type === 'long') control = `<textarea class="vp-textarea" id="${id}" data-k="${esc(f.k)}"${desc}${und ? ' disabled' : ''}>${esc(val)}</textarea>`;
  else if (f.type === 'number') control = `<span class="vp-input-row"><input class="vp-input" id="${id}" data-k="${esc(f.k)}" type="number" inputmode="decimal" min="0" step="any" value="${esc(val)}"${desc}${und ? ' disabled' : ''}>${f.unit ? `<span class="vp-unit">${esc(tx(f.unit))}</span>` : ''}</span>`;
  else control = `<input class="vp-input" id="${id}" data-k="${esc(f.k)}" type="text" value="${esc(val)}"${desc}${und ? ' disabled' : ''}>`;
  const undBox = f.undec === false ? '' : `<label class="vp-undec-inline"><input type="checkbox" data-und="${esc(f.k)}"${und ? ' checked' : ''}><span>${esc(tx(S.undec))}</span></label>`;
  return `<div class="vp-field"><label class="vp-label" for="${id}">${esc(tx(f.label))}${hint}</label>${control}${undBox}</div>`;
}

const renderFields = (fields) => fields.map(renderField).join('');
const renderGroups = (groups) => groups.map((g) => `<h2>${esc(tx(g.group))}</h2>${renderFields(g.fields)}`).join('');

/* ————————————————————————————— étapes : rendu */
function tagFor(v) {
  if (!v) return `<span class="vp-tag">${esc(tx(S.unanswered))}</span>`;
  if (v === UNDEC) return `<span class="vp-tag t-und">${esc(tx(S.undec))}</span>`;
  const o = DEC_SVC.concat(DEC_PACK).find((x) => x.v === v);
  return `<span class="vp-tag t-${esc(v)}">${esc(o ? tx(o.l) : v)}</span>`;
}

function renderIntro() {
  const n = DATA.services.length, c = DATA.categories.length, p = DATA.packs.length;
  const lk = DATA.links[lang];
  const a = (key, label) => `<a href="${lk[key]}" target="_blank" rel="noopener">${esc(label)}</a>`;
  const items = lang === 'ar' ? [
    ['الصفحة الرئيسية مع الفيديو', `فيديو افتتاحي وتقديم موجز للعلامة. ${a('home', 'فتح الصفحة الرئيسية')}`],
    ['الكتالوج', `${n} خدمة موزعة على ${c} فئات: ${DATA.categories.map((x) => x.title.ar).join('، ')}. ${a('services', 'فتح الخدمات')}`],
    ['صفحات الخدمات', 'لكل خدمة صفحة تحتوي على وصف وما تشمله والمعدات التي تحضرينها وما يلزم تحضيره في بيت الزبونة.'],
    ['الباقات', `${p} باقات مقترحة. ${a('packs', 'فتح الباقات')}`],
    ['طلب موعد', `نموذج يُحضّر رسالة تُنسخ أو تُرسل عبر واتساب. لا يُحفظ أي طلب في الموقع. ${a('booking', 'فتح النموذج')}`],
    ['المعرض', `صور ورسوم توضيحية مؤقتة. ${a('gallery', 'فتح المعرض')}`],
    ['الأسئلة الشائعة', `${a('contact', 'فتح الأسئلة الشائعة')}`],
    ['الشركاء', `صفحة للرياضات والفيلات والفنادق والمناسبات. ${a('riads', 'فتح الصفحة')}`],
    ['اللغات', 'الفرنسية والإنجليزية والعربية (مع الكتابة من اليمين إلى اليسار).'],
  ] : [
    ['Accueil avec vidéo', `Une vidéo d’ouverture et une présentation courte de la marque. ${a('home', 'Ouvrir l’accueil')}`],
    ['Catalogue', `${n} services répartis en ${c} familles : ${DATA.categories.map((x) => x.title.fr).join(', ')}. ${a('services', 'Ouvrir les prestations')}`],
    ['Fiches de services', 'Chaque service a sa fiche : description, ce qui est compris, matériel apporté, ce qu’il faut prévoir chez la cliente.'],
    ['Packs', `${p} packs proposés. ${a('packs', 'Ouvrir les packs')}`],
    ['Demande de rendez-vous', `Un formulaire qui prépare un message à copier ou à envoyer par WhatsApp. Aucune demande n’est enregistrée sur le site. ${a('booking', 'Ouvrir le formulaire')}`],
    ['Galerie', `Des images et illustrations provisoires. ${a('gallery', 'Ouvrir la galerie')}`],
    ['FAQ', `Les questions fréquentes. ${a('contact', 'Ouvrir la FAQ')}`],
    ['Partenaires', `Une page pour les riads, villas, hôtels et événements. ${a('riads', 'Ouvrir la page')}`],
    ['Langues', 'Français, anglais et arabe (écriture de droite à gauche).'],
  ];
  const t = lang === 'ar' ? {
    k: 'مرحباً', h: 'التحقق من نموذج Escale Spa الأولي',
    lead: 'صُمّم هذا النموذج الأولي ليتصوّر الجميع الموقع المستقبلي. كل ما فيه — الخدمات والمدد والأوصاف والمناطق — مجرّد اقتراح. أنتِ من يقرّر ما هو صحيح، ولا حاجة لأي معرفة تقنية.',
    how: 'كيف تجيبين؟',
    hows: ['الاستبيان من 10 خطوات، ويمكنك الرجوع في أي وقت.', 'لا توجد إجابة محدَّدة مسبقاً. وإن لم تكوني متأكدة فاختاري «لم أقرّر بعد».', 'تُحفظ إجاباتك تلقائياً على هذا الجهاز، ويمكنك التوقف والعودة لاحقاً.', 'في النهاية تنزّلين ملفاً وتسلّمينه إلى مسؤول المشروع.'],
    show: 'ما الذي يحتويه النموذج الأولي؟',
    prices: 'لا يوجد أي سعر مؤكَّد حتى الآن: كل الأسعار «قيد التأكيد».',
    start: 'البدء',
  } : {
    k: 'Bienvenue', h: 'Valider le prototype Escale Spa',
    lead: 'Ce prototype a été conçu pour que chacun puisse imaginer le futur site. Tout ce qu’il contient — services, durées, descriptions, zones — est une proposition. C’est vous qui décidez de ce qui est juste. Aucune connaissance technique n’est nécessaire.',
    how: 'Comment répondre ?',
    hows: ['Le questionnaire compte 10 étapes ; vous pouvez revenir en arrière à tout moment.', 'Aucune réponse n’est cochée d’avance. Si vous n’êtes pas sûre, choisissez « À décider ».', 'Vos réponses sont enregistrées automatiquement sur cet appareil : vous pouvez faire une pause et revenir plus tard.', 'À la fin, vous téléchargez un fichier à transmettre au responsable du projet.'],
    show: 'Ce que contient le prototype',
    prices: 'Aucun prix n’est confirmé à ce jour : tous les tarifs du prototype sont « à confirmer ».',
    start: 'Commencer',
  };
  return `<p class="vp-kicker">${esc(t.k)}</p><h1 id="vp-title" tabindex="-1">${esc(t.h)}</h1>
<p class="vp-lead">${esc(t.lead)}</p>
<div class="vp-banner"><p><strong>${esc(tx(S.localBannerT))}</strong> ${esc(tx(S.localBanner))}</p><p>${esc(tx(S.noSensitive))}</p></div>
<h2>${esc(t.how)}</h2><ul>${t.hows.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<h2>${esc(t.show)}</h2>
<ol class="vp-list">${items.map(([h, d]) => `<li><strong>${esc(h)}</strong> — ${d}</li>`).join('')}</ol>
<p class="vp-box">${esc(t.prices)}</p>`;
}

function renderServices() {
  const lead = lang === 'ar'
    ? 'لكل خدمة بطاقة. افتحيها ثم اختاري: أقترحها أو لاحقاً أو لا أقترحها. وإن اخترتِ «أقترحها» فستظهر أسئلة المدة والسعر والتفاصيل.'
    : 'Chaque service a sa carte. Ouvrez-la, puis choisissez : je propose, plus tard, ou je ne propose pas. Si vous proposez le service, les questions de durée, de prix et de détails apparaissent.';
  let html = `<p class="vp-lead">${esc(lead)}</p><div class="vp-banner"><p>${esc(tx(S.proposalNote))}</p></div>`;
  for (const c of DATA.categories) {
    html += `<h2>${esc(tx(c.title))}</h2><p class="vp-cat-intro">${esc(tx(c.intro))}</p>`;
    for (const s of DATA.services.filter((x) => x.category === c.id)) {
      const dec = answers[`svc.${s.id}.decision`];
      const nm = has(answers[`svc.${s.id}.name`]) && answers[`svc.${s.id}.name`] !== UNDEC ? answers[`svc.${s.id}.name`] : svcName(s);
      html += `<details class="vp-svc" data-svc="${s.id}"${ui.open[s.id] ? ' open' : ''}><summary><span class="vp-svc-name">${esc(nm)}</span>${tagFor(dec)}</summary><div class="vp-svc-body">
<div class="vp-box"><p class="vp-box-t">${esc(tx(S.proposal))}</p>
<p><strong>${esc(svcName(s))}</strong> — ${esc(tx(s.summary))}</p><p>${esc(tx(s.description))}</p>
<p><strong>${esc(tx(S.composition))}</strong></p><ul>${tx(s.includes).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<p>${esc(tx(S.durationsProposed))} : ${esc(optsLabel(s))}. ${esc(tx(S.priceTbc))}.${s.groups ? ' ' + esc(tx(S.groupsOk)) : ''}</p></div>
${renderFields(svcFields(s))}</div></details>`;
    }
  }
  return html;
}

function renderPacks() {
  const lead = lang === 'ar'
    ? 'هذه هي الباقات الأربع التي يقترحها النموذج الأولي. لكل باقة: أبقيها أو عدّلها أو احذفها.'
    : 'Voici les quatre packs proposés par le prototype. Pour chacun : conservez-le, modifiez-le ou supprimez-le.';
  let html = `<p class="vp-lead">${esc(lead)}</p><div class="vp-banner"><p>${esc(tx(S.proposalNote))}</p></div>`;
  for (const p of DATA.packs) {
    const dec = answers[`pack.${p.id}.decision`];
    const parts = p.contents.map((id) => DATA.services.find((s) => s.id === id)).filter(Boolean);
    html += `<details class="vp-svc" data-svc="${p.id}"${ui.open[p.id] ? ' open' : ''}><summary><span class="vp-svc-name">${esc(tx(p.name))}</span>${tagFor(dec)}</summary><div class="vp-svc-body">
<div class="vp-box"><p class="vp-box-t">${esc(tx(S.proposal))}</p><p>${esc(tx(p.description))}</p>
<p><strong>${esc(tx(S.composition))}</strong></p><ul>${parts.map((s) => `<li>${esc(svcName(s))}</li>`).join('')}</ul>
<p>${esc(tx(p.guests))}${p.duration ? ` · ${p.duration} ${esc(tx(S.min))}` : ''}. ${esc(tx(S.priceTbc))}.</p></div>
${renderFields(packFields(p))}</div></details>`;
  }
  return html;
}

function stepIntroText(id) {
  const m = {
    identity: L('Ces informations servent à présenter votre activité. Elles sont professionnelles : pas de pièce d’identité, pas de document à joindre.', 'تُستعمل هذه المعلومات لتقديم نشاطك. إنها معلومات مهنية: لا وثيقة هوية ولا مستندات للإرفاق.'),
    org: L('Quelques questions sur la façon dont vous travaillez. N’indiquez aucune information sur vos clientes ou clients.', 'بضعة أسئلة عن طريقة عملك. لا تذكري أي معلومات عن زبوناتك أو زبائنك.'),
    travel: L('Les zones ci-dessous viennent du prototype : ce sont des propositions. Les frais ne sont pas encore décidés.', 'المناطق أدناه مأخوذة من النموذج الأولي: إنها اقتراحات. ولم تُحدَّد الرسوم بعد.'),
    avail: L('Ces choix décident de ce que le site pourra promettre aux clientes. N’écrivez aucun numéro de compte ni de carte.', 'تحدّد هذه الاختيارات ما يمكن للموقع أن يَعِد به الزبونات. لا تكتبي أي رقم حساب أو بطاقة.'),
    display: L('Donnez votre avis franchement : rien n’est figé.', 'قولي رأيك بصراحة: لا شيء نهائي.'),
    publish: L('Rien ne sera publié sans votre accord. Ces choix indiquent ce que vous autorisez.', 'لن يُنشر أي شيء دون موافقتك. تبيّن هذه الاختيارات ما تسمحين به.'),
  };
  return m[id] ? `<p class="vp-lead">${esc(tx(m[id]))}</p>` : '';
}

/* ————————————————————————————— récapitulatif */
function buildModel() {
  const sections = [];
  const missing = [];
  const undecided = [];
  const retained = [];
  const counts = { svc: { propose: 0, later: 0, no: 0, und: 0, none: 0 }, pack: { keep: 0, modify: 0, delete: 0, und: 0, none: 0 } };
  for (let i = 1; i < TOTAL - 1; i++) {
    const rows = [];
    for (const g of stepGroups(i)) {
      const gTitle = tx(g.group);
      for (const f of g.fields) {
        if (!visible(f)) continue;
        const v = answers[f.k];
        const label = g.svc || g.pack ? `${gTitle} — ${tx(f.label)}` : tx(f.label);
        if (has(v)) {
          rows.push({ step: i, k: f.k, label, value: fmtValue(f, v), und: isUndec(v), group: gTitle });
          if (isUndec(v)) undecided.push({ step: i, k: f.k, label });
        } else if (f.key) missing.push({ step: i, k: f.k, label });
      }
      if (g.svc) {
        const d = answers[`svc.${g.svc.id}.decision`];
        counts.svc[d === UNDEC ? 'und' : d || 'none']++;
        if (d === 'propose') {
          const s = g.svc;
          const nm = has(answers[`svc.${s.id}.name`]) && answers[`svc.${s.id}.name`] !== UNDEC ? answers[`svc.${s.id}.name`] : svcName(s);
          const prices = s.options.map((m) => { const pv = answers[`svc.${s.id}.price.${m}`]; return has(pv) ? `${m} ${tx(S.min)} : ${pv === UNDEC ? tx(S.undec) : pv + ' ' + tx(S.mad)}` : null; }).filter(Boolean);
          const dur = answers[`svc.${s.id}.dur`];
          retained.push({ step: i, k: `svc.${s.id}.decision`, id: s.id, name: nm, dur: has(dur) ? (dur === UNDEC ? tx(S.undec) : dur) : '', prices });
        }
      }
      if (g.pack) {
        const d = answers[`pack.${g.pack.id}.decision`];
        counts.pack[d === UNDEC ? 'und' : d || 'none']++;
      }
    }
    if (rows.length) sections.push({ step: i, title: tx(STEPS[i].title), rows });
  }
  return { sections, missing, undecided, retained, counts };
}

function renderRecap() {
  const m = buildModel();
  const c = m.counts.svc, pc = m.counts.pack;
  const kpi = (n, l) => `<div class="vp-kpi"><b>${n}</b><span>${esc(tx(l))}</span></div>`;
  const editBtn = (step, k) => `<button type="button" class="vp-link" data-edit="${step}|${esc(k)}">${esc(tx(S.edit))}</button>`;
  const lst = (arr) => arr.length ? `<ul class="vp-missing">${arr.map((x) => `<li>${esc(x.label)} — ${editBtn(x.step, x.k)}</li>`).join('')}</ul>` : '';
  return `<p class="vp-kicker">${esc(tx(S.step).replace('{n}', TOTAL).replace('{t}', TOTAL))}</p>
<h1 id="vp-title" tabindex="-1">${esc(tx(S.recapTitle))}</h1><p class="vp-lead">${esc(tx(S.recapLead))}</p>
<div class="vp-banner warn"><p><strong>${esc(tx(S.transmitT))}</strong> ${esc(tx(S.transmit))}</p></div>
<h2>${esc(tx(S.decisions))}</h2>
<p><strong>${esc(tx(S.svcCount))}</strong> (${DATA.services.length})</p>
<div class="vp-kpis">${kpi(c.propose, S.countProp)}${kpi(c.later, S.countLater)}${kpi(c.no, S.countNo)}${kpi(c.und, S.countUndec)}${kpi(c.none, S.countNone)}</div>
<p><strong>${esc(tx(S.packCount))}</strong> (${DATA.packs.length})</p>
<div class="vp-kpis">${kpi(pc.keep, L('Conserver', 'الإبقاء'))}${kpi(pc.modify, L('Modifier', 'التعديل'))}${kpi(pc.delete, L('Supprimer', 'الحذف'))}${kpi(pc.und, S.countUndec)}${kpi(pc.none, S.countNone)}</div>
<h2>${esc(tx(S.retained))}</h2>
${m.retained.length ? `<table class="vp-table"><tbody>${m.retained.map((r) => `<tr><th scope="row">${esc(r.name)}</th><td>${[r.dur && esc(r.dur), r.prices.length && esc(r.prices.join(' · '))].filter(Boolean).join('<br>') || esc(tx(S.none))} ${editBtn(r.step, r.k)}</td></tr>`).join('')}</tbody></table>` : `<p>${esc(tx(S.retainedNone))}</p>`}
<h2>${esc(tx(S.missing))}</h2>
${m.missing.length ? `<p>${m.missing.length}</p>${lst(m.missing)}` : `<p>${esc(tx(S.missingNone))}</p>`}
${m.undecided.length ? `<h2>${esc(tx(S.undecidedList))}</h2>${lst(m.undecided)}` : ''}
${m.sections.map((s) => `<h2>${esc(s.title)}</h2><table class="vp-table"><tbody>${s.rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.value)} ${editBtn(r.step, r.k)}</td></tr>`).join('')}</tbody></table>`).join('')}
<h2>${esc(tx(S.finalNote))}</h2>
${renderField(fLong('recap.final', S.finalNote, { undec: false }))}
<div class="vp-actions">
  <button type="button" class="btn btn-primary" data-act="json">${esc(tx(S.dlJson))}</button>
  <button type="button" class="btn btn-ghost" data-act="txt">${esc(tx(S.dlTxt))}</button>
  <button type="button" class="btn btn-ghost" data-act="print">${esc(tx(S.print))}</button>
</div>`;
}

/* ————————————————————————————— exports */
const todayStr = () => new Date().toISOString().slice(0, 10);

function download(name, mime, text) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  announce(tx(S.downloaded));
  toast(tx(S.downloaded));
}

function exportJson() {
  const m = buildModel();
  const out = {
    kind: 'escale-spa-validation-projet',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    language: lang,
    notice: 'Réponses de la propriétaire à valider. Fichier généré localement, non envoyé automatiquement. Les services publics ne sont pas modifiés automatiquement. | هذه إجابات تحتاج إلى تحقق، وقد أُنشئ الملف محلياً ولم يُرسَل تلقائياً.',
    answers,
    summary: {
      retainedServices: m.retained.map((r) => r.id),
      serviceDecisions: Object.fromEntries(DATA.services.map((s) => [s.id, answers[`svc.${s.id}.decision`] ?? null])),
      packDecisions: Object.fromEntries(DATA.packs.map((p) => [p.id, answers[`pack.${p.id}.decision`] ?? null])),
      missing: m.missing.map((x) => x.k),
      undecided: m.undecided.map((x) => x.k),
      counts: m.counts,
    },
    prototypeReference: {
      note: 'Propositions du prototype au moment de l’export (non confirmées).',
      services: DATA.services.map((s) => ({ id: s.id, category: s.category, nameFr: s.name.fr, nameAr: s.name.ar, optionsMinutes: s.options })),
      packs: DATA.packs.map((p) => ({ id: p.id, nameFr: p.name.fr, nameAr: p.name.ar, contents: p.contents })),
      zones: DATA.zones.map((z) => ({ id: z.id, nameFr: z.name.fr, nameAr: z.name.ar })),
      confirmedPrices: DATA.confirmedPrices,
    },
  };
  download(`escale-spa-validation-${todayStr()}.json`, 'application/json;charset=utf-8', JSON.stringify(out, null, 2));
}

function summaryText() {
  const m = buildModel();
  const line = '='.repeat(60);
  const out = [];
  out.push(tx(S.docTitle), `${tx(S.generated)} ${todayStr()}`, '', tx(S.docNotice), line, '');
  out.push(tx(S.decisions).toUpperCase());
  const c = m.counts.svc, pc = m.counts.pack;
  out.push(`${tx(S.svcCount)} : ${tx(S.countProp)} ${c.propose} · ${tx(S.countLater)} ${c.later} · ${tx(S.countNo)} ${c.no} · ${tx(S.countUndec)} ${c.und} · ${tx(S.countNone)} ${c.none}`);
  out.push(`${tx(S.packCount)} : ${pc.keep} / ${pc.modify} / ${pc.delete} / ${tx(S.countUndec)} ${pc.und} / ${tx(S.countNone)} ${pc.none}`, '');
  out.push(tx(S.retained).toUpperCase());
  if (m.retained.length) for (const r of m.retained) out.push(`- ${r.name}${r.dur ? ' | ' + r.dur : ''}${r.prices.length ? ' | ' + r.prices.join(' ; ') : ''}`);
  else out.push(tx(S.retainedNone));
  out.push('', tx(S.missing).toUpperCase());
  if (m.missing.length) for (const x of m.missing) out.push(`- ${x.label}`);
  else out.push(tx(S.missingNone));
  if (m.undecided.length) { out.push('', tx(S.undecidedList).toUpperCase()); for (const x of m.undecided) out.push(`- ${x.label}`); }
  for (const s of m.sections) {
    out.push('', line, s.title.toUpperCase(), line);
    for (const r of s.rows) out.push(`* ${r.label} : ${r.value.replace(/\n/g, '\n    ')}`);
  }
  if (has(answers['recap.final'])) out.push('', line, tx(S.finalNote).toUpperCase(), line, answers['recap.final']);
  out.push('', line, tx(S.transmit));
  return out.join('\r\n');
}
function exportTxt() { download(`escale-spa-validation-${todayStr()}.txt`, 'text/plain;charset=utf-8', '﻿' + summaryText()); }

function printSheet() {
  const m = buildModel();
  let el = document.getElementById('vp-print');
  if (!el) { el = document.createElement('div'); el.id = 'vp-print'; el.className = 'vp-print-sheet'; document.body.appendChild(el); }
  el.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  el.lang = lang;
  const c = m.counts.svc;
  el.innerHTML = `<h1>${esc(tx(S.docTitle))}</h1><p>${esc(tx(S.generated))} ${todayStr()}</p><p>${esc(tx(S.docNotice))}</p>
<h2>${esc(tx(S.decisions))}</h2><p>${esc(tx(S.svcCount))} : ${esc(tx(S.countProp))} ${c.propose} · ${esc(tx(S.countLater))} ${c.later} · ${esc(tx(S.countNo))} ${c.no} · ${esc(tx(S.countUndec))} ${c.und} · ${esc(tx(S.countNone))} ${c.none}</p>
<h2>${esc(tx(S.retained))}</h2>${m.retained.length ? `<ul>${m.retained.map((r) => `<li>${esc(r.name)}${r.dur ? ' — ' + esc(r.dur) : ''}${r.prices.length ? ' — ' + esc(r.prices.join(' ; ')) : ''}</li>`).join('')}</ul>` : `<p>${esc(tx(S.retainedNone))}</p>`}
<h2>${esc(tx(S.missing))}</h2>${m.missing.length ? `<ul>${m.missing.map((x) => `<li>${esc(x.label)}</li>`).join('')}</ul>` : `<p>${esc(tx(S.missingNone))}</p>`}
${m.sections.map((s) => `<h2>${esc(s.title)}</h2><table><tbody>${s.rows.map((r) => `<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.value).replace(/\n/g, '<br>')}</td></tr>`).join('')}</tbody></table>`).join('')}
${has(answers['recap.final']) ? `<h2>${esc(tx(S.finalNote))}</h2><p>${esc(answers['recap.final']).replace(/\n/g, '<br>')}</p>` : ''}
<p>${esc(tx(S.transmit))}</p>`;
}

/* ————————————————————————————— rendu général */
function announce(msg) { LIVE.textContent = ''; setTimeout(() => { LIVE.textContent = msg; }, 30); }
let toastTimer = 0;
function toast(msg) {
  let t = document.getElementById('vp-toast');
  if (!t) { t = document.createElement('p'); t.id = 'vp-toast'; t.className = 'vp-banner'; t.setAttribute('role', 'status'); }
  t.textContent = msg;
  const slot = document.getElementById('vp-toast-slot');
  if (slot) { slot.replaceChildren(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 6000); }
}

function progressHtml() {
  const pct = Math.round(((step + 1) / TOTAL) * 100);
  const done = (i) => { const st = STEPS[i]; return st.prefix ? Object.keys(answers).some((k) => k.startsWith(st.prefix) && has(answers[k])) : i < step; };
  return `<div class="vp-progress"><div class="vp-progress-top"><strong>${esc(tx(S.step).replace('{n}', step + 1).replace('{t}', TOTAL))}</strong><span>${esc(tx(STEPS[step].title))}</span></div>
<div class="vp-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${TOTAL}" aria-valuenow="${step + 1}" aria-label="${esc(tx(S.step).replace('{n}', step + 1).replace('{t}', TOTAL))}"><i style="inline-size:${pct}%"></i></div>
<ol class="vp-steps" aria-label="${esc(tx(S.stepsNav))}">${STEPS.map((st, i) => `<li><button type="button" class="vp-step-btn${done(i) && i !== TOTAL - 1 ? ' done' : ''}" data-go="${i}"${i === step ? ' aria-current="step"' : ''} aria-label="${esc(tx(S.step).replace('{n}', i + 1).replace('{t}', TOTAL) + ' — ' + tx(st.title))}">${i + 1}</button></li>`).join('')}</ol></div>`;
}

function stepBody() {
  const st = STEPS[step];
  if (st.id === 'intro') return renderIntro();
  if (st.id === 'recap') return renderRecap();
  const head = `<p class="vp-kicker">${esc(tx(S.step).replace('{n}', step + 1).replace('{t}', TOTAL))}</p><h1 id="vp-title" tabindex="-1">${esc(tx(st.title))}</h1>${stepIntroText(st.id)}`;
  if (st.id === 'services') return head + renderServices();
  if (st.id === 'packs') return head + renderPacks();
  return head + renderGroups(stepGroups(step));
}

function render({ focusId = null, keepScroll = false } = {}) {
  const y = window.scrollY;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.body.classList.toggle('is-rtl', lang === 'ar');
  document.querySelectorAll('.vp-lang-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  const skip = document.querySelector('[data-i18n="skip"]'); if (skip) skip.textContent = tx(S.skip);
  const fn = document.getElementById('vp-footnote'); if (fn) fn.textContent = tx(S.footnote);
  document.title = (lang === 'ar' ? 'التحقق من المشروع' : 'Validation du projet') + ' — Escale Spa';
  const last = step === TOTAL - 1;
  const nav = `<div class="vp-nav">${step > 0 ? `<button type="button" class="btn btn-ghost" data-nav="prev">${esc(tx(S.prev))}</button>` : '<span></span>'}${last ? '' : `<button type="button" class="btn btn-primary" data-nav="next">${esc(tx(step === TOTAL - 2 ? S.toRecap : S.next))}</button>`}</div>`;
  const banner = step > 0 ? `<div class="vp-banner"><p><strong>${esc(tx(S.localBannerT))}</strong> ${esc(tx(S.localBanner))}</p></div>` : '';
  APP.innerHTML = `${progressHtml()}<div id="vp-toast-slot"></div>${step > 0 && step < TOTAL - 1 ? banner : ''}<section class="vp-card" aria-labelledby="vp-title">${stepBody()}${step === 0 ? `<div class="vp-nav"><span></span><button type="button" class="btn btn-primary" data-nav="next">${esc(lang === 'ar' ? 'البدء' : 'Commencer')}</button></div>` : nav}</section>
<p class="vp-saved" id="vp-saved">${esc(savedText())}</p>
<p><button type="button" class="vp-link vp-danger" data-act="clear">${esc(tx(S.clear))}</button></p>`;
  if (focusId) { const el = document.getElementById(focusId); if (el) el.focus({ preventScroll: true }); }
  if (keepScroll) window.scrollTo(0, y);
}

function go(n, { edit = null } = {}) {
  step = Math.max(0, Math.min(TOTAL - 1, n));
  saveNow();
  render();
  if (edit) {
    const target = document.getElementById(idOf(edit)) || document.getElementById(idOf(edit) + '_0');
    if (target) {
      const det = target.closest('details'); if (det) { det.open = true; ui.open[det.dataset.svc] = true; }
      target.scrollIntoView({ block: 'center' });
      target.focus({ preventScroll: true });
    }
  } else {
    window.scrollTo(0, 0);
    document.getElementById('vp-title')?.focus({ preventScroll: true });
  }
  announce(tx(S.step).replace('{n}', step + 1).replace('{t}', TOTAL) + ' — ' + tx(STEPS[step].title));
}

/* ————————————————————————————— événements */
APP.addEventListener('input', (e) => {
  const t = e.target;
  const k = t.dataset?.k;
  if (!k || t.type === 'radio') return;
  if (t.value.trim() === '') delete answers[k]; else answers[k] = t.value;
  save();
});

APP.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.und) {
    const k = t.dataset.und;
    const input = document.getElementById(idOf(k));
    if (t.checked) { answers[k] = UNDEC; if (input) { input.value = ''; input.disabled = true; } }
    else { delete answers[k]; if (input) { input.disabled = false; input.focus(); } }
    save();
    return;
  }
  if (t.dataset.multi) {
    const k = t.dataset.multi;
    let cur = Array.isArray(answers[k]) ? answers[k].slice() : [];
    if (t.checked) {
      if (t.value === UNDEC) cur = [UNDEC];
      else cur = cur.filter((x) => x !== UNDEC).concat(t.value);
    } else cur = cur.filter((x) => x !== t.value);
    if (cur.length) answers[k] = cur; else delete answers[k];
    save();
    render({ focusId: t.id, keepScroll: true });
    return;
  }
  if (t.type === 'radio' && t.dataset.k) {
    answers[t.dataset.k] = t.value;
    save();
    render({ focusId: t.id, keepScroll: true });
  }
});

APP.addEventListener('toggle', (e) => {
  const d = e.target;
  if (d.matches?.('details[data-svc]')) ui.open[d.dataset.svc] = d.open;
}, true);

APP.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.go !== undefined) return go(Number(b.dataset.go));
  if (b.dataset.nav === 'next') return go(step + 1);
  if (b.dataset.nav === 'prev') return go(step - 1);
  if (b.dataset.edit) { const [s, ...k] = b.dataset.edit.split('|'); return go(Number(s), { edit: k.join('|') }); }
  const act = b.dataset.act;
  if (act === 'json') return exportJson();
  if (act === 'txt') return exportTxt();
  if (act === 'print') { printSheet(); return window.print(); }
  if (act === 'clear') return askClear();
});

document.querySelectorAll('.vp-lang-btn').forEach((b) => b.addEventListener('click', () => {
  lang = b.dataset.lang;
  saveNow();
  render({ keepScroll: true });
}));

window.addEventListener('beforeprint', printSheet);

function askClear() {
  const dlg = document.createElement('dialog');
  dlg.className = 'vp-dialog';
  dlg.innerHTML = `<h2>${esc(tx(S.clearTitle))}</h2><p>${esc(tx(S.clearText))}</p><div class="btn-row"><button type="button" class="btn btn-ghost" data-d="no">${esc(tx(S.cancel))}</button><button type="button" class="btn btn-primary" data-d="yes">${esc(tx(S.clearYes))}</button></div>`;
  document.body.appendChild(dlg);
  const done = () => { dlg.close?.(); dlg.remove(); };
  dlg.addEventListener('click', (e) => {
    const d = e.target.dataset?.d;
    if (d === 'no') done();
    if (d === 'yes') { done(); clearAll(); }
  });
  dlg.addEventListener('cancel', () => dlg.remove());
  if (dlg.showModal) dlg.showModal();
  else { if (window.confirm(tx(S.clearTitle))) { dlg.remove(); clearAll(); } else dlg.remove(); }
}

function clearAll() {
  answers = {};
  ui.open = {};
  savedAt = null;
  step = 0;
  try { localStorage.removeItem(STORE_KEY); } catch { /* stockage indisponible */ }
  document.getElementById('vp-print')?.remove();
  render();
  window.scrollTo(0, 0);
  toast(tx(S.cleared));
  announce(tx(S.cleared));
}

load();
render();
