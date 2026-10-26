import { verbs } from './hindi_verbs.js';

// --- Needed definitions ---
const pronouns = ["I", "You", "He", "We", "You all", "They"];
const hindiPronouns = ["मैं", "तुम", "वह", "हम", "आप लोग", "वे"];
const tenses = [
  "Present (Simple)", "Present (Continuous)", "Past (Simple)", "Past (Continuous)", "Future (Simple)", "Future (Continuous)"
];

// Short human-readable definitions for tense info popups
const tenseDefinitions = {
  "Present (Simple)": "Used for general truths or habitual actions (I do).",
  "Present (Continuous)": "Actions happening right now (I am doing).",
  "Past (Simple)": "Completed actions (I did).",
  "Past (Continuous)": "Actions that were ongoing in the past (I was doing).",
  "Future (Simple)": "Actions that will happen (I will do).",
  "Future (Continuous)": "Actions that will be ongoing (I will be doing)."
};

// --- Practice Mode: Hindi → English ---
practiceFormHi.onsubmit = function(e) {
  e.preventDefault();
  const input = practiceInputHi.value.trim().toLowerCase();
  if (!input) return;

  let found = null;
  // Try to match full conjugated forms
  for (let verb of verbs) {
    for (let t of tenses) {
      if (!verb.conjugations[t]) continue;
      for (let i = 0; i < hindiPronouns.length; ++i) {
        const hi = verb.conjugations[t][i];
        if (
          hi &&
          (
            `${hindiPronouns[i]} ${hi}`.toLowerCase() === input ||
            hi.toLowerCase() === input
          )
        ) {
          found = {verb, tense: t, pronounIdx: i};
          break;
        }
      }
      if (found) break;
    }
    if (found) break;
  }

  // If not found, try to match infinitive
  if (!found) {
    for (let verb of verbs) {
      if (verb.hindi.toLowerCase() === input) {
        found = {verb, tense: null, pronounIdx: null, isInfinitive: true};
        break;
      }
    }
  }

  const englishBox = document.getElementById('practiceInputHiEnglish');
  if (!found) {
    englishBox.value = '';
    practiceResults.innerHTML = `<div style="color:red; padding: 10px; background-color: #fee; border: 1px solid #fcc; border-radius: 4px;">
      <strong>Could not find a matching verb.</strong><br>
      <small style="color: #666;">This tool is specifically designed for Hindi verbs (e.g., "होना", "जाना", "करना"). 
      For translating other words or phrases, please use the general translation tool below.</small>
    </div>`;
    return;
  }

  // If infinitive, show all tenses for all pronouns
  if (found.isInfinitive) {
    let meanings = Array.isArray(found.verb.english) ? found.verb.english : [found.verb.english];
    let meaningIdx = 0;
    englishBox.value = meanings[meaningIdx];
    let html = `<h3>English equivalents for <b>${found.verb.hindi}</b> (all pronouns)</h3>`;
    html += `<table border="1" style="width:100%;text-align:center;">
      <tr>
        <th>Pronoun</th>
        <th>Tense</th>
        <th>Hindi</th>
        <th>English</th>
      </tr>`;
    for (let i = 0; i < hindiPronouns.length; ++i) {
      for (let t of tenses) {
        let hi = found.verb.conjugations[t] ? found.verb.conjugations[t][i] : "(not available)";
        if (hi === "(not available)") continue;
        let eng = buildEnglishPhrase(found.verb, t, i, meaningIdx);
        html += `<tr>
          <td>${hindiPronouns[i]}</td>
          <td>
            ${t}
            <button type="button" class="tense-info-btn" data-tense="${t}" title="What is ${t}?">ℹ️</button>
          </td>
            <td>${hi}</td>
          <td>${eng}</td>
        </tr>`;
      }
    }
    html += `</table>`;
    practiceResults.innerHTML = html;
    return;
  }

  // Set the English translation in the output field
  let meanings = Array.isArray(found.verb.english) ? found.verb.english : [found.verb.english];
  let meaningIdx = 0;
  englishBox.value = `${pronouns[found.pronounIdx]} ${buildEnglishPhrase(found.verb, found.tense, found.pronounIdx, meaningIdx).replace(pronouns[found.pronounIdx] + ' ', '')}`;

  let html = `<h3>English equivalents for <b>${found.verb.hindi}</b> (${hindiPronouns[found.pronounIdx]})</h3>`;
  html += `<table border="1" style="width:100%;text-align:center;">
    <tr>
      <th>Tense</th>
      <th>English</th>
      <th>Hindi</th>
    </tr>`;
  tenses.forEach(t => {
    let eng = buildEnglishPhrase(found.verb, t, found.pronounIdx, meaningIdx);
    let hi = found.verb.conjugations[t] ? found.verb.conjugations[t][found.pronounIdx] : "(not available)";
    if (hi === "(not available)") return;
    html += `<tr>
      <td>
        ${t}
        <button type="button" class="tense-info-btn" data-tense="${t}" title="What is ${t}?">ℹ️</button>
      </td>
      <td>${eng}</td>
      <td>${hi}</td>
    </tr>`;
  });
  html += `</table>`;
  practiceResults.innerHTML = html;
};

// --- Practice Mode: English → Hindi ---
practiceFormEn.onsubmit = function(e) {
  e.preventDefault();
  const input = practiceInputEn.value.trim();
  if (!input) return;

  let meaningIdx = (e && typeof e.meaningIdx === "number") ? e.meaningIdx : 0;
  const result = parseEnglishPhrase(input, meaningIdx);
  const hindiBox = document.getElementById('practiceInputEnHindi');
  if (!result) {
    hindiBox.value = '';
    practiceResults.innerHTML = `<div style="color:red; padding: 10px; background-color: #fee; border: 1px solid #fcc; border-radius: 4px;">
      <strong>Could not find a matching verb.</strong><br>
      <small style="color: #666;">This tool is specifically designed for Hindi verbs (e.g., "to be", "to go", "to do"). 
      For translating other words or phrases, please use the general translation tool below.</small>
    </div>`;
    return;
  }

  let allCandidates = result.allCandidates || [result];
  let currentIdx = meaningIdx;
  let candidate = allCandidates[currentIdx] || allCandidates[0];

  let verb = candidate.verb;
  meaningIdx = candidate.meaningIdx || 0;
  const pronounIdx = (typeof candidate.pronounIdx === "number") ? candidate.pronounIdx : 0;
  const detectedTense = candidate.tense || "Present (Simple)";

  let tabHtml = '';
  if (allCandidates.length > 1) {
    tabHtml = `<div id="meaningTabs" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">` +
      allCandidates.map((c, idx) => {
        let label = `${c.verb.hindi} / ${Array.isArray(c.verb.english) ? c.verb.english[c.meaningIdx].replace(/^to /, '') : c.verb.english.replace(/^to /, '')}`;
        return `<button class="meaning-tab${idx === currentIdx ? ' active' : ''}" data-meaning-idx="${idx}">${label}</button>`;
      }).join('') +
      `</div>`;
  }

  let tenseToShow = detectedTense || "Present (Simple)";
  let hindi = verb.conjugations[tenseToShow] ? verb.conjugations[tenseToShow][pronounIdx] : "(not available)";
  hindiBox.value = `${hindiPronouns[pronounIdx]} ${hindi}`;

  let html = tabHtml;
  let englishMeaning = Array.isArray(verb.english) ? verb.english[meaningIdx] : verb.english;
  html += `<h3>Hindi conjugations for <b>${englishMeaning}</b> (${pronouns[pronounIdx]})`;
  if (detectedTense) html += ` <span style="font-size:0.9em;color:#666;">[${detectedTense}]</span>`;
  html += `</h3>`;
  html += `<table border="1" style="width:100%;text-align:center;">
    <tr>
      <th>Tense</th>
      <th>Hindi</th>
      <th>English</th>
    </tr>`;
  tenses.forEach(t => {
    let conjugation = verb.conjugations[t] ? verb.conjugations[t][pronounIdx] : "(not available)";
    if (conjugation === "(not available)") return;
    let english = buildEnglishPhrase(verb, t, pronounIdx, meaningIdx);
    let highlight = (detectedTense && t === detectedTense) ? ' style="background:#e0e7ff;font-weight:bold;"' : '';
    html += `<tr${highlight}>
      <td>
        ${t}
        <button type="button" class="tense-info-btn" data-tense="${t}" title="What is ${t}?">ℹ️</button>
      </td>
      <td>${conjugation}</td>
      <td>${english}</td>
    </tr>`;
  });
  html += `</table>`;
  practiceResults.innerHTML = html;

  // Tab click handler
  if (allCandidates.length > 1) {
    document.querySelectorAll('.meaning-tab').forEach(btn => {
      btn.onclick = () => {
        practiceFormEn.onsubmit({
          preventDefault: () => {},
          target: practiceFormEn,
          meaningIdx: parseInt(btn.getAttribute('data-meaning-idx'))
        });
      };
    });
  }
};

// --- Quiz Mode: Hindi → English ---
function startQuiz() {
  const verb = verbs[Math.floor(Math.random() * verbs.length)];
  const availableTenses = tenses.filter(t => verb.conjugations[t]);
  const tense = availableTenses[Math.floor(Math.random() * availableTenses.length)];
  const pronounIdx = Math.floor(Math.random() * pronouns.length);
  const hindi = verb.conjugations[tense][pronounIdx];
  const english = buildEnglishPhrase(verb, tense, pronounIdx);

  quizState = { verb, tense, pronounIdx, hindi, english };

  quizPrompt.innerHTML = `
    <div>
      <b>Translate this Hindi phrase to English:</b>
      <div style="font-size:1.5em;margin:1em 0;">
        <span style="color:#4f46e5;font-weight:bold">${hindiPronouns[pronounIdx]} ${hindi}</span>
      </div>
      <div style="font-size:0.9em;color:#888;">Verb: <b>${verb.hindi}</b> (${verb.english})<br>Tense: <b>${tense}</b></div>
    </div>
  `;
  quizInput.style.display = '';
  quizInput.value = '';
  quizForm.querySelector('button[type="submit"]').style.display = '';
  quizFeedback.innerHTML = '';
}

quizForm.onsubmit = e => {
  e.preventDefault();
  if (!quizState) return;
  const userAnswer = quizInput.value.trim().toLowerCase();
  const correctAnswer = quizState.english.toLowerCase();

  if (userAnswer === correctAnswer) {
    let html = `<div style="color:green;font-weight:bold;">Correct!</div>`;
    html += `<h4>All tenses for <b>${quizState.verb.english}</b> (${pronouns[quizState.pronounIdx]})</h4>`;
    html += `<table border="1" style="width:100%;text-align:center;">
      <tr>
        <th>Tense</th>
        <th>Hindi</th>
        <th>English</th>
      </tr>`;
    tenses.forEach(t => {
      const hi = quizState.verb.conjugations[t] ? quizState.verb.conjugations[t][quizState.pronounIdx] : "(not available)";
      if (hi === "(not available)") return;
      const en = buildEnglishPhrase(quizState.verb, t, quizState.pronounIdx);
      html += `<tr>
        <td>
          ${t}
          <button type="button" class="tense-info-btn" data-tense="${t}" title="What is ${t}?">ℹ️</button>
        </td>
        <td>${hi}</td>
        <td>${en}</td>
      </tr>`;
    });
    html += `</table>`;
    html += `<button onclick="startQuiz()" style="margin-top:1em;">Next</button>`;
    quizFeedback.innerHTML = html;
    quizInput.style.display = 'none';
    quizForm.querySelector('button[type="submit"]').style.display = 'none';
  } else {
    quizFeedback.innerHTML = `<span style="color:red;">Incorrect. Try again!</span>
      <br>
      <button id="showAnswerBtn" style="margin-top:0.7em;">Show Answer</button>`;
    document.getElementById('showAnswerBtn').onclick = function() {
      let html = `<div style="color:#2563eb;font-weight:bold;">Answer: ${quizState.english}</div>`;
      html += `<h4>All tenses for <b>${quizState.verb.english}</b> (${pronouns[quizState.pronounIdx]})</h4>`;
      html += `<table border="1" style="width:100%;text-align:center;">
        <tr>
          <th>Tense</th>
          <th>Hindi</th>
          <th>English</th>
        </tr>`;
      tenses.forEach(t => {
        const hi = quizState.verb.conjugations[t] ? quizState.verb.conjugations[t][quizState.pronounIdx] : "(not available)";
        if (hi === "(not available)") return;
        const en = buildEnglishPhrase(quizState.verb, t, quizState.pronounIdx);
        html += `<tr>
          <td>
            ${t}
            <button type="button" class="tense-info-btn" data-tense="${t}" title="What is ${t}?">ℹ️</button>
          </td>
          <td>${hi}</td>
          <td>${en}</td>
        </tr>`;
      });
      html += `</table>`;
      html += `<button onclick="startQuiz()" style="margin-top:1em;">Next</button>`;
      quizFeedback.innerHTML = html;
      quizInput.style.display = 'none';
      quizForm.querySelector('button[type="submit"]').style.display = 'none';
    };
  }
};

// --- Tense Info Popup Logic ---
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('tense-info-btn')) {
    const tense = e.target.getAttribute('data-tense');
    const def = (typeof tenseDefinitions !== 'undefined' && tenseDefinitions[tense]) ? tenseDefinitions[tense] : "No definition available.";
    showTensePopup(tense, def, e.target);
    return;
  }
});

function showTensePopup(tense, def, anchor) {
  let old = document.getElementById('tense-popup');
  if (old) old.remove();

  const popup = document.createElement('div');
  popup.id = 'tense-popup';
  popup.style.position = 'absolute';
  popup.style.background = '#fff';
  popup.style.border = '1px solid #a78bfa';
  popup.style.borderRadius = '8px';
  popup.style.boxShadow = '0 4px 16px rgba(60,60,120,0.12)';
  popup.style.padding = '12px 18px';
  popup.style.zIndex = 1000;
  popup.style.maxWidth = '260px';
  popup.innerHTML = `<b>${tense}</b><br><span style="font-size:0.98em;">${def}</span>`;

  const rect = anchor.getBoundingClientRect();
  popup.style.left = (window.scrollX + rect.right + 8) + 'px';
  popup.style.top = (window.scrollY + rect.top - 8) + 'px';

  document.body.appendChild(popup);

  setTimeout(() => {
    document.addEventListener('mousedown', function handler(ev) {
      if (!popup.contains(ev.target)) {
        popup.remove();
        document.removeEventListener('mousedown', handler);
      }
    });
  }, 10);
}

// --- Helper: Parse English phrase to verb/tense/pronoun ---
function parseEnglishPhrase(phrase, meaningIdx = 0) {
  phrase = phrase.trim().toLowerCase();

  let candidates = [];
  for (let verb of verbs) {
    let meanings = Array.isArray(verb.english) ? verb.english : [verb.english];
    for (let idx = 0; idx < meanings.length; ++idx) {
      let meaningRaw = meanings[idx].toLowerCase();
      let meaningNoParen = meaningRaw.replace(/\s*\(.*?\)\s*/g, '').trim();
      let base = meaningRaw.replace(/^to /, '').split(',')[0].trim();

      // Try to match exact phrase for all tenses/pronouns
      for (let t of tenses) {
        if (!verb.conjugations[t]) continue;
        for (let i = 0; i < pronouns.length; ++i) {
          const eng = buildEnglishPhrase(verb, t, i, idx).toLowerCase();
          if (phrase === eng) {
            return { verb, tense: t, pronounIdx: i, meaningIdx: idx };
          }
        }
      }

      // Try to match base infinitive
      if (
        phrase === meaningRaw ||
        phrase === meaningNoParen ||
        meaningRaw.startsWith(phrase) ||
        meaningNoParen.startsWith(phrase) ||
        phrase === base
      ) {
        candidates.push({ verb, tense: null, pronounIdx: null, meaningIdx: idx });
      }
    }
  }

  if (candidates.length > 0) {
    let result = candidates[0];
    result.allCandidates = candidates;
    return result;
  }

  // Fallback: try to match verb and pronoun
  for (let verb of verbs) {
    let meanings = Array.isArray(verb.english) ? verb.english : [verb.english];
    for (let idx = 0; idx < meanings.length; ++idx) {
      let base = meanings[idx].replace(/^to /, '').split(',')[0].trim().toLowerCase();
      if (phrase.includes(base)) {
        for (let i = 0; i < pronouns.length; ++i) {
          if (phrase.includes(pronouns[i].toLowerCase())) {
            return { verb, pronounIdx: i, meaningIdx: idx };
          }
        }
        return { verb, pronounIdx: 0, meaningIdx: idx };
      }
    }
  }
  return null;
}

// --- Helper: Build English phrase for a verb/tense/pronoun ---
function buildEnglishPhrase(verb, tense, pronounIdx, meaningIdx = 0) {
  const pronoun = pronouns[pronounIdx];
  let meanings = Array.isArray(verb.english) ? verb.english : [verb.english];
  let meaning = meanings[meaningIdx];
  let base = meaning.replace(/^to /, '').split(',')[0].trim();

  // Map Hindi tenses to English equivalents
  switch (tense) {
    case "Present (Simple)":
      return `${pronoun} ${base}`;
    case "Present (Continuous)":
      return `${pronoun} am ${base}ing`;
    case "Past (Simple)":
      return `${pronoun} ${base}ed`;
    case "Past (Continuous)":
      return `${pronoun} was ${base}ing`;
    case "Future (Simple)":
      return `${pronoun} will ${base}`;
    case "Future (Continuous)":
      return `${pronoun} will be ${base}ing`;
    default:
      return `${pronoun} ${base}`;
  }
}

// --- Practice/Quiz Mode Toggle ---
document.getElementById('practiceModeBtn').addEventListener('click', function() {
  document.getElementById('practiceSection').style.display = '';
  document.getElementById('quizSection').style.display = 'none';
});
document.getElementById('quizModeBtn').addEventListener('click', function() {
  document.getElementById('practiceSection').style.display = 'none';
  document.getElementById('quizSection').style.display = '';
  startQuiz();
});
