async function loadUniqueness(){
  const grid = document.getElementById('uniqueGrid');
  const search = document.getElementById('uniqueSearch');
  const chips = document.querySelectorAll('.toolbar.chips .chip');
  if(!grid) return;
  let data, docs;
  try{
    const [uRes, dRes] = await Promise.all([
      fetch('data/unique.json'),
      fetch('data/standards.json')
    ]);
    data = await uRes.json();
    docs = await dRes.json();
  }catch(e){
    grid.innerHTML = '<div style="color:#ffb4b4;">Failed to load uniqueness data. Run via local server.</div>';
    return;
  }
  const hrefOf = Object.fromEntries(docs.documents.map(d=>[d.standard,d.href]));

  let active = 'ALL';
  function render(){
    const q = (search?.value||'').toLowerCase();
    grid.innerHTML = '';
    data.items.forEach(item=>{
      if(active!=='ALL' && item.standard!==active) return;
      const hay = (item.title+' '+item.desc+' '+(item.tags||[]).join(' ')).toLowerCase();
      if(q && !hay.includes(q)) return;
      const href = hrefOf[item.standard] + (item.page?`#page=${item.page}`:'');
      const card = document.createElement('article');
      card.className = 'repo-card';
      card.innerHTML = `
        <div class="repo-head"><span class="repo-badge">${item.standard}</span><span class="badge">UNIQUE</span></div>
        <h3 class="repo-title">${item.title}</h3>
        <p class="repo-desc">${item.desc}</p>
        <div class="repo-meta"><span class="page-pill">📄 Page ${item.page||'-'}</span></div>
        <div class="repo-tags">${(item.tags||[]).map(t=>`<span class=\"tag\">${t}</span>`).join('')}</div>
        <div class="repo-actions"><a class="btn primary" href="${href}" target="_blank" rel="noopener">📖 Open in PDF</a></div>
      `;
      grid.appendChild(card);
    });
  }

  chips.forEach(c=>c.addEventListener('click',()=>{
    chips.forEach(x=>x.classList.remove('active'));
    c.classList.add('active');
    active = c.getAttribute('data-filter')||'ALL';
    render();
  }));
  search?.addEventListener('input',render);
  render();
}

document.addEventListener('DOMContentLoaded', loadUniqueness);


