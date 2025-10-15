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

async function loadInsights() {
  const errorEl = document.getElementById('insights') || document.body;
  let data; let docs;
  try {
    const [res, dres] = await Promise.all([
      fetch('data/insights.json'),
      fetch('data/standards.json')
    ]);
    data = await res.json();
    docs = await dres.json();
  } catch (err) {
    showProtocolNotice();
    if (errorEl) errorEl.innerHTML = '<div style="color:#ffb4b4;">Failed to load insights. Run a local server.</div>';
    return;
  }
  const hrefOf = Object.fromEntries(docs.documents.map(d=>[d.standard,d.href]));
  // Fill the tabbed layout containers
  const simEl = document.getElementById('similaritiesContent');
  const diffEl = document.getElementById('differencesContent');
  const uniqEl = document.getElementById('uniqueContent');
  const mapEl = document.getElementById('coverageMap');

  if (simEl) simEl.innerHTML = `<ul>${(data.common||[]).map(i=>`<li>${i.title} — ${i.citations.map(c=>`<a class=\"text-link\" href=\"${hrefOf[c.std]}#page=${c.page}\" target=\"_blank\">${c.std} p.${c.page}</a>`).join(', ')}</li>`).join('')}</ul>`;

  if (diffEl) diffEl.innerHTML = `${(data.differences||[]).map(d=>`
      <div style="margin-bottom:10px;">
        <strong>${d.area}</strong>
        <ul>
          <li>PMBOK7 (${d.PMBOK7.page}): ${d.PMBOK7.text}</li>
          <li>PRINCE2 (${d.PRINCE2.page}): ${d.PRINCE2.text}</li>
          <li>ISO (${d.ISO.page}): ${d.ISO.text}</li>
        </ul>
      </div>`).join('')}`;

  if (uniqEl) uniqEl.innerHTML = `<ul>${(data.unique_examples||[]).map(u=>`<li>${u.std}: ${u.title} — <a class=\"text-link\" href=\"${hrefOf[u.std]}#page=${u.page}\" target=\"_blank\">p.${u.page}</a></li>`).join('')}</ul>`;

  // Coverage map
  if (mapEl) {
    const topics = ['Planning','Risk','Stakeholder','Quality','Resources','Communication','Procurement','Integration'];
    const head = `<div class="coverage-table"><table><thead><tr><th>Topic</th><th>PMBOK 7</th><th>PRINCE2</th><th>ISO 21500</th><th>ISO 21502</th></tr></thead><tbody>`;
    const rows = topics.map(t=>`<tr><td><strong>${t}</strong></td>
      <td><div class="coverage-indicator ${coverageLevel(t,'PMBOK7')}"></div></td>
      <td><div class="coverage-indicator ${coverageLevel(t,'PRINCE2')}"></div></td>
      <td><div class="coverage-indicator ${coverageLevel(t,'ISO')}"></div></td>
      <td><div class="coverage-indicator ${coverageLevel(t,'ISO')}"></div></td>
    </tr>`).join('');
    const legend = `</tbody></table></div><div class="coverage-legend">
      <span><div class="coverage-indicator comprehensive"></div> Comprehensive</span>
      <span><div class="coverage-indicator moderate"></div> Moderate</span>
      <span><div class="coverage-indicator basic"></div> Basic</span>
      <span><div class="coverage-indicator none"></div> Not Covered</span>
    </div>`;
    mapEl.innerHTML = head + rows + legend;
  }
}

document.addEventListener('DOMContentLoaded', () => { showProtocolNotice(); loadInsights(); });

function coverageLevel(topic, std){
  // crude mapping just for visual; adjust as needed
  const comp = ['Planning','Risk','Quality','Communication'];
  const mod = ['Stakeholder','Resources','Procurement','Integration'];
  if (comp.includes(topic)) return 'comprehensive';
  if (mod.includes(topic)) return 'moderate';
  return 'basic';
}


