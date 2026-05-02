// Text-to-speech using the Web Speech API with a ro-RO voice.
// Later this module can be swapped for a Google Neural2 API call
// without touching any of the UI code.

const synth = window.speechSynthesis;

// ---- Voice detection ----
// getVoices() is async on most browsers — voices aren't available until
// the 'voiceschanged' event fires.

let _roVoice = undefined; // undefined = not checked yet, null = checked and missing

export function getRoVoice() {
  return new Promise((resolve) => {
    // Already resolved previously
    if (_roVoice !== undefined) { resolve(_roVoice); return; }

    const find = () =>
      synth.getVoices().find((v) => v.lang.startsWith('ro')) || null;

    const voices = synth.getVoices();
    if (voices.length > 0) {
      _roVoice = find();
      resolve(_roVoice);
      return;
    }

    // Voices not loaded yet — wait for the event
    const onVoicesChanged = () => {
      _roVoice = find();
      resolve(_roVoice);
    };
    synth.addEventListener('voiceschanged', onVoicesChanged, { once: true });

    // Safety fallback: some browsers never fire the event
    setTimeout(() => {
      if (_roVoice === undefined) {
        _roVoice = find();
        resolve(_roVoice);
      }
    }, 2500);
  });
}

// ---- Speaking ----

export function speak(text) {
  synth.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ro-RO';
  utt.rate = 0.88; // slightly slower for language learning
  if (_roVoice) utt.voice = _roVoice;
  synth.speak(utt);
  return utt; // caller can attach onend / onerror if needed
}

// ---- No-voice warning banner ----

const INSTALL_STEPS = [
  {
    os: 'Windows 10 / 11',
    steps: 'Settings → Time & Language → Speech → Manage voices → Add a voice → select Romanian',
  },
  {
    os: 'macOS',
    steps: 'System Settings → Accessibility → Spoken Content → System Voice → Customize → Romanian',
  },
  {
    os: 'iOS / iPadOS',
    steps: 'Settings → Accessibility → Spoken Content → Voices → Romanian',
  },
  {
    os: 'Android',
    steps: 'Settings → General Management → Language → Text-to-speech output → Install language data → Romanian',
  },
];

export function buildNoVoiceWarning() {
  const box = document.createElement('div');
  box.className = 'no-voice-warning';

  const head = document.createElement('div');
  head.className = 'no-voice-head';

  const title = document.createElement('span');
  title.className = 'no-voice-title';
  title.textContent = '⚠\uFE0F Romanian voice not installed';
  head.appendChild(title);

  const dismiss = document.createElement('button');
  dismiss.className = 'no-voice-dismiss';
  dismiss.type = 'button';
  dismiss.textContent = '✕';
  dismiss.title = 'Dismiss';
  dismiss.addEventListener('click', () => box.remove());
  head.appendChild(dismiss);

  box.appendChild(head);

  const sub = document.createElement('p');
  sub.className = 'no-voice-sub';
  sub.textContent =
    'Audio buttons are hidden because no Romanian (ro-RO) voice was found on this device. ' +
    'Install it using your system settings:';
  box.appendChild(sub);

  const list = document.createElement('ul');
  list.className = 'no-voice-list';
  for (const { os, steps } of INSTALL_STEPS) {
    const li = document.createElement('li');
    const b = document.createElement('strong');
    b.textContent = os + ': ';
    li.appendChild(b);
    li.appendChild(document.createTextNode(steps));
    list.appendChild(li);
  }
  box.appendChild(list);

  const note = document.createElement('p');
  note.className = 'no-voice-note';
  note.textContent = 'After installing, reload this page.';
  box.appendChild(note);

  return box;
}
