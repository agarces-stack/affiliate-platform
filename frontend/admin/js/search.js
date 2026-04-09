async function cmdkSearch(q){
    if(q.length<2){document.getElementById('cmdkResults').innerHTML='<p style="padding:20px;text-align:center;color:#64748b;font-size:13px">Type to search agents, campaigns, conversions...</p>';return}
    document.getElementById('cmdkResults').innerHTML='<p style="padding:15px;color:#94a3b8;font-size:13px">Searching...</p>';
    try{
        const d=await api('/api/reports/search?q='+encodeURIComponent(q));
        let html='';
        const go=(section)=>`document.getElementById('cmdkOverlay').style.display='none';showSection('${section}')`;
        if(d.affiliates?.length){html+=`<div style="padding:6px 16px;color:#64748b;font-size:11px;text-transform:uppercase">Agents</div>`;d.affiliates.forEach(a=>{html+=`<div style="padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;border-radius:8px;margin:2px 8px" onmouseover="this.style.background='#334155'" onmouseout="this.style.background=''" onclick="${go('affiliates')}"><i class="ti ti-user" style="color:#3b82f6"></i><span>${E(a.first_name||'')} ${E(a.last_name||'')}</span><span style="color:#64748b;font-size:12px">${E(a.email)}</span><code style="color:#3b82f6;margin-left:auto;font-size:11px">${E(a.ref_id)}</code></div>`})}
        if(d.campaigns?.length){html+=`<div style="padding:6px 16px;color:#64748b;font-size:11px;text-transform:uppercase;margin-top:4px">Campaigns</div>`;d.campaigns.forEach(c=>{html+=`<div style="padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;border-radius:8px;margin:2px 8px" onmouseover="this.style.background='#334155'" onmouseout="this.style.background=''" onclick="${go('campaigns')}"><i class="ti ti-speakerphone" style="color:#22c55e"></i><span>${E(c.name)}</span></div>`})}
        if(d.conversions?.length){html+=`<div style="padding:6px 16px;color:#64748b;font-size:11px;text-transform:uppercase;margin-top:4px">Conversions</div>`;d.conversions.forEach(c=>{html+=`<div style="padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;border-radius:8px;margin:2px 8px" onmouseover="this.style.background='#334155'" onmouseout="this.style.background=''" onclick="${go('conversions')}"><i class="ti ti-receipt" style="color:#8b5cf6"></i><span>$${N(c.amount)}</span><span style="color:#64748b;font-size:12px">${E(c.affiliate_email||'')}</span></div>`})}
        if(!html)html='<p style="padding:20px;text-align:center;color:#64748b">No results found</p>';
        html+='<div style="padding:8px 16px;border-top:1px solid #334155;margin-top:4px;text-align:center"><kbd style="background:#0f172a;color:#64748b;padding:2px 8px;border-radius:4px;font-size:10px;border:1px solid #334155">Ctrl+K</kbd> <span style="color:#64748b;font-size:11px">to toggle search</span></div>';
        document.getElementById('cmdkResults').innerHTML=html;
    }catch(e){document.getElementById('cmdkResults').innerHTML='<p style="padding:15px;color:#ef4444">Search failed</p>'}
}

// GLOBAL SEARCH (legacy - kept for search bar)
let searchTimer;
function debounceSearch(){clearTimeout(searchTimer);searchTimer=setTimeout(globalSearch,300)}
async function globalSearch(){
    const q=document.getElementById('globalSearch').value.trim();
    const box=document.getElementById('searchResults');
    if(q.length<2){box.style.display='none';return}
    const d=await api('/api/reports/search?q='+encodeURIComponent(q));
    let html='';
    if(d.affiliates?.length){html+='<div style="padding:8px 16px;color:#64748b;font-size:11px;text-transform:uppercase;border-bottom:1px solid #334155">Agents</div>';html+=d.affiliates.map(a=>`<div style="padding:10px 16px;cursor:pointer;border-bottom:1px solid #0f172a" onclick="document.getElementById('globalSearch').value='';document.getElementById('searchResults').style.display='none';showSection('affiliates')"><span style="color:#3b82f6;font-weight:600">${E(a.ref_id)}</span> ${E(a.first_name||'')} ${E(a.last_name||'')} <span style="color:#64748b">· ${E(a.email)}</span></div>`).join('')}
    if(d.campaigns?.length){html+='<div style="padding:8px 16px;color:#64748b;font-size:11px;text-transform:uppercase;border-bottom:1px solid #334155">Campaigns</div>';html+=d.campaigns.map(c=>`<div style="padding:10px 16px;cursor:pointer;border-bottom:1px solid #0f172a" onclick="document.getElementById('globalSearch').value='';document.getElementById('searchResults').style.display='none';showSection('campaigns')"><span style="color:#22c55e;font-weight:600">${E(c.name)}</span> <span style="color:#64748b">· ${E(c.commission_type)}</span></div>`).join('')}
    if(d.conversions?.length){html+='<div style="padding:8px 16px;color:#64748b;font-size:11px;text-transform:uppercase;border-bottom:1px solid #334155">Conversions</div>';html+=d.conversions.map(c=>`<div style="padding:10px 16px;cursor:pointer;border-bottom:1px solid #0f172a" onclick="document.getElementById('globalSearch').value='';document.getElementById('searchResults').style.display='none';showSection('conversions')"><span style="color:#8b5cf6;font-weight:600">$${N(c.amount)}</span> <span style="color:#64748b">· ${E(c.affiliate_email||'')} · ${E(c.order_id||'no order id')}</span></div>`).join('')}
    if(!html)html='<div style="padding:20px;text-align:center;color:#64748b">No results found</div>';
    box.innerHTML=html;box.style.display='block';
}
document.addEventListener('click',e=>{if(!e.target.closest('#globalSearch')&&!e.target.closest('#searchResults'))document.getElementById('searchResults').style.display='none'});
