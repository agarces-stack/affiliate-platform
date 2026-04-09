async function aiPreview(){
    const prompt=document.getElementById('aiPrompt').value.trim();
    if(!prompt)return;
    const box=document.getElementById('aiResult');
    box.style.display='block';
    box.innerHTML='<div style="text-align:center;color:#8b5cf6;padding:20px">Thinking...</div>';
    try{
        const d=await api('/api/ai/preview',{method:'POST',body:JSON.stringify({prompt})});
        const c=d.config;
        window._aiConfig=c;
        let html=`<div style="margin-bottom:15px"><strong style="color:#8b5cf6;font-size:16px">${E(c.summary||'AI Configuration')}</strong></div>`;
        if(c.campaign)html+=`<div style="background:#0f172a;padding:12px;border-radius:8px;margin-bottom:10px"><strong style="color:#3b82f6">Campaign:</strong> ${E(c.campaign.name)} <span style="color:#64748b">· ${E(c.campaign.commission_type)} · ${c.campaign.commission_percent?c.campaign.commission_percent+'%':''}${c.campaign.commission_amount?' $'+N(c.campaign.commission_amount):''}</span></div>`;
        if(c.products?.length)html+=`<div style="background:#0f172a;padding:12px;border-radius:8px;margin-bottom:10px"><strong style="color:#22c55e">Products (${c.products.length}):</strong><ul style="margin:8px 0 0 20px;color:#94a3b8">${c.products.map(p=>`<li><strong>${E(p.name)}</strong> [${E(p.sku)}] $${N(p.price)} · ${p.commission_percent?p.commission_percent+'%':''}${p.commission_amount?'+$'+N(p.commission_amount):''}${p.is_recurring?' · <span style="color:#8b5cf6">Recurring</span>':''}${p.goals?.length?'<br><span style="font-size:12px;color:#64748b">Goals: '+p.goals.map(g=>`${g.step_order}.${g.name}(${g.commission_amount?'$'+N(g.commission_amount):''}${g.commission_percent?g.commission_percent+'%':''})`).join(' → ')+'</span>':''}</li>`).join('')}</ul></div>`;
        if(c.rank_commissions?.length)html+=`<div style="background:#0f172a;padding:12px;border-radius:8px;margin-bottom:10px"><strong style="color:#eab308">Rank Commissions:</strong><table style="width:100%;margin-top:8px;font-size:12px"><tr style="color:#64748b"><th style="text-align:left;padding:4px">Rank</th><th>Direct %</th><th>Direct $</th><th>Override %</th><th>Override $</th></tr>${c.rank_commissions.map(r=>`<tr><td style="padding:4px">${r.rank_number}. ${E(r.rank_name)}</td><td style="text-align:center">${N(r.direct_commission_percent)}%</td><td style="text-align:center">$${N(r.direct_commission_fixed)}</td><td style="text-align:center">${N(r.override_commission_percent)}%</td><td style="text-align:center">$${N(r.override_commission_fixed)}</td></tr>`).join('')}</table></div>`;
        if(c.override_mode)html+=`<div style="color:#94a3b8;font-size:13px;margin-bottom:10px">Override mode: <strong style="color:#e2e8f0">${E(c.override_mode)}</strong></div>`;
        if(c.suggestions?.length)html+=`<div style="background:#eab30811;border:1px solid #eab30844;padding:10px;border-radius:8px;margin-bottom:10px;font-size:13px;color:#eab308">${c.suggestions.map(s=>'• '+E(s)).join('<br>')}</div>`;
        html+=`<div style="display:flex;gap:10px;margin-top:15px"><button class="btn btn-blue" onclick="aiApply()" style="flex:1;padding:12px">Apply This Configuration</button><button class="btn btn-gray" onclick="document.getElementById('aiResult').style.display='none'" style="padding:12px">Cancel</button></div>`;
        box.innerHTML=html;
    }catch(e){box.innerHTML=`<div style="color:#ef4444;padding:10px">${E(e.message||'AI request failed')}</div>`}
}
async function aiApply(){
    if(!window._aiConfig)return;
    const box=document.getElementById('aiResult');
    box.innerHTML='<div style="text-align:center;color:#22c55e;padding:20px">Creating...</div>';
    try{
        const d=await api('/api/ai/apply',{method:'POST',body:JSON.stringify({config:window._aiConfig})});
        box.innerHTML=`<div style="text-align:center;padding:20px"><div style="color:#22c55e;font-size:18px;font-weight:700;margin-bottom:10px">Created!</div><div style="color:#94a3b8">Campaign: ${E(d.results.campaign?.name||'')}<br>Products: ${d.results.products?.length||0}<br>Rank commissions: ${d.results.rank_commissions?.length||0}</div><button class="btn btn-gray" style="margin-top:15px" onclick="document.getElementById('aiResult').style.display='none';document.getElementById('aiPrompt').value=''">Close</button></div>`;
        window._aiConfig=null;
    }catch(e){box.innerHTML=`<div style="color:#ef4444;padding:10px">${E(e.message||'Failed to apply')}</div>`}
}
document.getElementById('aiPrompt').addEventListener('keydown',e=>{if(e.key==='Enter')aiPreview()});
