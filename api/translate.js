// Vercel serverless function: enhanced translator with intent parsing and quoted-phrase handling
// This file was migrated from Netlify to Vercel

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
// Safe debug: log presence of the API key (masked) so we can tell if Vercel injected it
try {
  if (DEEPL_API_KEY) {
    const masked = `${DEEPL_API_KEY.slice(0, 6)}...${DEEPL_API_KEY.slice(-4)}`;
    console.log('DEEPL_API_KEY present:', true, 'masked:', masked);
  } else {
    console.log('DEEPL_API_KEY present:', false);
  }
} catch (e) {
  // Defensive: don't let logging errors break the function
  console.log('Error while logging DEEPL_API_KEY presence', String(e));
}
const path = require('path');

// Load language aliases shipped with the site (falls back gracefully)
let languageAliases = {};
try {
  // try a few likely locations for the shipped language_aliases.json
  try {
    languageAliases = require(path.join(__dirname, '..', 'language_aliases.json'));
  } catch (e1) {
    try {
      languageAliases = require(path.join(__dirname, 'language_aliases.json'));
    } catch (e2) {
      languageAliases = {};
    }
  }
} catch (e) {
  languageAliases = {};
}

const canonicalToCode = {
  english: 'EN',
  spanish: 'ES',
  french: 'FR',
  hindi: 'HI',
  mandarin: 'ZH',
  vietnamese: 'VI',
  portuguese: 'PT-PT',
  german: 'DE',
  italian: 'IT',
  arabic: 'AR',
  japanese: 'JA',
  korean: 'KO',
  russian: 'RU'
};

const aliasToCode = {};
Object.keys(languageAliases).forEach((canonical) => {
  const list = languageAliases[canonical] || [];
  const code = canonicalToCode[String(canonical).trim().toLowerCase()] || String(canonical).trim().toLowerCase();
  list.forEach((a) => {
    aliasToCode[String(a).trim().toLowerCase()] = code;
  });
  aliasToCode[String(canonical).trim().toLowerCase()] = code;
});

// Ensure canonical names from our built-in map are available even if the shipped
// language_aliases.json couldn't be loaded into the function bundle.
Object.keys(canonicalToCode).forEach((canonical) => {
  aliasToCode[String(canonical).trim().toLowerCase()] = canonicalToCode[canonical];
});

const fallbackMap = {
  en: 'EN', es: 'ES', fr: 'FR', hi: 'HI', zh: 'ZH', vi: 'VI', pt: 'PT-PT', de: 'DE', it: 'IT', ar: 'AR', ja: 'JA', ko: 'KO', ru: 'RU'
};

function mapLanguageNameToCode(name) {
  if (!name) return null;
  const n = String(name).trim().toLowerCase();
  if (!n) return null;
  if (aliasToCode[n]) return aliasToCode[n];
  if (fallbackMap[n]) return fallbackMap[n];
  const cleaned = n.replace(/[^a-z]/g, '');
  if (aliasToCode[cleaned]) return aliasToCode[cleaned];
  if (fallbackMap[cleaned]) return fallbackMap[cleaned];
  if (/^[a-z]{2}$/.test(cleaned)) return cleaned.toUpperCase();
  return null;
}

// Try resolving language names more broadly (handle Spanish language names like "inglés", "español", etc.)
function resolveLanguageName(name) {
  if (!name) return null;
  // First try the existing resolver
  const fromMap = mapLanguageNameToCode(name);
  if (fromMap) return fromMap;

  // Normalize accents and punctuation, e.g., "inglés" -> "ingles"
  let cleaned = String(name).trim().toLowerCase();
  try {
    cleaned = cleaned.normalize('NFD').replace(/[\u0000-\u036f]/g, '').replace(/[^a-z\s]/g, '');
  } catch (e) {
    cleaned = cleaned.replace(/[^a-z\s]/g, '');
  }

  // Common Spanish names -> DeepL language codes
  const spanishNameMap = {
    ingles: 'EN', ingleses: 'EN', inglese: 'EN',
    espanol: 'ES', espanola: 'ES', espanoles: 'ES', espanol: 'ES', espanol_: 'ES',
    frances: 'FR', franceses: 'FR',
    aleman: 'DE', alemanes: 'DE',
    italiano: 'IT', italianos: 'IT',
    portugues: 'PT-PT', portuguesas: 'PT-PT', portugues: 'PT-PT',
    japones: 'JA', japoneses: 'JA',
    japonesa: 'JA',
    chino: 'ZH', china: 'ZH', chinos: 'ZH',
    mandarin: 'ZH', mandarines: 'ZH',
    ruso: 'RU', rusos: 'RU',
    arabe: 'AR', arabes: 'AR',
    coreano: 'KO', coreanos: 'KO',
    vietnamita: 'VI', vietnamitas: 'VI',
    hindi: 'HI', hindues: 'HI'
  };

  if (spanishNameMap[cleaned]) return spanishNameMap[cleaned];

  // Try again against aliasToCode and fallbackMap with cleaned value
  if (aliasToCode[cleaned]) return aliasToCode[cleaned];
  if (fallbackMap[cleaned]) return fallbackMap[cleaned];

  return null;
}

async function callDeepLTranslate(q, target, source) {
  // Use DeepL Free API endpoint
  const url = 'https://api-free.deepl.com/v2/translate';
  const payload = { 
    text: [String(q)], 
    target_lang: target 
  };
  if (source) payload.source_lang = source;

  const apiRes = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!apiRes.ok) {
    // Log DeepL response for debugging
    let textErr = '';
    try {
      textErr = await apiRes.text();
    } catch (e) {
      textErr = String(e);
    }
    console.log('DeepL Translate failed', { status: apiRes.status, body: textErr.slice(0,2000) });
    const err = new Error('DeepL API error');
    err.status = apiRes.status;
    err.details = textErr;
    throw err;
  }

  const json = await apiRes.json();

  if (json && json.translations && json.translations[0]) {
    return { 
      translatedText: json.translations[0].text,
      detectedSourceLanguage: json.translations[0].detected_source_language
    };
  }
  const err = new Error('Invalid response from DeepL');
  err.raw = json;
  throw err;
}


export default async function handler(req, res) {
  console.log('translate handler invoked');
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('Incoming event body (raw):', typeof req.body === 'string' ? req.body.slice(0,1000) : req.body);
    if (!DEEPL_API_KEY) return res.status(500).json({ error: 'Server: API key not configured' });
    
    const body = req.body;
    console.log('Parsed request body:', { text: body.text ? '[REDACTED]' : undefined, source: body.source, target: body.target });
    const { text, source: userSource, target: userTarget } = body || {};
    if (!text) return res.status(400).json({ error: 'Missing `text` in request body' });

    // Map user language names (from dropdown) to codes (be resilient if mapping fails)
    let sourceCode = null;
    if (userSource) {
      sourceCode = mapLanguageNameToCode(userSource);
      if (!sourceCode) console.log('Could not map source language:', userSource);
    }
    let targetCode = 'HI'; // default to Hindi (client will set explicit language pair)
     if (userTarget) {
       const mapped = mapLanguageNameToCode(userTarget);
       if (mapped) {
         targetCode = mapped;
       } else {
         console.log('Could not map target language:', userTarget, 'falling back to', targetCode);
       }
     }    // Translate user's input to English to parse intent (skip if already English)
    // Debug: log resolved language codes
    console.log('Resolved language codes', { sourceCode, targetCode });
    let englishText;
  // Track detection/used target information to return to client
  let detectedSource = sourceCode || null;
  let usedTarget = targetCode || null;
    try {
      // DeepL auto-detects source language when not specified
      // We'll get the detected language from the translation response

      // Skip English translation for intent parsing with DeepL
      // DeepL handles multiple languages directly
      englishText = String(text);
    } catch (err) {
      englishText = String(text);
    }

  // Multi-language patterns: English, Spanish, French
  // These patterns capture two groups: (1) phrase to translate, (2) language name
  const patterns = [
      // English patterns
      /how\s+(?:do\s+i|do\s+you)\s+say\s+(.+?)\s+in\s+([a-zA-Z\u00C0-\u024F\s]+)/i,
      /how\s+to\s+say\s+(.+?)\s+in\s+([a-zA-Z\u00C0-\u024F\s]+)/i,
      /what\s+is\s+(.+?)\s+in\s+([a-zA-Z\u00C0-\u024F\s]+)/i,
      /(?:can\s+you\s+)?translate\s+(.+?)\s+(?:to|into)\s+([a-zA-Z\u00C0-\u024F\s]+)/i,
      /how\s+would\s+i\s+say\s+(.+?)\s+in\s+([a-zA-Z\u00C0-\u024F\s]+)/i,
      /how\s+do\s+i\s+say\s+(.+?)\s+in\s+([a-zA-Z\u00C0-\u024F\s]+)/i,
  // Spanish patterns: ¿Cómo se dice X en Y?
  /¿?\s*cómo\s+se\s+dice\s+(.+?)\s+en\s+([a-záéíóúüñ\s]+)\s*\??/i,
  /¿?\s*qué\s+significa\s+(.+?)\s+en\s+([a-záéíóúüñ\s]+)\s*\??/i,
  /¿?\s*qué\s+quiere\s+decir\s+(.+?)\s+en\s+([a-záéíóúüñ\s]+)\s*\??/i,
  /¿?\s*qué\s+quiere\s+decir\s+(.+?)\s*\??/i,
      // French patterns: Comment dit-on X en Y?
      /comment\s+(?:dit|on\s+dit)\s+(.+?)\s+en\s+([a-zA-Zàâäéèêëîïôöùûüœæç\s]+)/i,
      /qu'est-ce\s+que\s+c'est\s+(.+?)\s+en\s+([a-zA-Zàâäéèêëîïôöùûüœæç\s]+)/i
    ];

    let match = null;
    for (const p of patterns) {
      const m = englishText.match(p) || text.match(p);
      if (m) { match = m; break; }
    }

    if (match) {
      const phraseToTranslate = (match[1] || '').trim().replace(/["'«»""‹›]/g, '');
      // If the pattern didn't capture a second group (some patterns may omit it), try heuristics
      const maybeLang = (match[2] || '').trim();
      let extractedTargetCode = null;
      if (maybeLang) {
        extractedTargetCode = resolveLanguageName(maybeLang);
      }

      // If we couldn't determine target language from the question, fallback to user's target or English
      if (!extractedTargetCode) {
        // If the question explicitly mentions "en inglés" or similar, map 'inglés' -> 'en'
        if (/ingles|inglesa|inglés|inglés/i.test(maybeLang || '') || /en\s*ingl(es|és)/i.test(englishText)) {
          extractedTargetCode = 'EN';
        } else if (userTarget) {
          const mapped = mapLanguageNameToCode(userTarget);
          if (mapped) extractedTargetCode = mapped;
        }
      }

      if (extractedTargetCode) {
        try {
          // Call DeepL Translate
          const translated = await callDeepLTranslate(phraseToTranslate || text, extractedTargetCode, sourceCode);
          // Update detected source from DeepL response
          if (translated.detectedSourceLanguage) {
            detectedSource = translated.detectedSourceLanguage.toLowerCase();
          }
          return res.status(200).json({ result: translated.translatedText, detectedSource: detectedSource, targetUsed: extractedTargetCode });
        } catch (err) {
          console.log('Pattern-matched translation failed, falling back to full-text translation', { error: String(err).slice(0, 200) });
          // Fall through to fallback translation on error instead of returning 502
        }
      }
      // else continue to fallback translation
    }

    // Fallback: translate from source to target language using user's preference
    try {
      console.log('Calling DeepL Translate for fallback', { text: text.slice(0,200), targetCode, sourceCode });
      const translated = await callDeepLTranslate(text, targetCode, sourceCode);
      // Update detected source from DeepL response
      if (translated.detectedSourceLanguage) {
        detectedSource = translated.detectedSourceLanguage.toLowerCase();
      }
      return res.status(200).json({ result: translated.translatedText, detectedSource: detectedSource, targetUsed: targetCode });
    } catch (err) {
      return res.status(502).json({ error: 'Translation provider error', details: err.details || String(err) });
    }

  } catch (err) {
    console.error('Unhandled error in translate handler:', err);
    const errorDetails = err && err.stack ? err.stack : String(err);
    return res.status(500).json({ error: 'Server error', details: errorDetails });
  }
};
