async function loadProcessGenerator(){
  console.log('🎯 loadProcessGenerator called!');
  
  const scenarioSel = document.getElementById('pgScenario');
  const stdSel = document.getElementById('pgStandard');
  const topicSel = document.getElementById('pgTopic');
  const approachSel = document.getElementById('pgApproach');
  const riskSel = document.getElementById('pgRisk');
  const generateBtn = document.getElementById('pgGenerate');
  const exportBtn = document.getElementById('pgExport');
  const out = document.getElementById('pgOutput');
  
  console.log('📦 Elements found:', {
    scenarioSel: !!scenarioSel,
    stdSel: !!stdSel,
    topicSel: !!topicSel,
    approachSel: !!approachSel,
    riskSel: !!riskSel,
    generateBtn: !!generateBtn,
    exportBtn: !!exportBtn,
    out: !!out
  });
  
  if(!stdSel || !topicSel || !generateBtn || !out) {
    console.error('❌ Missing required elements!');
    return;
  }

  let comparisons, docs, indexData;
  try{
    console.log('📡 Fetching data files...');
    const [cRes, dRes] = await Promise.all([
      fetch('data/comparisons.json'),
      fetch('data/standards.json')
    ]);
    console.log('📥 Responses received:', {
      comparisons: cRes.ok,
      standards: dRes.ok
    });
    comparisons = await cRes.json();
    docs = await dRes.json();
    console.log('✅ Data loaded successfully!', {
      topics: comparisons.topics.length,
      entries: comparisons.entries.length,
      documents: docs.documents.length
    });
  }catch(e){
    console.error('❌ Failed to load data:', e);
    out.innerHTML = '<div style="color:#ffb4b4;">Failed to load data. Run via local server.</div>';
    return;
  }

  // Optional: load unique_index.json for citations; ignore errors if missing
  try{
    const idxRes = await fetch('data/unique_index.json');
    if(idxRes.ok){ indexData = await idxRes.json(); }
  }catch(_e){ /* optional */ }

  topicSel.innerHTML = comparisons.topics.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');

  const hrefOf = Object.fromEntries(docs.documents.map(d=>[d.standard,d.href]));

  function buildChecklist(std, topicId, approach, risk){
    const topicData = comparisons.entries.filter(e=>e.topic===topicId && e.standard===std)[0];
    const steps = [];
    // Base steps from comparison text
    if(topicData && topicData.content){
      topicData.content.split('\n').forEach(line=>{
        const t = line.trim();
        if(t) steps.push({text:t, weight:1});
      });
    }
    // Tailoring based on approach
    if(approach==='agile'){
      steps.unshift({text:'Establish iterative cadence and backlog for this topic', weight:2});
      steps.push({text:'Hold regular reviews and adapt working agreements', weight:1});
    }else if(approach==='predictive'){
      steps.unshift({text:'Define detailed plan, baselines, and change control for this topic', weight:2});
      steps.push({text:'Set approval gates and document variances', weight:1});
    }else{
      steps.unshift({text:'Blend milestones with iterations; define integration points', weight:2});
      steps.push({text:'Synchronize stage gates with reviews/demos', weight:1});
    }
    // Tailoring based on risk
    if(risk==='high'){
      steps.unshift({text:'Conduct focused risk workshop; define triggers and responses', weight:3});
      steps.push({text:'Increase monitoring frequency and escalation paths', weight:2});
    }else if(risk==='low'){
      steps.push({text:'Right-size documentation and controls for efficiency', weight:1});
    }
    // De-duplicate and order by weight
    const seen = new Set();
    const uniq = steps.filter(s=>{ const k=s.text.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; });
    uniq.sort((a,b)=>b.weight-a.weight);
    return uniq.map(s=>s.text);
  }

  function tokenize(s){
    return (s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2 && !stop.has(w));
  }

  const stop = new Set(['the','and','for','with','that','this','from','into','over','under','your','you','are','was','were','will','can','not','but','per','via','upon','each','such','any','all','use','using','set','define','plan']);

  function findCitations(std, step){
    if(!indexData || !indexData.items) return [];
    const words = tokenize(step);
    if(words.length===0) return [];
    const items = indexData.items.filter(it=>it.standard===std);
    const scored = items.map(it=>{
      const text = (it.content||'').toLowerCase();
      let score = 0;
      for(const w of words){ if(text.includes(w)) score+=1; }
      return {it, score};
    }).filter(x=>x.score>2); // at least 3 keyword hits
    scored.sort((a,b)=>b.score-a.score);
    return scored.slice(0,2).map(x=>x.it); // top 2 citations
  }

  function pickTopicsForScenario(scenario){
    if(scenario==='custom_software') return ['RISK','STAKEHOLDER','PLANNING'];
    if(scenario==='innovative_product') return ['PLANNING','RISK','STAKEHOLDER'];
    if(scenario==='government_project') return ['PLANNING','RISK','PROCUREMENT'];
    return ['PLANNING','RISK','STAKEHOLDER'];
  }

  function buildStructuredProcess(std, scenario, approach, risk){
    const topicIds = pickTopicsForScenario(scenario);
    const phases = [];
    // Basic phase scaffolding
    const phaseDefs = [
      {id:'initiation', name:'Initiation'},
      {id:'planning', name:'Planning'},
      {id:'execution', name:'Execution'},
      {id:'monitoring', name:'Monitoring & Control'},
      {id:'closure', name:'Closure'}
    ];
    const roleSets = {
      PMBOK7: ['Project Manager','Team Lead','Sponsor','Stakeholder Rep'],
      PRINCE2: ['Executive','Senior User','Senior Supplier','Project Manager','Team Manager'],
      ISO: ['Sponsor','Project Manager','Quality Manager','Procurement Lead']
    };
    const artifactsByTopic = {
      PLANNING: ['Project Plan','Schedule','Budget Baseline'],
      RISK: ['Risk Register','Response Plan'],
      STAKEHOLDER: ['Stakeholder Register','Engagement Plan'],
      PROCUREMENT: ['Procurement Plan','Contract Documents']
    };

    // Distribute tailored checklists across phases heuristically
    const activitiesByPhase = { initiation: [], planning: [], execution: [], monitoring: [], closure: [] };
    for(const tId of topicIds){
      const steps = buildChecklist(std, tId, approach, risk);
      steps.forEach(s=>{
        const lower = s.toLowerCase();
        if(lower.includes('define')||lower.includes('establish')||lower.includes('business case')) activitiesByPhase.initiation.push({text:s, topic:tId});
        else if(lower.includes('plan')||lower.includes('baseline')||lower.includes('schedule')) activitiesByPhase.planning.push({text:s, topic:tId});
        else if(lower.includes('execute')||lower.includes('deliver')||lower.includes('implement')) activitiesByPhase.execution.push({text:s, topic:tId});
        else if(lower.includes('monitor')||lower.includes('control')||lower.includes('review')) activitiesByPhase.monitoring.push({text:s, topic:tId});
        else if(lower.includes('close')||lower.includes('handover')||lower.includes('lessons')) activitiesByPhase.closure.push({text:s, topic:tId});
        else activitiesByPhase.planning.push({text:s, topic:tId});
      });
    }

    for(const ph of phaseDefs){
      const acts = activitiesByPhase[ph.id];
      // Attach citations per activity if available
      const activities = acts.map(a=>{
        const cits = findCitations(std, a.text);
        return { text: a.text, topic: a.topic, citations: (cits||[]).slice(0,2) };
      });
      const artifacts = Array.from(new Set([].concat(...topicIds.map(t=>artifactsByTopic[t]||[]))));
      const gates = ph.id==='planning' ? ['Plan Approved'] : ph.id==='execution' ? ['Release/Stage Gate'] : ph.id==='closure' ? ['Acceptance & Handover'] : [];
      phases.push({ id: ph.id, name: ph.name, activities, roles: roleSets[std]||[], artifacts, gates });
    }

    const tailoringNotes = [];
    if(approach==='agile') tailoringNotes.push('Emphasized iterative cadence and reviews due to Agile approach.');
    if(approach==='predictive') tailoringNotes.push('Included detailed baselines and approval gates due to Predictive approach.');
    if(approach==='hybrid') tailoringNotes.push('Combined milestones with iterations due to Hybrid approach.');
    if(risk==='high') tailoringNotes.push('Added risk workshop and tighter monitoring due to High risk.');
    if(risk==='low') tailoringNotes.push('Right-sized documentation due to Low risk.');

    return { phases, tailoringNotes };
  }

  function renderMarkdown(std, scenarioName, topicName, process, docHref){
    const lines = [];
    lines.push(`# Process Proposal — ${scenarioName} (${std})`);
    lines.push('');
    lines.push(`Topic focus: ${topicName}`);
    lines.push('');
    lines.push('## Tailoring Notes');
    process.tailoringNotes.forEach(n=>lines.push(`- ${n}`));
    lines.push('');
    for(const ph of process.phases){
      lines.push(`## ${ph.name}`);
      if(ph.roles.length){ lines.push(`Roles: ${ph.roles.join(', ')}`); }
      if(ph.artifacts.length){ lines.push(`Artifacts: ${ph.artifacts.join(', ')}`); }
      if(ph.gates.length){ lines.push(`Gates: ${ph.gates.join(', ')}`); }
      lines.push('Activities:');
      ph.activities.forEach(a=>{
        const citTxt = (a.citations||[]).map(c=>`[p.${c.page}](${docHref}#page=${c.page})`).join(' ');
        lines.push(`- ${a.text} ${citTxt}`);
      });
      lines.push('');
    }
    return lines.join('\n');
  }

  function render(){
    console.log('🚀 Render function called!');
    const scenario = scenarioSel.value;
    const std = stdSel.value;
    const topic = topicSel.value;
    const approach = approachSel.value;
    const risk = riskSel.value;
    const docHref = hrefOf[std];
    
    console.log('📋 Values:', {scenario, std, topic, approach, risk});

    // Show loading state
    const outputSection = document.getElementById('pgOutputSection');
    console.log('📦 Output section element:', outputSection);
    
    if(outputSection) {
      outputSection.style.display = 'block';
      console.log('✅ Output section display set to block');
      out.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text);"><h3>🔄 Generating Process...</h3><div class="skeleton-loader" style="height:200px; margin-top:20px;"></div></div>';
      console.log('⏳ Loading state shown');
      
      // Scroll to output
      setTimeout(() => {
        outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }

    // Small delay to show loading animation
    setTimeout(() => {
      try {
        console.log('🔧 Starting to build process...');
        const items = buildChecklist(std, topic, approach, risk);
        console.log('📝 Checklist items built:', items.length, 'items');
        
        const basePage = (comparisons.entries.find(e=>e.topic===topic && e.standard===std)||{}).page;

        // Build list with inline citations (if index present)
        const lis = items.map(step => {
          const cits = findCitations(std, step);
          const citesHtml = cits.length ? ` <span style="display:block; font-size:12px; color:#6b7280; margin-top:4px;">Sources: ${cits.map(c=>`<a class=\"text-link\" href=\"${docHref}#page=${c.page}\" target=\"_blank\">p.${c.page} — ${c.title?c.title.replace(/\"/g,'&quot;'):''}</a>`).join(' · ')}</span>` : '';
          return `<li>${step}${citesHtml}</li>`;
        }).join('');

        // Prefer first citation page for the main button, otherwise base page
        let firstCitPage = undefined;
        if(indexData && indexData.items){
          for(const step of items){ const c=findCitations(std, step)[0]; if(c){ firstCitPage=c.page; break; } }
        }
        const linkPage = firstCitPage || basePage;

        const scenarioName = scenarioSel.options[scenarioSel.selectedIndex].textContent;
        const topicName = (comparisons.topics.find(t=>t.id===topic)||{}).name || topic;
        console.log('🏗️ Building structured process...');
        const process = buildStructuredProcess(std, scenario, approach, risk);
        console.log('✅ Process built with', process.phases.length, 'phases');

        const phasesHtml = process.phases.map((ph, index) =>{
          const acts = ph.activities.map(a=>{
            const cits = (a.citations||[]).map(c=>`<a class=\"text-link\" href=\"${docHref}#page=${c.page}\" target=\"_blank\">p.${c.page}</a>`).join(' ');
            return `<li>${a.text} ${cits?`<span style=\"font-size:12px;color:#9fb0e0\">${cits}</span>`:''}</li>`;
          }).join('');
          const roles = ph.roles.length?`<div class=\"repo-meta\"><strong>Roles:</strong> ${ph.roles.join(', ')}</div>`:'';
          const arts = ph.artifacts.length?`<div class=\"repo-meta\"><strong>Artifacts:</strong> ${ph.artifacts.join(', ')}</div>`:'';
          const gates = ph.gates.length?`<div class=\"repo-meta\"><strong>Gates:</strong> ${ph.gates.join(', ')}</div>`:'';
          
          const phaseIcons = ['🚀', '📋', '⚙️', '📊', '✅'];
          const icon = phaseIcons[index] || '📌';
          
          return `<section class=\"compare-card\" style=\"animation-delay: ${index * 0.1}s;\"><h3>${icon} ${ph.name}</h3>${roles}${arts}${gates}<ol style=\"padding-left:18px;\">${acts}</ol></section>`;
        }).join('');

        const notesHtml = process.tailoringNotes.length?`<div class=\"repo-meta\" style=\"margin-top:16px; padding:16px; background: rgba(79, 124, 255, 0.1); border-radius: 12px; border-left: 3px solid var(--primary);\"><strong>📝 Tailoring Notes:</strong><br>${process.tailoringNotes.map(n=>`<span style=\"display:block; margin-top:6px;\">• ${n}</span>`).join('')}</div>`:'';

        console.log('🎨 Rendering HTML...');
        out.innerHTML = `
          <article class="repo-card process-result-card" style="grid-column: 1 / -1;">
            <div class="repo-head" style=\"display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;\">
              <div style=\"display:flex; gap:10px; align-items:center;\">
                <span class="repo-badge">${std}</span>
                <span class="badge" style=\"background: linear-gradient(135deg, #5de4c7, #33c069); color: #0a0f2a; font-weight:600; padding:6px 12px;\">TAILORED</span>
              </div>
            </div>
            <h3 class="repo-title" style=\"font-size:24px; margin-bottom:8px;\">${scenarioName} — ${topicName}</h3>
            <p style=\"color:var(--muted); margin-bottom:20px;\">Generated process workflow based on your selected parameters</p>
            ${notesHtml}
            <div class="compare-grid" style="margin-top:24px; display:grid; gap:20px;">${phasesHtml}</div>
            <div class="repo-actions" style="margin-top:24px; display:flex; gap:12px;"><a class="btn primary" href="${docHref}${linkPage?`#page=${linkPage}`:''}" target="_blank" rel="noopener" style=\"flex:1; justify-content:center;\">📖 View Source in PDF</a></div>
          </article>
        `;
        
        console.log('✅ HTML rendered successfully!');

        // Wire Export button
        exportBtn.onclick = () => {
          const md = renderMarkdown(std, scenarioName, topicName, process, docHref);
          const blob = new Blob([md], {type:'text/markdown'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${scenario}_${std}_${topic}.md`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        };
      } catch(error) {
        console.error('❌ Error generating process:', error);
        out.innerHTML = `<div style="color:#ff6b6b; padding:20px; text-align:center;">
          <h3>❌ Error Generating Process</h3>
          <p>${error.message}</p>
          <pre style="text-align:left; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; font-size:12px; margin-top:10px;">${error.stack}</pre>
        </div>`;
      }
    }, 300);
  }

  generateBtn.addEventListener('click', () => {
    console.log('🖱️ Generate button clicked!');
    alert('Button clicked! Check console for logs.');
    render();
  });
  if(exportBtn) exportBtn.addEventListener('click', (e)=>{ e.preventDefault(); });
  // Don't render on page load - only when user clicks Generate button
  // render();
  
  console.log('✅ Process generator loaded successfully!');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('🌐 DOM Content Loaded!');
  loadProcessGenerator();
});



