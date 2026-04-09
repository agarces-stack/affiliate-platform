async function loadRanks(){
    // Load override settings
    try{const s=await api('/api/ranks/settings');document.getElementById('overrideModeSelect').value=s.override_mode||'fixed';document.getElementById('maxDepthInput').value=s.max_recruitment_depth||0}catch(e){}
    const ranks=await api('/api/ranks');
    document.querySelector('#rankTable tbody').innerHTML=ranks.map(x=>`<tr>
        <td><span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:${E(x.color)};text-align:center;line-height:24px;font-weight:700;font-size:12px;color:#fff">${x.rank_number}</span></td>
        <td>${E(x.name)}</td>
        <td><span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:${E(x.color)}"></span> ${E(x.color)}</td>
        <td>${x.can_recruit?'<span class="badge badge-green">Yes</span>':'<span class="badge badge-red">No</span>'}</td>
        <td>${x.max_recruit_depth||'Unlimited'}</td>
        <td><button class="btn btn-blue" onclick="showEditRankModal(${x.rank_number},'${E(x.name)}','${E(x.color)}',${x.can_recruit},${x.max_recruit_depth||0})">Edit</button></td>
    </tr>`).join('');
    // Load campaigns for commission matrix
    const camps=await api('/api/campaigns');
    const sel=document.getElementById('rankCampaignSelect');
    sel.innerHTML='<option value="">-- Select Campaign --</option>'+camps.map(c=>`<option value="${c.id}">${E(c.name)}</option>`).join('');
}

function showEditRankModal(num,name,color,canRecruit,maxDepth){
    openModal(`<h2>Edit Rank ${num}</h2>
        <label>Name</label><input id="rk_name" value="${name}">
        <label>Color</label><input id="rk_color" type="color" value="${color}">
        <label>Can Recruit</label><select id="rk_recruit"><option value="true" ${canRecruit?'selected':''}>Yes</option><option value="false" ${!canRecruit?'selected':''}>No</option></select>
        <label>Max Recruit Depth (0 = unlimited)</label><input id="rk_depth" type="number" value="${maxDepth}" min="0">
        <div class="modal-actions"><button class="btn btn-blue" onclick="saveRank(${num})">Save</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function saveRank(num){
    await api('/api/ranks/'+num,{method:'PUT',body:JSON.stringify({name:document.getElementById('rk_name').value,color:document.getElementById('rk_color').value,can_recruit:document.getElementById('rk_recruit').value==='true',max_recruit_depth:parseInt(document.getElementById('rk_depth').value)||0})});
    closeModal();loadRanks();
}

async function loadRankCommissions(){
    const campId=document.getElementById('rankCampaignSelect').value;
    if(!campId){document.getElementById('rankCommTable').style.display='none';return}
    document.getElementById('rankCommTable').style.display='table';
    const data=await api('/api/ranks/commissions/'+campId);
    document.querySelector('#rankCommTable tbody').innerHTML=data.map(x=>{
        const byLevel=(x.override_by_level||[]);
        const levelStr=byLevel.length?byLevel.map(l=>`L${l.level}:${l.percent}%`+(l.fixed?'+$'+l.fixed:'')).join(', '):'<span style="color:#64748b">Default</span>';
        return`<tr>
        <td><span style="color:${E(x.color)};font-weight:700">${E(x.name)}</span></td>
        <td>${N(x.direct_commission_percent||0)}%</td>
        <td>$${N(x.direct_commission_fixed||0)}</td>
        <td>${N(x.override_commission_percent||0)}%</td>
        <td>$${N(x.override_commission_fixed||0)}</td>
        <td style="font-size:11px">${levelStr}</td>
        <td><button class="btn btn-blue" onclick='showEditCommModal(${x.rank_number},"${E(x.name)}",${campId},${x.direct_commission_percent||0},${x.direct_commission_fixed||0},${x.override_commission_percent||0},${x.override_commission_fixed||0},${JSON.stringify(byLevel).replace(/'/g,"&#39;")})'>Edit</button></td>
    </tr>`}).join('');
}

function showEditCommModal(rankNum,rankName,campId,dp,df,op,of,byLevel){
    const levels=byLevel||[];
    // Build level rows (up to 10)
    let levelRows='';
    for(let i=1;i<=10;i++){
        const lv=levels.find(l=>l.level===i)||{};
        levelRows+=`<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
            <span style="color:#64748b;width:50px;font-size:12px">Level ${i}</span>
            <input id="rc_lp_${i}" type="number" value="${lv.percent||''}" step="0.01" min="0" placeholder="%" style="flex:1;padding:8px;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#e2e8f0;font-size:13px">
            <input id="rc_lf_${i}" type="number" value="${lv.fixed||''}" step="0.01" min="0" placeholder="$" style="flex:1;padding:8px;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#e2e8f0;font-size:13px">
        </div>`;
    }
    openModal(`<h2>Commission: ${rankName}</h2>
        <p style="color:#94a3b8;margin-bottom:15px">Set direct and override commissions for this rank.</p>
        <label>Direct Commission %</label><input id="rc_dp" type="number" value="${dp}" step="0.01" min="0">
        <label>Direct Commission Fixed $</label><input id="rc_df" type="number" value="${df}" step="0.01" min="0">
        <div style="background:#0f172a;padding:15px;border-radius:10px;margin-top:15px">
            <h3 style="color:#8b5cf6;font-size:14px;margin-bottom:5px">Default Override (all levels)</h3>
            <p style="color:#64748b;font-size:12px;margin-bottom:10px">Used when no level-specific override is set</p>
            <div style="display:flex;gap:10px">
                <div style="flex:1"><label style="font-size:12px">Override %</label><input id="rc_op" type="number" value="${op}" step="0.01" min="0"></div>
                <div style="flex:1"><label style="font-size:12px">Override $</label><input id="rc_of" type="number" value="${of}" step="0.01" min="0"></div>
            </div>
        </div>
        <div style="background:#0f172a;padding:15px;border-radius:10px;margin-top:10px">
            <h3 style="color:#8b5cf6;font-size:14px;margin-bottom:5px">Override by Level</h3>
            <p style="color:#64748b;font-size:12px;margin-bottom:10px">Set different override for each depth level. Leave empty to use default.</p>
            <div style="display:flex;gap:8px;margin-bottom:6px"><span style="width:50px"></span><span style="flex:1;color:#64748b;font-size:11px;text-align:center">%</span><span style="flex:1;color:#64748b;font-size:11px;text-align:center">Fixed $</span></div>
            ${levelRows}
        </div>
        <div class="modal-actions"><button class="btn btn-blue" onclick="saveComm(${rankNum},${campId})">Save</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function saveComm(rankNum,campId){
    // Collect override by level
    const byLevel=[];
    for(let i=1;i<=10;i++){
        const p=parseFloat(document.getElementById('rc_lp_'+i).value);
        const f=parseFloat(document.getElementById('rc_lf_'+i).value);
        if(p||f)byLevel.push({level:i,percent:p||0,fixed:f||0});
    }
    await api('/api/ranks/'+rankNum+'/commissions/'+campId,{method:'PUT',body:JSON.stringify({
        direct_commission_percent:parseFloat(document.getElementById('rc_dp').value)||0,
        direct_commission_fixed:parseFloat(document.getElementById('rc_df').value)||0,
        override_commission_percent:parseFloat(document.getElementById('rc_op').value)||0,
        override_commission_fixed:parseFloat(document.getElementById('rc_of').value)||0,
        override_by_level:byLevel
    })});
    closeModal();loadRankCommissions();
}

async function evaluateRanks(){
    document.getElementById('evalResult').textContent='Evaluating...';
    const r=await api('/api/ranks/evaluate',{method:'POST'});
    document.getElementById('evalResult').textContent=`Evaluated ${r.evaluated} agents. ${r.promoted} promoted.`;
    if(r.promoted>0)loadAffiliates();
}
async function saveOverrideMode(){
    await api('/api/ranks/settings',{method:'PUT',body:JSON.stringify({override_mode:document.getElementById('overrideModeSelect').value,max_recruitment_depth:parseInt(document.getElementById('maxDepthInput').value)||0})});
}

