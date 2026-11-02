/**
 * English → Tamil transliteration (phonetic, NOT translation): the same words, written in Tamil script, so a
 * Tamil-reading cashier or customer can read the screen and the printed bill. "Sales" becomes சேல்ஸ், not the
 * Tamil word for sales. Turned on per showroom (Settings → Appearance → Language); applied over the whole UI
 * by components/TranslitLayer.jsx.
 *
 * Two layers: a curated GLOSSARY for the app's own vocabulary (so the common labels read correctly), and a
 * rule-based fallback for any other word (product names and the like) — approximate, but readable. Numbers,
 * ₹ amounts, product codes and bill numbers are left exactly as they are (see transliterateText).
 */

// Independent vowels (word start), and the matra (sign) that rides on a consonant.
const VOWEL = { a: 'அ', aa: 'ஆ', i: 'இ', ee: 'ஈ', u: 'உ', oo: 'ஊ', e: 'எ', ae: 'ஏ', ai: 'ஐ', o: 'ஒ', oe: 'ஓ', au: 'ஔ' };
const SIGN = { a: '', aa: 'ா', i: 'ி', ee: 'ீ', u: 'ு', oo: 'ூ', e: 'ெ', ae: 'ே', ai: 'ை', o: 'ொ', oe: 'ோ', au: 'ௌ' };
const PULLI = '்';

// Consonant spellings → Tamil base letter. Longer spellings are tried first (see CONS_KEYS).
const CONS = {
  ch: 'ச', sh: 'ஷ', th: 'த', dh: 'த', ph: 'ஃப', gh: 'க', kh: 'க', wh: 'வ', ck: 'க', ng: 'ங', ny: 'ஞ', zh: 'ழ',
  k: 'க', g: 'க', c: 'க', q: 'க', j: 'ஜ', t: 'ட', d: 'ட', n: 'ன', m: 'ம', p: 'ப', b: 'ப', f: 'ஃப',
  v: 'வ', w: 'வ', y: 'ய', r: 'ர', l: 'ல', s: 'ஸ', z: 'ஸ', h: 'ஹ', x: 'க்ஸ',
};
const CONS_KEYS = Object.keys(CONS).sort((a, b) => b.length - a.length);

// Vowel spellings → vowel key, longest first.
const VOWELS = [
  ['eau', 'oe'], ['iew', 'yoo'], ['eigh', 'ae'],
  ['aa', 'aa'], ['ee', 'ee'], ['ea', 'ee'], ['oo', 'oo'], ['ou', 'au'], ['ow', 'au'], ['oa', 'oe'],
  ['ai', 'ae'], ['ay', 'ae'], ['ei', 'ae'], ['ey', 'ae'], ['ie', 'ee'], ['au', 'aa'], ['aw', 'aa'], ['oe', 'oe'], ['oi', 'oi'], ['oy', 'oi'],
  ['a', 'a'], ['e', 'e'], ['i', 'i'], ['o', 'o'], ['u', 'u'], ['y', 'i'],
];

const matchVowel = (w, i) => {
  for (const [seq, key] of VOWELS) if (w.startsWith(seq, i)) return [key, seq.length];
  return null;
};
const matchCons = (w, i) => {
  for (const seq of CONS_KEYS) if (w.startsWith(seq, i)) return [seq, CONS[seq], seq.length];
  return null;
};

/** One English word → Tamil script by sound (used when the word isn't in the glossary). */
const toTamilWord = (raw) => {
  const w = raw.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return raw;
  let out = '';
  let pending = null; // a consonant waiting to see if a vowel follows
  const flush = () => {
    if (pending !== null) {
      out += pending + PULLI;
      pending = null;
    }
  };
  let i = 0;
  while (i < w.length) {
    const v = matchVowel(w, i);
    if (v) {
      const [key, len] = v;
      if (key === 'oi') {
        // no single Tamil vowel for "oi": write ஒ + ய்
        if (pending !== null) { out += pending + SIGN.o; pending = null; } else { out += VOWEL.o; }
        out += 'ய்';
      } else if (key === 'yoo') {
        if (pending !== null) { out += pending + SIGN.oo; pending = null; } else { out += 'யூ'; }
      } else if (pending !== null) {
        out += pending + SIGN[key];
        pending = null;
      } else {
        out += VOWEL[key];
      }
      i += len;
      continue;
    }
    const c = matchCons(w, i);
    if (c) {
      let [seq, base, len] = c;
      // soft c / g before e, i, y → s / j
      const next = w[i + len];
      if ((seq === 'c') && 'eiy'.includes(next)) base = 'ஸ';
      if ((seq === 'g') && 'eiy'.includes(next)) base = 'ஜ';
      // a doubled consonant (ll, tt, pp…) just reads as one
      if (w[i + len] === w[i + len - 1] && len === 1) len += 1;
      flush();
      pending = base;
      i += len;
      continue;
    }
    i += 1;
  }
  flush();
  return out || raw;
};

// The app's own vocabulary, transliterated once so the common labels read correctly. Keyed lowercase.
const GLOSSARY = {
  // navigation & sections
  billing: 'பில்லிங்', quotation: 'கோட்டேஷன்', quotations: 'கோட்டேஷன்ஸ்', sales: 'சேல்ஸ்', cash: 'கேஷ்',
  close: 'க்ளோஸ்', check: 'செக்', inventory: 'இன்வென்டரி', purchase: 'பர்ச்சேஸ்', orders: 'ஆர்டர்ஸ்', order: 'ஆர்டர்',
  returns: 'ரிட்டர்ன்ஸ்', return: 'ரிட்டர்ன்', customers: 'கஸ்டமர்ஸ்', customer: 'கஸ்டமர்', dashboard: 'டாஷ்போர்ட்',
  settings: 'செட்டிங்ஸ்', appearance: 'அப்பியரன்ஸ்', logins: 'லாகின்ஸ்', login: 'லாகின்', reports: 'ரிப்போர்ட்ஸ்',
  report: 'ரிப்போர்ட்', stock: 'ஸ்டாக்', selling: 'செல்லிங்', screen: 'ஸ்க்ரீன்',
  // actions
  add: 'ஆட்', added: 'ஆடெட்', new: 'நியூ', product: 'ப்ரோடக்ட்', products: 'ப்ரோடக்ட்ஸ்', clear: 'க்ளியர்',
  hold: 'ஹோல்ட்', held: 'ஹெல்ட்', exchange: 'எக்ஸ்சேஞ்ச்', collect: 'கலெக்ட்', payment: 'பேமெண்ட்', cancel: 'கேன்சல்',
  save: 'சேவ்', print: 'ப்ரிண்ட்', delete: 'டெலீட்', done: 'டன்', back: 'பேக்', pay: 'பே', pays: 'பேஸ்', paid: 'பெய்ட்',
  refund: 'ரீஃபண்ட்', request: 'ரிக்வெஸ்ட்', requested: 'ரிக்வெஸ்டெட்', received: 'ரிசீவ்ட்', receive: 'ரிசீவ்',
  send: 'செண்ட்', sent: 'செண்ட்', reject: 'ரிஜெக்ட்', import: 'இம்போர்ட்', export: 'எக்ஸ்போர்ட்', reset: 'ரீசெட்',
  view: 'வியூ', search: 'சர்ச்', sign: 'சைன்', out: 'அவுட்', bill: 'பில்', scan: 'ஸ்கேன்', barcode: 'பார்கோட்',
  // bill / receipt
  discount: 'டிஸ்கவுண்ட்', offer: 'ஆஃபர்', quantity: 'குவாண்டிடி', qty: 'குவாண்டிடி', units: 'யூனிட்ஸ்', unit: 'யூனிட்',
  name: 'நேம்', mobile: 'மொபைல்', number: 'நம்பர்', amount: 'அமௌண்ட்', total: 'டோட்டல்', change: 'சேஞ்ச்',
  card: 'கார்டு', split: 'ஸ்ப்ளிட்', upi: 'யூபிஐ', date: 'டேட்', receipt: 'ரெசீட்', invoice: 'இன்வாய்ஸ்',
  showroom: 'ஷோரூம்', season: 'சீஸன்', price: 'ப்ரைஸ்', cost: 'காஸ்ட்', mrp: 'எம்ஆர்பி', gst: 'ஜிஎஸ்டி',
  taxable: 'டாக்ஸபிள்', value: 'வேல்யூ', round: 'ரவுண்ட்', off: 'ஆஃப்', saved: 'சேவ்ட்', savings: 'சேவிங்ஸ்',
  status: 'ஸ்டேட்டஸ்', low: 'லோ', code: 'கோட்', items: 'ஐட்டம்ஸ்', item: 'ஐட்டம்', note: 'நோட்', reason: 'ரீசன்',
  credit: 'க்ரெடிட்', profit: 'ப்ராஃபிட்', margin: 'மார்ஜின்', average: 'ஆவரேஜ்', bills: 'பில்ஸ்', sold: 'சோல்ட்',
  // misc / small words
  the: 'த', to: 'டு', for: 'ஃபார்', in: 'இன்', on: 'ஆன்', of: 'ஆஃப்', and: 'அண்ட்', or: 'ஆர்', now: 'நவ்',
  all: 'ஆல்', yes: 'யெஸ்', no: 'நோ', from: 'ஃப்ரம்', by: 'பை', with: 'வித்', per: 'பர்', each: 'ஈச்',
  walk: 'வாக்', not: 'நாட்', days: 'டேஸ்', day: 'டே', theme: 'தீம்', text: 'டெக்ஸ்ட்', size: 'சைஸ்', language: 'லாங்குவேஜ்',
  english: 'இங்கிலீஷ்', tamil: 'தமிழ்', normal: 'நார்மல்', large: 'லார்ஜ்', larger: 'லார்ஜர்', warehouse: 'வேர்ஹவுஸ்',
  admin: 'அட்மின்', demo: 'டெமோ', window: 'விண்டோ', collected: 'கலெக்டெட்', summary: 'சம்மரி', history: 'ஹிஸ்டரி',
  due: 'டியூ', tax: 'டாக்ஸ்', counter: 'கவுண்டர்', opening: 'ஓப்பனிங்', available: 'அவெய்லபிள்', this: 'திஸ்',
  hangings: 'ஹேங்கிங்ஸ்', wood: 'வுட்', tree: 'ட்ரீ',
};

/**
 * One token (already known to be an alphabetic word) → Tamil: the glossary first (so the app's own words read
 * correctly), then the rule engine. An unknown ALL-CAPS token is left alone — it's almost always a code or
 * acronym (a bill prefix like CHN, or HSN), not a word to sound out.
 */
const toTamil = (word) => {
  const known = GLOSSARY[word.toLowerCase()];
  if (known) return known;
  if (word.length >= 2 && word === word.toUpperCase()) return word;
  return toTamilWord(word);
};

/**
 * Transliterate the words in a string, leaving everything else as it is. A run of letters is skipped when it
 * sits against a digit (so product codes like A1-0289-2 and bill numbers stay intact); numbers, ₹ and
 * punctuation are never touched.
 */
export const transliterateText = (text) =>
  text.replace(/[A-Za-z]+/g, (m, offset) => {
    const before = text[offset - 1];
    const after = text[offset + m.length];
    if ((before && /[0-9]/.test(before)) || (after && /[0-9]/.test(after))) return m;
    return toTamil(m);
  });

/** True when a string has a letter worth transliterating. */
export const hasLetters = (text) => /[A-Za-z]/.test(text);
