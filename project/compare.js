function showProtocolNotice() {
  if (location.protocol === 'file:') {
    const note = document.createElement('div');
    note.style.position = 'sticky';
    note.style.top = '0';
    note.style.zIndex = '100';
    note.style.padding = '10px 12px';
    note.style.background = '#3d2a2a';
    note.style.borderBottom = '1px solid #6b3a3a';
    note.style.color = '#fff';
    note.innerHTML = 'Local file mode detected. Your browser may block loading JSON (fetch). Run a local server: <code>python -m http.server 8000</code> or <code>npx serve -l 8000</code> and open <a style="color:#5de4c7;" href="http://localhost:8000/">http://localhost:8000/</a>.';
    document.body.prepend(note);
  }
}

async function loadComparison() {
  const selectEl = document.getElementById('topicSelect');
  const filterEl = document.getElementById('topicFilter');
  const gridEl = document.getElementById('compareGrid');
  if (!selectEl || !gridEl) return;

  let docs, comparisons;
  try {
    const [docsRes, cmpRes] = await Promise.all([
      fetch('data/standards.json'),
      fetch('data/comparisons.json')
    ]);
    docs = await docsRes.json();
    comparisons = await cmpRes.json();
  } catch (err) {
    showProtocolNotice();
    gridEl.innerHTML = '<div style="color:#ffb4b4;">Failed to load comparison data (blocked by browser). Please run a local server. See README.</div>';
    return;
  }

  const topics = comparisons.topics.map(t => t.id);
  selectEl.innerHTML = topics.map(id => `<option value="${id}">${comparisons.topics.find(t => t.id === id).name}</option>`).join('');

  const urlTopic = new URLSearchParams(location.search).get('topic');
  if (urlTopic) {
    const match = comparisons.topics.find(t => t.name.toLowerCase() === urlTopic.toLowerCase() || t.id.toLowerCase() === urlTopic.toLowerCase());
    if (match) selectEl.value = match.id;
  }

  function render() {
    const topicId = selectEl.value;
    const filterText = (filterEl && filterEl.value || '').toLowerCase();
    const data = comparisons.entries.filter(e => e.topic === topicId);
    const standards = ['PMBOK7', 'PRINCE2', 'ISO'];
    gridEl.innerHTML = '';
    standards.forEach(std => {
      const item = data.find(d => d.standard === std);
      const doc = docs.documents.find(d => d.standard === std);
      const content = item ? item.content : '—';
      const filtered = filterText ? content.split('\n').filter(line => line.toLowerCase().includes(filterText)).join('\n') : content;
      const pageHref = (item && item.page) ? `${doc.href}#page=${item.page}` : doc.href;
      const el = document.createElement('article');
      el.className = 'repo-card';
      el.innerHTML = `
        <div class="repo-head"><span class="repo-badge">${doc.short}</span></div>
        <h3 class="repo-title">${comparisons.topics.find(t=>t.id===topicId).name}</h3>
        <p class="repo-desc">${filtered}</p>
        <div class="repo-meta"><span class="page-pill">📄 Page ${item?.page || '-'}</span></div>
        <div class="repo-actions">
          <a class="btn primary" href="${pageHref}" target="_blank" rel="noopener">📖 Open in PDF</a>
        </div>
      `;
      gridEl.appendChild(el);
    });
  }

  selectEl.addEventListener('change', render);
  if (filterEl) filterEl.addEventListener('input', render);
  render();
}

document.addEventListener('DOMContentLoaded', () => { showProtocolNotice(); loadComparison(); });


