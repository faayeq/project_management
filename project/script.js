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

async function loadDocs() {
  const cardsEl = document.getElementById('repoCards');
  if (!cardsEl) return;
  const searchEl = document.getElementById('searchInput');
  const chipButtons = document.querySelectorAll('.chip');
  let data;
  try {
    const res = await fetch('data/standards.json');
    data = await res.json();
  } catch (err) {
    showProtocolNotice();
    cardsEl.innerHTML = '<div style="color:#ffb4b4;">Failed to load repository (blocked by browser). Please run a local server. See README.</div>';
    return;
  }

  const standardToHref = Object.fromEntries(data.documents.map(d => [d.standard, d.href]));
  // If repository is empty in standards.json, try loading extended repository.json
  if (!data.repository || data.repository.length === 0) {
    try {
      const repoRes = await fetch('data/repository.json');
      const repoJson = await repoRes.json();
      data.repository = repoJson.items || [];
    } catch (e) {
      // ignore, fallback to empty
      data.repository = [];
    }
  }

  let activeFilter = 'ALL';
  function render() {
    const q = (searchEl?.value || '').trim().toLowerCase();
    cardsEl.innerHTML = '';
    (data.repository || []).forEach(item => {
      if (activeFilter !== 'ALL' && item.standard !== activeFilter) return;
      const matchesText = !q || item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q) || (item.tags||[]).some(t => t.toLowerCase().includes(q));
      if (!matchesText) return;
      const href = (standardToHref[item.standard] || '#') + (item.page ? `#page=${item.page}` : '');
      const card = document.createElement('article');
      card.className = 'repo-card';
      card.innerHTML = `
        <div class="repo-head">
          <span class="repo-badge">${item.standard}</span>
        </div>
        <h3 class="repo-title">${item.title}</h3>
        <p class="repo-desc">${item.desc}</p>
        <div class="repo-meta"><span class="page-pill">📄 Page ${item.page || '-'}</span></div>
        <div class="repo-tags">${(item.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <div class="repo-actions">
          <a class="btn primary" href="${href}" target="_blank" rel="noopener"><span class="icon">📖</span> Open in PDF</a>
          <a class="btn outline" href="compare.html?topic=${encodeURIComponent(item.title)}"><span class="icon">🔍</span> View Context</a>
        </div>
      `;
      cardsEl.appendChild(card);
    });
  }

  chipButtons.forEach(btn => btn.addEventListener('click', () => {
    chipButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.getAttribute('data-filter') || 'ALL';
    render();
  }));

  searchEl?.addEventListener('input', render);
  render();
}

document.addEventListener('DOMContentLoaded', () => { showProtocolNotice(); loadDocs(); });

// Load comparisons and wire up UI
const TOPIC_SELECT = document.getElementById('topic-select');
const PM_CONTENT = document.getElementById('pmbok-content');
const PR_CONTENT = document.getElementById('prince2-content');
const ISO_CONTENT = document.getElementById('iso-content');
const VIEWER = document.getElementById('viewer');
const REPO_SEARCH = document.getElementById('repo-search');
const REPO_LIST = document.getElementById('repo-list');
const BOOKMARKS_LIST = document.getElementById('bookmarks-list');
const INS_SIM = document.getElementById('ins-sim');
const INS_DIFF = document.getElementById('ins-diff');
const INS_UNIQ = document.getElementById('ins-uniq');

let comparisons = {};

async function loadData(){
  try{
    const res = await fetch('data/comparisons.json');
    comparisons = await res.json();
  }catch(e){
    console.error('Could not load comparisons.json',e);
    // fallback small dataset
    comparisons = {topics:[]};
  }
  populateTopics();
  populateInsights();
  loadBookmarks();
}

function populateTopics(){
  const topics = comparisons.topics || [];
  topics.forEach(t=>{
    const opt = document.createElement('option'); opt.value=t.id; opt.textContent=t.title; TOPIC_SELECT.appendChild(opt);
  });
  TOPIC_SELECT.addEventListener('change',onTopicChange);
  if(topics.length) TOPIC_SELECT.value = topics[0].id, onTopicChange();
}

function onTopicChange(){
  const id = TOPIC_SELECT.value;
  const topic = (comparisons.topics||[]).find(t=>t.id===id);
  if(!topic) return;
  PM_CONTENT.innerHTML = renderSnippet(topic.pmbok,'pmbok');
  PR_CONTENT.innerHTML = renderSnippet(topic.prince2,'prince2');
  ISO_CONTENT.innerHTML = renderSnippet(topic.iso,'iso');
}

function renderSnippet(obj, standardKey){
  // obj: {text,id,file}
  const container = document.createElement('div');
  const p = document.createElement('p'); p.innerText = obj.text; container.appendChild(p);
  const meta = document.createElement('div'); meta.className='meta'; meta.innerHTML=`<small class="hint">Section: ${obj.section}</small>`;
  container.appendChild(meta);
  const open = document.createElement('button'); open.textContent='Open in viewer';
  open.addEventListener('click',()=>{
    VIEWER.src = obj.file + '#' + obj.anchor;
  });
  container.appendChild(open);
  const bm = document.createElement('button'); bm.style.marginLeft='8px'; bm.textContent='Bookmark';
  bm.addEventListener('click',()=>saveBookmark({title:comparisons.topics.find(t=>t.id===TOPIC_SELECT.value).title, file:obj.file, anchor:obj.anchor}));
  container.appendChild(bm);
  // highlight classes
  if(obj.type==='similar') container.classList.add('highlight-sim');
  else if(obj.type==='unique') container.classList.add('highlight-uniq');
  else if(obj.type==='different') container.classList.add('highlight-diff');
  return container.innerHTML;
}

// Insights
function populateInsights(){
  const ins = comparisons.insights || {similarities:[],differences:[],unique:[]};
  INS_SIM.innerHTML = ins.similarities.map(s=>`<li>${s}</li>`).join('') || '<li><em>None</em></li>';
  INS_DIFF.innerHTML = ins.differences.map(s=>`<li>${s}</li>`).join('') || '<li><em>None</em></li>';
  INS_UNIQ.innerHTML = ins.unique.map(s=>`<li>${s}</li>`).join('') || '<li><em>None</em></li>';
}

// Bookmarks
function saveBookmark(b){
  const list = JSON.parse(localStorage.getItem('pm_bookmarks')||'[]');
  list.unshift(b); localStorage.setItem('pm_bookmarks',JSON.stringify(list.slice(0,20))); loadBookmarks();
}
function loadBookmarks(){
  const list = JSON.parse(localStorage.getItem('pm_bookmarks')||'[]');
  BOOKMARKS_LIST.innerHTML = list.map((b,i)=>`<li><a href="${b.file}#${b.anchor}" target="viewer">${b.title} — ${b.anchor}</a> <button data-idx="${i}" class="del">x</button></li>`).join('') || '<li><em>No bookmarks</em></li>';
  Array.from(document.querySelectorAll('.del')).forEach(btn=>btn.addEventListener('click',e=>{const i=+e.target.dataset.idx; const list=JSON.parse(localStorage.getItem('pm_bookmarks')||'[]'); list.splice(i,1); localStorage.setItem('pm_bookmarks',JSON.stringify(list)); loadBookmarks();}));
}

// Repo search (filter links by text)
REPO_SEARCH.addEventListener('input',e=>{
  const q=e.target.value.toLowerCase(); Array.from(REPO_LIST.querySelectorAll('li')).forEach(li=>{li.style.display = li.innerText.toLowerCase().includes(q)?'block':'none'});
});

// Export WBS
document.getElementById('export-wbs').addEventListener('click',()=>{
  const wbs = {title:'WBS - Project',items:[
    {name:'Initiation',children:['Business case','Stakeholders','Governance']},
    {name:'Planning',children:['Scope','Schedule','Budget','Risk']},
    {name:'Execution',children:['Deliverables','Communication']},
    {name:'Monitoring',children:['Change control','Reporting']},
    {name:'Closure',children:['Handover','Lessons']}
  ]};
  const blob = new Blob([JSON.stringify(wbs,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='wbs.json'; a.click(); URL.revokeObjectURL(url);
});

loadData();
