function save(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('save error', e);
    alert('No se pudo guardar en localStorage.');
  }
}

function load(key) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    console.error('load error', e);
    return null;
  }
}

function genId() {
  return 'id-' + Math.random().toString(36).slice(2, 9);
}

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const k in attrs)
    n.setAttribute(k, attrs[k]);

  children.forEach(c => {
    if (typeof c === 'string')
      n.appendChild(document.createTextNode(c));
    else if (c)
      n.appendChild(c);
  });
  return n;
}

function isVideo(path) {
  const ext = path.split('.').pop().toLowerCase();
  return ['mp4', 'webm', 'ogg'].includes(ext);
}

function slug(s) {
  return s.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

function toast(msg, time = 2000) {
  let t = document.getElementById('mv-toast');
  if (!t) {
    t = el('div', {
      id: 'mv-toast',
      style: 'position:fixed;right:20px;bottom:20px;padding:10px 14px;border-radius:8px;background:rgba(15,23,42,0.9);color:white;box-shadow:0 6px 24px rgba(0,0,0,0.2);z-index:9999'
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, time);
}
