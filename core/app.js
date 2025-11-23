(function () {
  'use strict';
  const KEY_CONTENT = 'mv_contents_v1';
  const KEY_PROGRESS = 'mv_progress_v1';
  const KEY_META = 'mv_meta_v1';

  const ROLES = {
    admin: 'edu-offline',
    editor: 'edu-editor',
  };

  let contents = load(KEY_CONTENT) || SAMPLE_CONTENT.slice();
  let progress = load(KEY_PROGRESS) || {};
  let meta = load(KEY_META) || { lastExport: null };

  const $ = sel => document.querySelector(sel);
  const subjectsEl = $('#subjects');
  const contentArea = $('#contentArea');
  const progressSummary = $('#progressSummary');
  const modal = $('#modal');
  const authArea = $('#authArea');
  const adminArea = $('#adminArea');
  const bulkJson = $('#bulkJson');
  const lessonsEditor = $('#lessonsEditor');
  const fileInput = $('#fileInput');
  const modalTitle = $('#modalTitle');

  renderSubjects();
  updateProgressSummary();

  $('#teacherBtn').addEventListener('click', () => openModal());
  $('#closeModal').addEventListener('click', () => closeModal());
  $('#loginBtn').addEventListener('click', teacherLogin);
  $('#newLessonBtn').addEventListener('click', createNewLesson);
  $('#applyJson').addEventListener('click', applyBulkJson);
  $('#resetToSample').addEventListener('click', resetToSample);
  $('#clearProgress').addEventListener('click', clearProgress);
  $('#downloadBackup').addEventListener('click', () => downloadBackup());
  $('#exportBtn').addEventListener('click', () => downloadBackup());
  $('#importBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileImport);
  $('#exportSubjectBtn')?.addEventListener('click', () => exportSubjectPrompt());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  function renderSubjects() {
    subjectsEl.innerHTML = '';
    const map = {};
    contents.forEach(l => { if (!map[l.subject]) map[l.subject] = []; map[l.subject].push(l); });
    const keys = Object.keys(map).sort();
    keys.forEach(subject => {
      const s = el('div', { class: 'subject' }, subject);
      s.addEventListener('click', () => {
        document.querySelectorAll('.subject').forEach(n => n.classList.remove('active'));
        s.classList.add('active');
        renderLessonList(map[subject]);
      });
      subjectsEl.appendChild(s);
    });
    if (keys.length && !document.querySelector('.subject.active')) {
      const first = subjectsEl.querySelector('.subject');
      if (first) first.click();
    }
  }

  function renderLessonList(lessons) {
    document.querySelectorAll('.lesson-list-inline').forEach(n => n.remove());
    const list = el('div', {
      class: 'lesson-list-inline',
      style: 'margin-top:8px;display:flex;flex-direction:column;gap:6px'
    });
    
    lessons.forEach(l => {
      const done = progress[l.id] && progress[l.id].completed;
      const item = el('div', { class: 'lesson' }, el('div', {}, l.title), el('div', {}, done ? '✓' : ''));
      item.addEventListener('click', () => openLesson(l.id));
      list.appendChild(item);
    });
    
    const active = document.querySelector('.subject.active');
    if (active) active.insertAdjacentElement('afterend', list);
    if (lessons[0]) openLesson(lessons[0].id);
  }

  function openLesson(id) {
    const lesson = contents.find(x => x.id === id);
    if (!lesson) return;
    contentArea.innerHTML = '';
    const title = el('h2', {}, lesson.title);
    const meta = el('div', { class: 'meta' }, lesson.subject);
    const bodyWrap = el('div', { class: 'lesson-body' });
    bodyWrap.innerHTML = lesson.body || '<p>(sin contenido)</p>';

    contentArea.appendChild(title);
    contentArea.appendChild(meta);
    contentArea.appendChild(bodyWrap);

    if (lesson.media) {
      const mediaWrap = el('div', { style: 'margin-top:12px' });
      if (isVideo(lesson.media)) {
        const vid = el('video', { controls: '', width: '100%' });
        const src = el('source', { src: lesson.media, type: 'video/mp4' });
        vid.appendChild(src);
        mediaWrap.appendChild(vid);
      } else {
        const img = el('img', { src: lesson.media, style: 'max-width:100%;border-radius:8px;margin-top:8px' });
        mediaWrap.appendChild(img);
      }
      contentArea.appendChild(mediaWrap);
    }

    if (lesson.quiz) {
      const quizWrap = el('div', { class: 'quiz' });
      const q = lesson.quiz;
      const qEl = el('div', { class: 'question' }, el('strong', {}, q.question));
      const choicesEl = el('div', { class: 'choices' });
      q.choices.forEach((ch, idx) => {
        const btn = el('button', { class: 'choice-btn' }, ch);
        btn.addEventListener('click', () => {
          Array.from(choicesEl.children).forEach(c => c.classList.remove('correct', 'wrong'));
          if (idx === q.answer) {
            btn.classList.add('correct');
            saveProgress(id, true, 1);
            toast('Respuesta correcta, progreso guardado.');
          } else {
            btn.classList.add('wrong');
            saveProgress(id, false, 0);
            toast('Respuesta incorrecta.');
          }
          updateProgressSummary();
        });
        choicesEl.appendChild(btn);
      });
      quizWrap.appendChild(qEl);
      quizWrap.appendChild(choicesEl);
      contentArea.appendChild(quizWrap);
    }

    const controls = el('div', { style: 'margin-top:12px;display:flex;gap:8px' });
    const markBtn = el('button', { class: 'btn' }, 'Marcar como completada');
    markBtn.addEventListener('click', () => { saveProgress(id, true, progress[id]?.score || 1); updateProgressSummary(); toast('Lección marcada como completada.'); });
    controls.appendChild(markBtn);
    contentArea.appendChild(controls);
    contentArea.focus();
  }

  function saveProgress(lessonId, completed = true, score = 0) {
    progress[lessonId] = { completed, score, at: (new Date()).toISOString() };
    save(KEY_PROGRESS, progress);
  }

  function updateProgressSummary() {
    const total = contents.length;
    const done = Object.values(progress).filter(p => p.completed).length;
    progressSummary.textContent = `${done} / ${total} lecciones completadas`;
  }

  function openModal() {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modalTitle.textContent = 'Panel docente';
  
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    authArea.style.display = 'block';
    adminArea.style.display = 'none';
    $('#pwd').value = '';
    bulkJson.value = '';
    lessonsEditor.innerHTML = '';
  }

  function teacherLogin() {
    const pwd = $('#pwd').value.trim();
    if (pwd === ROLES.admin) {
      authArea.style.display = 'none';
      adminArea.style.display = 'block';
      adminArea.dataset.role = 'admin';
      renderAdminArea('admin');
    } else if (pwd === ROLES.editor) {
      authArea.style.display = 'none';
      adminArea.style.display = 'block';
      adminArea.dataset.role = 'editor';
      renderAdminArea('editor');
    } else {
      alert('Contraseña incorrecta (prototipo).');
    }
  }

  function renderAdminArea(role) {
    bulkJson.value = '';
    lessonsEditor.innerHTML = '';
    renderLessonsEditor();
    const exportAllBtn = document.querySelector('#downloadBackup');
    if (role === 'editor') {
      exportAllBtn.style.display = 'none';
    } else exportAllBtn.style.display = '';
  }

  function renderLessonsEditor() {
    lessonsEditor.innerHTML = '';
    contents.forEach(l => {
      const box = el('div', { style: 'padding:8px;border:1px solid rgba(15,23,42,0.03);border-radius:8px;margin-bottom:8px' });
      const title = el('div', { style: 'font-weight:600' }, `${l.subject}: ${l.title}`);
      const actions = el('div', { style: 'display:flex;gap:8px;margin-top:8px' });
      const editBtn = el('button', { class: 'small' }, 'Editar');
      const dupBtn = el('button', { class: 'small ghost' }, 'Duplicar');
      const exportBtn = el('button', { class: 'small ghost' }, 'Exportar Asignatura');
      const delBtn = el('button', { class: 'small danger' }, 'Eliminar');
      editBtn.addEventListener('click', () => openEditDialog(l));
      delBtn.addEventListener('click', () => { if (confirm('Eliminar lección?')) { contents = contents.filter(x => x.id !== l.id); save(KEY_CONTENT, contents); renderSubjects(); renderLessonsEditor(); updateProgressSummary(); } });
      dupBtn.addEventListener('click', () => { const copy = Object.assign({}, JSON.parse(JSON.stringify(l)), { id: genId(), title: l.title + ' (copia)' }); contents.unshift(copy); save(KEY_CONTENT, contents); renderSubjects(); renderLessonsEditor(); });
      exportBtn.addEventListener('click', () => exportSubject(l.subject));
      actions.appendChild(editBtn); actions.appendChild(dupBtn); actions.appendChild(exportBtn); actions.appendChild(delBtn);
      box.appendChild(title); box.appendChild(actions);
      lessonsEditor.appendChild(box);
    });
  }

  function openEditDialog(lesson) {
    const editor = el('div', { style: 'margin-top:10px;padding:10px;border:1px dashed rgba(15,23,42,0.06);border-radius:8px;background:#fbfffb' });
    editor.appendChild(el('label', {}, 'Asignatura')); const subj = el('input', { type: 'text', value: lesson.subject }); editor.appendChild(subj);
    editor.appendChild(el('label', {}, 'Título')); const title = el('input', { type: 'text', value: lesson.title }); editor.appendChild(title);
    editor.appendChild(el('label', {}, 'Cuerpo (HTML simple)')); const body = el('textarea', { rows: 6 }); body.value = lesson.body; editor.appendChild(body);
    editor.appendChild(el('label', {}, 'Media (ruta local, opcional, ej: media/video.mp4 o media/imagen.jpg)')); const media = el('input', { type: 'text', value: lesson.media || '' }); editor.appendChild(media);
    editor.appendChild(el('label', {}, 'Pregunta quiz')); const q = el('input', { type: 'text', value: lesson.quiz ? lesson.quiz.question : '' }); editor.appendChild(q);
    editor.appendChild(el('label', {}, 'Opciones (separadas por |)')); const opts = el('input', { type: 'text', value: lesson.quiz ? lesson.quiz.choices.join('|') : '' }); editor.appendChild(opts);
    editor.appendChild(el('label', {}, 'Índice respuesta correcta (0-based)')); const ans = el('input', { type: 'text', value: lesson.quiz ? String(lesson.quiz.answer) : '0' }); editor.appendChild(ans);

    const saveBtn = el('button', { class: 'btn', style: 'margin-top:8px' }, 'Guardar cambios');
    saveBtn.addEventListener('click', () => {
      lesson.subject = subj.value || lesson.subject;
      lesson.title = title.value || lesson.title;
      lesson.body = body.value || lesson.body;
      lesson.media = media.value || '';
      const choices = opts.value.split('|').map(s => s.trim()).filter(Boolean);
      lesson.quiz = { question: q.value || '', choices, answer: Math.max(0, Math.min(choices.length - 1, parseInt(ans.value) || 0)) };
      save(KEY_CONTENT, contents);
      toast('Lección actualizada.');
      renderSubjects();
      renderLessonsEditor();
    });
    lessonsEditor.insertBefore(editor, lessonsEditor.firstChild);
    editor.scrollIntoView({ behavior: 'smooth' });
  }

  function createNewLesson() {
    const newL = { id: genId(), subject: 'Nueva asignatura', title: 'Nueva lección', body: '<p>Contenido...</p>', media: '', quiz: { question: 'Pregunta?', choices: ['A', 'B', 'C'], answer: 0 } };
    contents.unshift(newL);
    save(KEY_CONTENT, contents);
    renderSubjects();
    renderLessonsEditor();
    toast('Lección creada. Edita para completar.');
  }

  function applyBulkJson() {
    if (!bulkJson.value.trim()) { alert('Pega aquí un JSON con un arreglo de lecciones.'); return; }
    try {
      const data = JSON.parse(bulkJson.value);
      if (!Array.isArray(data)) throw new Error('El JSON debe ser un arreglo.');
      const normalized = data.map(d => ({ id: d.id || genId(), subject: d.subject || 'Sin asignatura', title: d.title || 'Sin título', body: d.body || '', media: d.media || '', quiz: d.quiz || null }));
      contents = normalized;
      save(KEY_CONTENT, contents);
      renderSubjects();
      renderLessonsEditor();
      updateProgressSummary();
      toast('Contenido aplicado.');
    } catch (err) {
      alert('Error JSON: ' + err.message);
    }
  }

  function resetToSample() { if (confirm('Restaurar contenido de ejemplo? Se perderán los actuales.')) { contents = SAMPLE_CONTENT.slice(); save(KEY_CONTENT, contents); renderSubjects(); renderLessonsEditor(); updateProgressSummary(); toast('Restaurado a ejemplo.'); } }

  function clearProgress() { if (confirm('Borrar todo el progreso local?')) { progress = {}; save(KEY_PROGRESS, progress); updateProgressSummary(); toast('Progreso borrado.'); } }

  function downloadBackup() {
    const payload = { contents, progress, meta: Object.assign({}, meta, { exportedAt: (new Date()).toISOString() }) };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `backup-${(new Date()).toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    meta.lastExport = new Date().toISOString();
    save(KEY_META, meta);
  }

  function exportSubject(subject) {
    const subset = contents.filter(c => c.subject === subject);
    if (!subset.length) { alert('No hay lecciones para la asignatura.'); return; }
    const payload = { subject, contents: subset, exportedAt: (new Date()).toISOString() };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `subject-${slug(subject)}-${(new Date()).toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    toast('Exportado archivo de la asignatura.');
  }

  function exportSubjectPrompt() {
    const subj = prompt('Nombre de la asignatura a exportar:');
    if (subj) exportSubject(subj);
  }

  function handleFileImport(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.contents && Array.isArray(data.contents) && data.subject) {
          if (confirm(`Importar ${data.contents.length} lecciones a la asignatura "${data.subject}"?`)) {
            const toAdd = data.contents.map(d => ({ id: d.id || genId(), subject: d.subject || data.subject, title: d.title || 'Sin título', body: d.body || '', media: d.media || '', quiz: d.quiz || null }));
            contents = contents.concat(toAdd);
            save(KEY_CONTENT, contents);
            renderSubjects();
            updateProgressSummary();
            toast('Importación de asignatura completada.');
          }
        } else if (data.contents && Array.isArray(data.contents)) {
          if (confirm('Importar backup completo (reemplazará contenidos y progreso)?')) {
            contents = data.contents;
            progress = data.progress || {};
            meta = data.meta || meta;
            save(KEY_CONTENT, contents); save(KEY_PROGRESS, progress); save(KEY_META, meta);
            renderSubjects();
            renderLessonsEditor();
            updateProgressSummary();
            toast('Backup importado.');
          }
        } else if (Array.isArray(data)) {
          if (confirm('Importar arreglo de lecciones (reemplazará contenidos)?')) {
            const normalized = data.map(d => ({ id: d.id || genId(), subject: d.subject || 'Sin asignatura', title: d.title || 'Sin título', body: d.body || '', media: d.media || '', quiz: d.quiz || null }));
            contents = normalized;
            save(KEY_CONTENT, contents);
            renderSubjects();
            renderLessonsEditor();
            updateProgressSummary();
            toast('Contenido importado.');
          }
        } else {
          alert('Formato de archivo no reconocido.');
        }
      } catch (err) {
        alert('Error leyendo JSON: ' + err.message);
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  }

  window.MV = { getContents: () => contents, getProgress: () => progress, saveAll: () => { save(KEY_CONTENT, contents); save(KEY_PROGRESS, progress); } };

  save(KEY_CONTENT, contents);
  save(KEY_PROGRESS, progress);
  save(KEY_META, meta);
})();
