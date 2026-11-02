import { useEffect } from 'react';
import { hasLetters, transliterateText } from '../lib/translit.js';

/**
 * Shows the whole app in Tamil script when the showroom chose it (Settings → Appearance → Language). It walks
 * the page and rewrites the English words in Tamil in place — text and the placeholder / tooltip / aria-label
 * of controls — and watches for anything new. What staff type into a field, numbers, ₹ amounts, product codes
 * and bill numbers are never touched. Switching back to English restores every original. Nothing is translated:
 * the words are the same, only the script changes.
 *
 * It's safe to re-run on its own output: Tamil has no A–Z, so a node that's already Tamil transliterates to
 * itself and isn't touched again — no loop.
 */
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'KBD']);
const ATTRS = ['placeholder', 'aria-label', 'title'];

const TranslitLayer = ({ lang }) => {
  useEffect(() => {
    if (lang !== 'ta') return undefined;

    const textOriginals = new Map(); // Text node -> its English text
    const attrOriginals = new Map(); // Element -> { attr: English value }

    const skip = (el) => !el || el.nodeType !== 1 || SKIP.has(el.tagName) || Boolean(el.closest?.('[data-no-translit]'));

    const doText = (node) => {
      if (skip(node.parentNode)) return;
      const cur = node.nodeValue;
      if (!cur || !hasLetters(cur)) return;
      const out = transliterateText(cur);
      if (out !== cur) {
        if (!textOriginals.has(node)) textOriginals.set(node, cur);
        node.nodeValue = out;
      }
    };

    const doAttrs = (el) => {
      if (skip(el)) return;
      for (const attr of ATTRS) {
        const cur = el.getAttribute?.(attr);
        if (!cur || !hasLetters(cur)) continue;
        const out = transliterateText(cur);
        if (out !== cur) {
          let rec = attrOriginals.get(el);
          if (!rec) attrOriginals.set(el, (rec = {}));
          if (!(attr in rec)) rec[attr] = cur;
          el.setAttribute(attr, out);
        }
      }
    };

    const walk = (node) => {
      if (node.nodeType === 3) return doText(node);
      if (skip(node)) return;
      doAttrs(node);
      for (const child of node.childNodes) walk(child);
    };

    walk(document.body);

    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') doText(r.target);
        else if (r.type === 'attributes') doAttrs(r.target);
        else r.addedNodes.forEach(walk);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });

    return () => {
      observer.disconnect();
      textOriginals.forEach((orig, node) => {
        if (node.isConnected) node.nodeValue = orig;
      });
      attrOriginals.forEach((rec, el) => {
        if (el.isConnected) for (const [attr, val] of Object.entries(rec)) el.setAttribute(attr, val);
      });
      textOriginals.clear();
      attrOriginals.clear();
    };
  }, [lang]);

  return null;
};

export default TranslitLayer;
