// Block renderers. Each function takes a block object and returns a DOM
// element ready to be appended into the lesson body.
//
// Implemented: intro, alphabet, pronunciation_rule (3 shapes),
// vocab_set, qa_set, phrase_highlight, comparison, dialogue,
// table, verb_conjugation, grammar_concept (3 shapes).

// ----- Helpers -----

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

function blockShell(block, extraClass = '') {
  const cls = `block ${extraClass}`.trim();
  const section = el('section', cls);
  section.dataset.blockId = block.id;
  section.dataset.blockType = block.type;

  const header = el('div', 'block-header');
  if (block.title) header.appendChild(el('h3', 'block-title', block.title));
  if (block.title_ro) header.appendChild(el('div', 'block-subtitle', block.title_ro));
  section.appendChild(header);

  return { section, header };
}

function addEnglishToggle(section, headerEl) {
  section.classList.add('toggleable');
  const btn = el('button', 'toggle-en-btn', 'Hide English');
  btn.type = 'button';
  btn.addEventListener('click', () => {
    const hidden = section.classList.toggle('en-hidden');
    btn.textContent = hidden ? 'Show English' : 'Hide English';
  });
  headerEl.appendChild(btn);
}

function exampleList(items) {
  const ul = el('ul', 'examples');
  for (const e of items) {
    const li = el('li');
    li.appendChild(el('span', 'ro', e.ro));
    li.appendChild(el('span', 'en', e.en));
    if (e.from) li.appendChild(el('span', 'from', `from ${e.from}`));
    ul.appendChild(li);
  }
  return ul;
}

// ----- Renderers -----

function renderIntro(block) {
  const { section } = blockShell(block, 'intro');
  if (block.items?.length) {
    const ul = el('ul', 'intro-list');
    for (const item of block.items) {
      const li = el('li', 'intro-item');
      li.appendChild(el('span', 'ro', item.ro));
      li.appendChild(el('span', 'en', item.en));
      ul.appendChild(li);
    }
    section.appendChild(ul);
  }
  return section;
}

function renderAlphabet(block) {
  const { section } = blockShell(block, 'alphabet');
  const special = new Set(['Ă', 'Â', 'Î', 'Ș', 'Ț']);
  if (block.letters?.length) {
    const grid = el('div', 'letter-grid');
    for (const letter of block.letters) {
      const c = el('span', 'letter', letter);
      if (special.has(letter)) c.classList.add('special');
      grid.appendChild(c);
    }
    section.appendChild(grid);
  }
  if (block.note) section.appendChild(el('p', 'note', block.note));
  return section;
}

function renderPronRule(block) {
  const { section } = blockShell(block, 'pron-rule');

  // Shape A — letter rules
  if (block.rules?.length) {
    const list = el('div', 'pron-rules');
    for (const r of block.rules) {
      const card = el('div', 'pron-rule-card');
      card.appendChild(el('div', 'pron-letter', r.letter));
      if (r.where) card.appendChild(el('div', 'pron-where', r.where));
      if (r.examples?.length) card.appendChild(exampleList(r.examples));
      list.appendChild(card);
    }
    section.appendChild(list);
  }

  // Shape B — letter groups
  if (block.groups?.length) {
    const list = el('div', 'pron-groups');
    for (const g of block.groups) {
      const card = el('div', 'pron-group-card');
      card.appendChild(el('div', 'pron-letter', g.group));
      if (g.sound_note) card.appendChild(el('div', 'pron-where', g.sound_note));
      if (g.examples?.length) card.appendChild(exampleList(g.examples));
      list.appendChild(card);
    }
    section.appendChild(list);
  }

  // Shape C — written/pronounced pairs
  if (
    block.examples?.length &&
    block.examples[0].written != null &&
    block.examples[0].pronounced != null
  ) {
    if (block.description) section.appendChild(el('p', 'rule-desc', block.description));
    const list = el('ul', 'written-pron');
    for (const e of block.examples) {
      const li = el('li');
      li.appendChild(el('span', 'written', e.written));
      li.appendChild(el('span', 'arrow', '→'));
      li.appendChild(el('span', 'pronounced', e.pronounced));
      list.appendChild(li);
    }
    section.appendChild(list);
  }

  // Optional exception block (Shape A often has one)
  if (block.exception) {
    const exc = el('div', 'pron-exception');
    if (block.exception.title) exc.appendChild(el('div', 'exc-title', block.exception.title));
    if (block.exception.description) {
      exc.appendChild(el('p', 'exc-desc', block.exception.description));
    }
    if (block.exception.examples?.length) exc.appendChild(exampleList(block.exception.examples));
    section.appendChild(exc);
  }

  return section;
}

function renderVocabSet(block) {
  const { section, header } = blockShell(block, 'vocab-set');
  addEnglishToggle(section, header);
  if (block.note) section.appendChild(el('p', 'note', block.note));
  if (block.items?.length) {
    const grid = el('div', 'vocab-grid');
    for (const item of block.items) {
      const card = el('div', 'vocab-card');
      card.appendChild(el('div', 'ro', item.ro));
      card.appendChild(el('div', 'en', item.en));
      if (item.note) card.appendChild(el('div', 'item-note', item.note));
      grid.appendChild(card);
    }
    section.appendChild(grid);
  }
  if (block.usage_examples?.length) {
    const usage = el('div', 'usage');
    usage.appendChild(el('div', 'usage-heading', 'In use'));
    const grouped = block.usage_examples[0]?.context != null;
    if (grouped) {
      for (const grp of block.usage_examples) {
        const ctx = el('div', 'usage-context');
        ctx.appendChild(el('div', 'usage-ctx-name', grp.context));
        ctx.appendChild(exampleList(grp.examples || []));
        usage.appendChild(ctx);
      }
    } else {
      usage.appendChild(exampleList(block.usage_examples));
    }
    section.appendChild(usage);
  }
  return section;
}

function renderQaSet(block) {
  const { section, header } = blockShell(block, 'qa-set');
  addEnglishToggle(section, header);
  const list = el('div', 'qa-list');
  for (const item of block.items || []) {
    const qa = el('div', 'qa-item');
    const q = el('div', 'qa-q');
    q.appendChild(el('div', 'ro', item.question_ro));
    q.appendChild(el('div', 'en', item.question_en));
    qa.appendChild(q);
    if (item.answers?.length) {
      const ans = el('ul', 'qa-answers');
      for (const a of item.answers) {
        const li = el('li');
        li.appendChild(el('span', 'ro', a.ro));
        li.appendChild(el('span', 'en', a.en));
        ans.appendChild(li);
      }
      qa.appendChild(ans);
    }
    if (item.rules?.length) {
      const r = el('ul', 'qa-rules');
      for (const rule of item.rules) r.appendChild(el('li', null, rule));
      qa.appendChild(r);
    }
    list.appendChild(qa);
  }
  section.appendChild(list);
  return section;
}

function renderPhraseHighlight(block) {
  const { section } = blockShell(block, 'phrase-highlight');
  const list = el('div', 'highlight-items');
  for (const item of block.items || []) {
    const card = el('div', 'highlight-item');
    card.appendChild(el('div', 'ro', item.ro));
    card.appendChild(el('div', 'en', item.en));
    list.appendChild(card);
  }
  section.appendChild(list);
  return section;
}

function renderComparison(block) {
  const { section, header } = blockShell(block, 'comparison');
  addEnglishToggle(section, header);
  const grid = el('div', 'comparison-grid');
  for (const item of block.items || []) {
    const card = el('div', 'comparison-card');
    card.appendChild(el('div', 'cmp-phrase', item.phrase));
    if (item.meaning) card.appendChild(el('div', 'cmp-meaning', item.meaning));
    if (item.focus) card.appendChild(el('div', 'cmp-focus', item.focus));
    if (item.answers?.length) {
      const list = el('ul', 'cmp-answers');
      for (const a of item.answers) {
        const li = el('li');
        li.appendChild(el('span', 'ro', a.ro));
        li.appendChild(el('span', 'en', a.en));
        list.appendChild(li);
      }
      card.appendChild(list);
    }
    grid.appendChild(card);
  }
  section.appendChild(grid);
  return section;
}

function renderDialogue(block) {
  const { section, header } = blockShell(block, 'dialogue');
  addEnglishToggle(section, header);
  const speakers = block.speakers || [];
  const speakerSlot = (name) => {
    const idx = speakers.indexOf(name);
    return idx < 0 ? 0 : idx % 2;
  };
  const lines = el('div', 'dialogue-lines');
  for (const line of block.lines || []) {
    const slot = speakerSlot(line.speaker);
    const wrap = el('div', `dialogue-line speaker-${slot}`);
    wrap.appendChild(el('div', 'speaker-name', line.speaker));
    const bubble = el('div', 'bubble');
    bubble.appendChild(el('div', 'ro', line.ro));
    bubble.appendChild(el('div', 'en', line.en));
    wrap.appendChild(bubble);
    lines.appendChild(wrap);
  }
  section.appendChild(lines);
  return section;
}

// ----- Batch 2 renderers -----

function renderTable(block) {
  const { section } = blockShell(block, 'data-table');
  const wrap = el('div', 'dt-wrap');
  const table = document.createElement('table');
  table.className = 'dt';
  if (block.columns?.length) {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    for (const col of block.columns) tr.appendChild(el('th', null, col));
    thead.appendChild(tr);
    table.appendChild(thead);
  }
  if (block.rows?.length) {
    const tbody = document.createElement('tbody');
    for (const row of block.rows) {
      const tr = document.createElement('tr');
      for (const cell of row) tr.appendChild(el('td', null, cell));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
  }
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

function renderVerbConjugation(block) {
  const { section } = blockShell(block, 'verb-conj');

  // Meta row: English infinitive + tense badge
  if (block.infinitive_en || block.tense) {
    const meta = el('div', 'conj-meta');
    if (block.infinitive_en) meta.appendChild(el('span', 'conj-en', block.infinitive_en));
    if (block.tense) meta.appendChild(el('span', 'conj-tense', block.tense));
    section.appendChild(meta);
  }

  const hasShort = block.forms?.some(f => f.short && f.short !== f.negative);
  const wrap = el('div', 'conj-table-wrap');
  const table = document.createElement('table');
  table.className = 'conj-table';

  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  hrow.appendChild(el('th', null, ''));
  hrow.appendChild(el('th', null, '✓ Affirmative'));
  hrow.appendChild(el('th', null, '✗ Negative'));
  if (hasShort) hrow.appendChild(el('th', null, 'Colloquial'));
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const f of block.forms || []) {
    const tr = document.createElement('tr');
    tr.appendChild(el('td', 'conj-pronoun', f.pronoun));
    tr.appendChild(el('td', 'conj-aff', f.affirmative));
    tr.appendChild(el('td', 'conj-neg', f.negative));
    if (hasShort) tr.appendChild(el('td', 'conj-short', f.short || '—'));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

function renderGrammarConcept(block) {
  const { section } = blockShell(block, 'grammar-concept');

  // Shape A — simple concept: description + examples + key_difference
  if (!block.sections?.length) {
    if (block.description) section.appendChild(el('p', 'gc-description', block.description));
    if (block.examples?.length) section.appendChild(exampleList(block.examples));
    if (block.key_difference) {
      const kd = el('div', 'gc-key-diff');
      const label = el('span', 'gc-kd-label', 'Key difference: ');
      kd.appendChild(label);
      kd.appendChild(document.createTextNode(block.key_difference));
      section.appendChild(kd);
    }
    return section;
  }

  // Shapes B & C — sections
  const grid = el('div', 'gc-sections');
  for (const s of block.sections) {
    const card = el('div', 'gc-section');

    // Name
    const head = el('div', 'gc-section-head');
    head.appendChild(el('div', 'gc-section-name', s.name));
    if (s.name_ro) head.appendChild(el('div', 'gc-section-name-ro', s.name_ro));
    card.appendChild(head);

    // used_with tags (Shape C — formal/informal)
    if (s.used_with?.length) {
      const tags = el('div', 'gc-tags');
      for (const tag of s.used_with) tags.appendChild(el('span', 'gc-tag', tag));
      card.appendChild(tags);
    }

    // verb_form (Shape C)
    if (s.verb_form) {
      card.appendChild(el('div', 'gc-verb-form', `Verb form: ${s.verb_form}`));
    }

    // rule (Shape B — sentence types)
    if (s.rule) {
      card.appendChild(el('div', 'gc-rule', s.rule));
    }

    // structure (Shape B)
    if (s.structure) {
      card.appendChild(el('div', 'gc-structure', s.structure));
    }

    // examples
    if (s.examples?.length) card.appendChild(exampleList(s.examples));

    // verb_examples (Shape C)
    if (s.verb_examples?.length) {
      const ve = el('div', 'gc-verb-examples');
      for (const v of s.verb_examples) ve.appendChild(el('span', 'gc-verb-ex', v));
      card.appendChild(ve);
    }

    grid.appendChild(card);
  }
  section.appendChild(grid);

  // general_rule — top-level footnote (Shape C)
  if (block.general_rule) {
    section.appendChild(el('div', 'gc-general-rule', block.general_rule));
  }

  return section;
}

function renderUnknown(block) {
  const { section } = blockShell(block, 'unknown');
  section.appendChild(
    el(
      'p',
      'placeholder',
      `Renderer for "${block.type}" is not implemented yet — coming in the next batch.`
    )
  );
  return section;
}

const RENDERERS = {
  intro: renderIntro,
  alphabet: renderAlphabet,
  pronunciation_rule: renderPronRule,
  vocab_set: renderVocabSet,
  qa_set: renderQaSet,
  phrase_highlight: renderPhraseHighlight,
  comparison: renderComparison,
  dialogue: renderDialogue,
  table: renderTable,
  verb_conjugation: renderVerbConjugation,
  grammar_concept: renderGrammarConcept
};

export function renderBlock(block) {
  const fn = RENDERERS[block.type] || renderUnknown;
  return fn(block);
}
