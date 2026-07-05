// Client script: auto-detect-as-you-type with optional manual override
// Localized UI strings
const i18n = {
    en: {
        placeholder: "Type a word or phrase...",
        button: "Translate",
        help: "Use short phrases for best results",
        errorServer: "Cannot reach translation server. Make sure it is running.",
        detectedPrefix: "Detected:",
        translatingTo: "Translating to:",
        manualMode: "Manual mode",
        manualSourceLabel: "I speak:",
        manualTargetLabel: "Translate to:",
        autoOption: "Auto-detect"
    },
    hi: {
        placeholder: "एक शब्द या वाक्यांश टाइप करें...",
        button: "अनुवाद करें",
        help: "बेहतर परिणामों के लिए छोटे वाक्यांशों का उपयोग करें",
        errorServer: "अनुवाद सर्वर तक नहीं पहुँचा जा सकता। सुनिश्चित करें कि यह चल रहा है।",
        detectedPrefix: "पता चला:",
        translatingTo: "अनुवाद करना:",
        manualMode: "मैनुअल मोड",
        manualSourceLabel: "मैं बोलता हूँ:",
        manualTargetLabel: "अनुवाद करें:",
        autoOption: "स्वचालित पहचान"
    }
};

// Friendly names for language codes
const codeToFriendly = { en: 'English', es: 'Spanish', fr: 'French', hi: 'Hindi', zh: 'Mandarin', vi: 'Vietnamese' };

// Manual options (values map to server mapping expectations)
const manualOptions = [
    { key: '', label_en: i18n.en.autoOption, label_hi: i18n.hi.autoOption },
    { key: 'english', label_en: 'English', label_hi: 'अंग्रेज़ी' },
    { key: 'hindi', label_en: 'Hindi (हिंदी)', label_hi: 'हिंदी' },
    { key: 'spanish', label_en: 'Spanish (Español)', label_hi: 'स्पैनिश' },
    { key: 'french', label_en: 'French (Français)', label_hi: 'फ्रेंच' },
    { key: 'mandarin', label_en: 'Mandarin (中文)', label_hi: 'मैंडरिन' },
    { key: 'vietnamese', label_en: 'Vietnamese (Tiếng Việt)', label_hi: 'वियतनामी' }
];

let detectTimer = null;
const DEBOUNCE_MS = 1500; // Increased from 600ms to avoid interrupting the user mid-word

function setBusy(busy) {
  const input = document.getElementById('input');
  if (input) input.disabled = !!busy;
}function clearOutputAnimated(el) {
    const letters = Array.from(el.querySelectorAll('.letter'));
    if (letters.length === 0) {
        el.textContent = '';
        return;
    }
    let index = 0;
    const interval = setInterval(() => {
        if (index < letters.length) {
            letters[index].classList.add('pop-out');
            index++;
        } else {
            clearInterval(interval);
            el.textContent = '';
        }
    }, 35);
}

function typeOutputAnimated(el, text) {
    el.innerHTML = '';
    const chars = text.split('');
    chars.forEach((char, index) => {
        const span = document.createElement('span');
        span.className = 'letter';
        span.textContent = char;
        el.appendChild(span);
        setTimeout(() => {
            span.classList.add('pop-in');
        }, index * 28);
    });
}

function localizeUI() {
    // Use page language to choose locale (default to en)
    const pageLang = (document.documentElement.lang || 'en').slice(0,2).toLowerCase();
    return i18n[pageLang] ? i18n[pageLang] : i18n.en;
}

function populateManualSelects() {
    const locale = localizeUI();
    const src = document.getElementById('manualSource');
    const tgt = document.getElementById('manualTarget');
    if (!src || !tgt) return;
    src.innerHTML = '';
    tgt.innerHTML = '';
    manualOptions.forEach(opt => {
        const o1 = document.createElement('option');
        o1.value = opt.key;
        o1.textContent = locale === i18n.hi ? (opt.label_hi || opt.label_en) : (opt.label_en || opt.label_hi);
        src.appendChild(o1);

        const o2 = document.createElement('option');
        o2.value = opt.key === '' ? 'hindi' : opt.key; // default target options should include hindi first
        o2.textContent = locale === i18n.hi ? (opt.label_hi || opt.label_en) : (opt.label_en || opt.label_hi);
        tgt.appendChild(o2);
    });
}

async function startTranslate() {
    const input = document.getElementById('input');
    const output = document.getElementById('output');
    const detectLabel = document.getElementById('detectedInfo');
    if (!input || !output) return;
    const text = input.value.trim();
    if (!text) return;

    setBusy(true);
    try {
        // Build payload depending on manual mode
        const manualToggle = document.getElementById('manualToggle');
        const manualSource = document.getElementById('manualSource');
        const manualTarget = document.getElementById('manualTarget');

        const payload = { text };
        if (manualToggle && manualToggle.checked) {
            if (manualSource && manualSource.value) payload.source = manualSource.value;
            if (manualTarget && manualTarget.value) payload.target = manualTarget.value;
        }

        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();

        if (data.error) {
            output.textContent = 'Error: ' + data.error;
        } else {
            const result = data.result || '';
            typeOutputAnimated(output, result);

            // Update detection/target display
            if (detectLabel) {
                const manualToggleEl = document.getElementById('manualToggle');
                if (manualToggleEl && manualToggleEl.checked) {
                    const s = document.getElementById('manualSource').value || localeString('autoOption');
                    const t = document.getElementById('manualTarget').value || '—';
                    detectLabel.textContent = `Manual: ${friendlyNameFromManualKey(s)} → ${friendlyNameFromManualKey(t)}`;
                } else {
                    const det = data.detectedSource || null;
                    const targ = data.targetUsed || null;
                    const detectedName = det ? (codeToFriendly[det] || det) : '—';
                    const targetName = targ ? (codeToFriendly[targ] || targ) : '—';
                    const locale = localizeUI();
                    detectLabel.textContent = `${locale.detectedPrefix} ${detectedName} → ${locale.translatingTo} ${targetName}`;
                }
            }
        }
    } catch (error) {
        const locale = localizeUI();
        output.textContent = locale.errorServer;
    } finally {
        setBusy(false);
    }
}

function friendlyNameFromManualKey(key) {
    if (!key) return localizeUI().autoOption || 'Auto';
    // map manual select keys to display names
    const m = manualOptions.find(o => o.key === key);
    if (!m) return key;
    const locale = localizeUI();
    return locale === i18n.hi ? (m.label_hi || m.label_en) : (m.label_en || m.label_hi);
}

function localeString(k) {
    const l = localizeUI();
    return l[k] || k;
}

// Initialize UI
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('translateForm');
  const input = document.getElementById('input');
  const output = document.getElementById('output');
  const detectBar = document.getElementById('detectBar');
  const detectedInfo = document.getElementById('detectedInfo');
  const manualToggle = document.getElementById('manualToggle');
  const manualControls = document.getElementById('manualControls');
  const manualSource = document.getElementById('manualSource');
  const manualTarget = document.getElementById('manualTarget');

  // Localize placeholder/button/help
  const locale = localizeUI();
  if (input) input.placeholder = locale.placeholder;
  const help = document.querySelector('.help');
  if (help) help.textContent = locale.help;
  const manualToggleLabel = document.getElementById('manualToggleLabel');
  if (manualToggleLabel) manualToggleLabel.textContent = locale.manualMode;
  const srcLabel = document.querySelector('label[for="manualSource"]');
  const tgtLabel = document.querySelector('label[for="manualTarget"]');
  if (srcLabel) srcLabel.textContent = locale.manualSourceLabel;
  if (tgtLabel) tgtLabel.textContent = locale.manualTargetLabel;    populateManualSelects();

    // Hide manual controls initially
    if (manualControls) manualControls.style.display = 'none';

    // Submit handler
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await startTranslate();
        });
    }

    // Debounced input
    if (input) {
        input.addEventListener('input', function() {
            if (output && output.textContent.trim()) clearOutputAnimated(output);
            if (detectTimer) clearTimeout(detectTimer);
            detectTimer = setTimeout(() => startTranslate(), DEBOUNCE_MS);
        });
    }

    // Manual toggle
    if (manualToggle) {
        manualToggle.addEventListener('change', function() {
            const manualOn = manualToggle.checked;
            if (manualControls) manualControls.style.display = manualOn ? 'flex' : 'none';
            // re-run translate to respect manual mode change
            startTranslate();
        });
    }

});
