// Déploiement manuel Escale Spa -> Hostinger (SSH). Simulation par défaut.
//
//   node scripts/deploy.mjs                     simulation (lecture seule, aucun transfert)
//   node scripts/deploy.mjs --apply             déploiement réel (build + sauvegarde + envoi)
//   node scripts/deploy.mjs --list-backups      liste les sauvegardes
//   node scripts/deploy.mjs --restore latest    simulation de restauration
//   node scripts/deploy.mjs --restore latest --apply   restauration réelle
//   node scripts/deploy.mjs --check-protection  vérifie la protection de /validation-projet/ (lecture seule)
//   node scripts/deploy.mjs --init-protected-dir [--apply]  crée le dossier validation-projet VIDE (avant la protection hPanel)
//   (--restore <AAAAMMJJ-HHMMSS> pour une sauvegarde précise ; --no-build pour ne pas recompiler)
//
// Toute opération est limitée à REMOTE_PUBLIC. Aucun mot de passe : clé SSH dédiée.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const HOST = '77.37.71.70';
const PORT = '65002';
const USER = 'u263936814';
const KEY = join(homedir(), '.ssh', 'escalespa_hostinger');
const REMOTE_PUBLIC = '/home/u263936814/domains/escalespa.com/public_html';
const BACKUP_DIR = '/home/u263936814/backups/escalespa'; // hors de public_html, dossier propre à ce site
// Jamais supprimés par --delete : certificats SSL, et protection par mot de passe de la page cachée (créée dans hPanel)
const KEEP = ['/.well-known/', '/validation-projet/.htaccess', '/validation-projet/.htpasswd'];
const RSYNC = `rsync -a --delete ${KEEP.map((k) => `--exclude='${k}'`).join(' ')}`;
const NONEMPTY = (d) => `[ -n "$(ls -A '${d}')" ]`;
const SSH_ARGS = ['-i', KEY, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-p', PORT, `${USER}@${HOST}`];

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const APPLY = has('--apply');
const restoreIdx = args.indexOf('--restore');

const die = (m) => { console.error('✖ ' + m); process.exit(1); };
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

function ssh(cmd) {
  const r = spawnSync('ssh', [...SSH_ARGS, cmd], { encoding: 'utf8' });
  if (r.status !== 0) die(`ssh a échoué (${r.status}) : ${(r.stderr || '').split('\n').filter((l) => !/quantum|vulnerable|upgraded|^\*\*/i.test(l)).join('\n')}`);
  return r.stdout;
}

// Envoie un flux tar local vers `tar -xf -` distant dans `remoteDir`.
function pushTar(localDir, remoteDir) {
  return new Promise((ok, ko) => {
    const t = spawn('tar', ['-C', localDir, '-cf', '-', '.'], { stdio: ['ignore', 'pipe', 'inherit'] });
    const s = spawn('ssh', [...SSH_ARGS, `mkdir -p '${remoteDir}' && tar -xf - -C '${remoteDir}'`], { stdio: ['pipe', 'inherit', 'inherit'] });
    t.stdout.pipe(s.stdin);
    let n = 0;
    const done = (c) => { if (++n === 2) c === 0 ? ok() : ko(new Error('transfert échoué')); };
    let bad = 0;
    t.on('close', (c) => { if (c) bad = c; done(bad); });
    s.on('close', (c) => { if (c) bad = c; done(bad); });
  });
}

function localFiles(dir) {
  const out = new Map();
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.set(relative(dir, p).split('\\').join('/'), statSync(p).size);
    }
  })(dir);
  return out;
}

function remoteFiles() {
  const out = new Map();
  const txt = ssh(`cd '${REMOTE_PUBLIC}' && find . -type f -printf '%P\\t%s\\n'`);
  for (const l of txt.split('\n')) { if (!l) continue; const [p, s] = l.split('\t'); out.set(p, Number(s)); }
  return out;
}

function checkRemotePath() {
  if (!/\/domains\/escalespa\.com\/public_html$/.test(REMOTE_PUBLIC)) die('REMOTE_PUBLIC invalide');
  const real = ssh(`realpath '${REMOTE_PUBLIC}'`).trim();
  if (real !== REMOTE_PUBLIC) die(`Chemin distant inattendu : ${real} (attendu ${REMOTE_PUBLIC})`);
  console.log(`✔ Chemin vérifié : ${real}`);
}

function build() {
  if (has('--no-build')) return console.log('• build ignoré (--no-build)');
  console.log('• npm run build …');
  const r = spawnSync(process.execPath, [join('scripts', 'build.mjs')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) die('Build échoué — rien déployé.');
}

function checkDist() {
  if (!existsSync(join(DIST, 'index.html')) || !existsSync(join(DIST, 'fr', 'index.html'))) die('dist/ incomplet.');
  if (!/Disallow:\s*\/\s*$/m.test(readFileSync(join(DIST, 'robots.txt'), 'utf8'))) die('robots.txt sans "Disallow: /" — le noindex du prototype doit être conservé.');
  if (!/noindex/.test(readFileSync(join(DIST, 'fr', 'index.html'), 'utf8'))) die('meta noindex absente de fr/index.html.');
  if (!existsSync(join(DIST, '.htaccess'))) console.warn('⚠ dist/.htaccess absent.');
  console.log('✔ dist/ OK (noindex conservé : robots.txt + meta).');
}

function plan(local, remote) {
  const add = [], upd = [], rem = [];
  for (const [p, s] of local) (remote.has(p) ? (remote.get(p) !== s ? upd : []) : add).push(p);
  const kept = (p) => KEEP.some((k) => ('/' + p).startsWith(k));
  for (const p of remote.keys()) if (!local.has(p) && !kept(p)) rem.push(p);
  return { add, upd, rem };
}


const SITE = 'https://escalespa.com';
const PROTECTED_DIR = `${REMOTE_PUBLIC}/validation-projet`;

// Vérifie (lecture seule, sans afficher de secret) que /validation-projet/ est protégé par mot de passe :
// .htaccess hPanel présent avec AuthType, fichier de mots de passe existant, et HTTP 401 sans identifiants.
async function protectionStatus() {
  const out = ssh(`d='${PROTECTED_DIR}'; if [ ! -d "$d" ]; then echo NODIR; elif [ ! -f "$d/.htaccess" ]; then echo NOHT; else
    grep -qiE '^[[:space:]]*AuthType[[:space:]]+Basic' "$d/.htaccess" && echo AUTH || echo NOAUTH;
    pf=$(grep -iE '^[[:space:]]*AuthUserFile' "$d/.htaccess" | head -1 | awk '{print $2}' | tr -d '"'); if [ -n "$pf" ] && [ -f "$pf" ]; then echo PWFILE_OK; else echo PWFILE_MISSING; fi;
    case "$pf" in "$d"/*) echo PWFILE_IN_PROTECTED_DIR;; esac; { [ -f "$d/index.html" ] && echo HAS_INDEX; true; }; fi`).split('\n').map((l) => l.trim()).filter(Boolean);
  const res = { remote: out, http: {} };
  for (const u of ['/validation-projet/', '/validation-projet/index.html', '/validation-projet/_controle-protection.html']) {
    try {
      const r = await fetch(SITE + u, { redirect: 'manual' });
      res.http[u] = { status: r.status, challenge: !!r.headers.get('www-authenticate') };
    } catch (e) { res.http[u] = { status: 'ERR ' + e.message }; }
  }
  // Dossier encore vide (aucun index) : le serveur répond 403 à l'URL nue avant toute authentification, sans rien servir.
  // Tout chemin de fichier doit répondre 401. Une fois index.html publié, l'URL du dossier doit aussi répondre 401.
  const hasIndex = out.includes('HAS_INDEX');
  res.http['/validation-projet/'].emptyDirOk = !hasIndex && res.http['/validation-projet/'].status === 403;
  res.ok = out.includes('AUTH') && out.includes('PWFILE_OK') && Object.entries(res.http).every(([u, h]) => (h.status === 401 && h.challenge) || h.emptyDirOk);
  return res;
}
function printProtection(r) {
  console.log(`  .htaccess hPanel : ${r.remote.includes('AUTH') ? 'AuthType Basic présent' : r.remote[0]} · fichier de mots de passe : ${r.remote.includes('PWFILE_OK') ? 'présent' : 'ABSENT'}`);
  for (const [u, h] of Object.entries(r.http)) console.log(`  GET ${u} sans identifiants → HTTP ${h.status}${h.challenge ? ' (demande de mot de passe)' : ''}${h.emptyDirOk ? ' (dossier vide : accepté tant qu’aucun index.html n’est publié)' : ''}`);
  const inside = r.remote.includes('PWFILE_IN_PROTECTED_DIR');
  if (inside) console.log('  ⚠ le fichier de mots de passe est DANS validation-projet : à ajouter à KEEP si son nom diffère de .htpasswd');
}

function initProtectedDir() {
  checkRemotePath();
  const exists = ssh(`[ -d '${PROTECTED_DIR}' ] && echo yes || echo no`).trim() === 'yes';
  if (exists) { console.log(`✔ ${PROTECTED_DIR} existe déjà.`); return; }
  if (!APPLY) return console.log(`SIMULATION : créerait le dossier VIDE ${PROTECTED_DIR} (aucun fichier). Ajouter --apply.`);
  ssh(`mkdir '${PROTECTED_DIR}' && chmod 755 '${PROTECTED_DIR}' && ls -ld '${PROTECTED_DIR}'`);
  console.log(`✔ Dossier vide créé : ${PROTECTED_DIR}\nÉtape suivante : le protéger par mot de passe dans hPanel, puis : node scripts/deploy.mjs --check-protection`);
}

async function deploy() {
  build();
  checkDist();
  checkRemotePath();
  const local = localFiles(DIST), remote = remoteFiles();
  const { add, upd, rem } = plan(local, remote);
  const same = local.size - add.length - upd.length;
  console.log(`\nPlan : ${add.length} à ajouter, ${upd.length} à remplacer (taille différente), ${same} identiques, ${rem.length} à SUPPRIMER`);
  if (rem.length) console.log('  supprimés (après sauvegarde) : ' + rem.slice(0, 20).join(', ') + (rem.length > 20 ? ' …' : ''));
  if (rem.includes('default.php')) console.log('  ↳ default.php (page par défaut Hostinger) sera retiré.');
  console.log('  fichiers cachés inclus : ' + [...local.keys()].filter((p) => p.split('/').some((x) => x.startsWith('.'))).join(', '));
  console.log('\nProtection par mot de passe de /validation-projet/ :');
  const prot = await protectionStatus();
  printProtection(prot);
  if (!prot.ok) console.log('  ✖ NON protégé : --apply refusera de publier tant que la protection hPanel n’est pas active (HTTP 401).');
  if (!APPLY) {
    console.log(`\nSIMULATION : aucun fichier transféré ni modifié.\nPour publier : node scripts/deploy.mjs --apply`);
    return;
  }
  if (!prot.ok) die('Protection de /validation-projet/ absente ou inactive : rien n’est publié. Créez la protection dans hPanel puis relancez --check-protection.');
  const extra = rem.filter((p) => p !== 'default.php');
  if (extra.length && !has('--allow-delete')) die(`Fichiers inattendus dans public_html (${extra.length}) : ${extra.slice(0, 10).join(', ')}. Vérifier, puis relancer avec --allow-delete si voulu.`);
  const id = stamp();
  const bk = `${BACKUP_DIR}/${id}`;
  console.log(`\n1/3 Sauvegarde → ${bk}/public_html.tar.gz`);
  ssh(`mkdir -p '${BACKUP_DIR}' && mkdir '${bk}' && tar -czf '${bk}/public_html.tar.gz' -C '${REMOTE_PUBLIC}' . && tar -tzf '${bk}/public_html.tar.gz' >/dev/null && ls -l '${bk}/public_html.tar.gz'`);
  const stg = `${BACKUP_DIR}/.staging-${id}`;
  console.log(`2/3 Envoi de dist/ vers ${stg}`);
  await pushTar(DIST, stg);
  console.log('3/3 Bascule vers public_html (rsync --delete, hors public_html uniquement lu)');
  ssh(`test -f '${stg}/index.html' && ${RSYNC} '${stg}/' '${REMOTE_PUBLIC}/' && rm -rf '${stg}'`);
  console.log('4/4 Contrôle de la protection après publication :');
  const after = await protectionStatus();
  printProtection(after);
  if (!after.ok) console.error('✖ ALERTE : la protection n’est plus active après publication. Restaurer : node scripts/deploy.mjs --restore ' + id + ' --apply');
  console.log(`\n✔ Déployé. Sauvegarde : ${id}\nRestauration : node scripts/deploy.mjs --restore ${id} --apply`);
}

async function restore() {
  checkRemotePath();
  let id = args[restoreIdx + 1];
  const ids = ssh(`ls -1 '${BACKUP_DIR}' 2>/dev/null | grep -E '^[0-9]{8}-[0-9]{4,6}$' | sort`).split('\n').filter(Boolean);
  if (!ids.length) die('Aucune sauvegarde.');
  if (!id || id === 'latest') id = ids[ids.length - 1];
  if (!ids.includes(id)) die(`Sauvegarde inconnue : ${id}. Disponibles : ${ids.join(', ')}`);
  console.log(`Restauration de la sauvegarde ${id} vers ${REMOTE_PUBLIC}`);
  if (!APPLY) return console.log('SIMULATION : rien modifié. Ajouter --apply pour restaurer.');
  const pre = stamp() + '-pre-restore';
  ssh(`mkdir -p '${BACKUP_DIR}/${pre}' && tar -czf '${BACKUP_DIR}/${pre}/public_html.tar.gz' -C '${REMOTE_PUBLIC}' .`);
  const stg = `${BACKUP_DIR}/.restore-${id}`;
  ssh(`rm -rf '${stg}' && mkdir -p '${stg}' && tar -xzf '${BACKUP_DIR}/${id}/public_html.tar.gz' -C '${stg}' && ${NONEMPTY(stg)} && ${RSYNC} '${stg}/' '${REMOTE_PUBLIC}/' && rm -rf '${stg}'`);
  console.log(`✔ Restauré (état avant restauration conservé dans ${BACKUP_DIR}/${pre}).`);
}

if (has('--init-protected-dir')) initProtectedDir();
else if (has('--check-protection')) { checkRemotePath(); const r = await protectionStatus(); printProtection(r); console.log(r.ok ? '✔ Protection active.' : '✖ Protection NON active.'); process.exitCode = r.ok ? 0 : 1; }
else if (has('--list-backups')) { checkRemotePath(); console.log(ssh(`ls -1 '${BACKUP_DIR}' 2>/dev/null || echo "(aucune)"`)); }
else if (restoreIdx > -1) await restore();
else await deploy();
