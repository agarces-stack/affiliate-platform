async function loadAffiliates(){
    const d=await api('/api/affiliates');const a=d.affiliates||d;
    // Load ranks for display
    let ranksMap={};try{const rnks=await api('/api/ranks');rnks.forEach(r=>ranksMap[r.rank_number]=r)}catch(e){}
    document.querySelector('#affTable tbody').innerHTML=a.map(x=>{const rk=ranksMap[x.rank||1]||{name:'Rank '+(x.rank||1),color:'#64748b'};return`<tr>
        <td>${x.id}</td><td><code style="color:#3b82f6">${E(x.ref_id)}</code></td><td>${E(x.first_name)} ${E(x.last_name)}</td><td>${E(x.email)}</td>
        <td><span style="background:${rk.color}22;color:${rk.color};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600">${E(rk.name)}</span>
        <button class="btn btn-gray" style="padding:2px 8px;font-size:11px;margin-left:4px" onclick="showAssignRankModal(${x.id},'${E(x.first_name)}',${x.rank||1})">Change</button></td>
        <td><span class="badge ${x.status==='approved'?'badge-green':x.status==='pending'?'badge-yellow':'badge-red'}">${E(x.status)}</span></td>
        <td>${x.total_clicks}</td><td>${x.total_conversions}</td><td>$${N(x.balance)}</td>
        <td>${x.status==='pending'?`<button class="btn btn-green" onclick="updateAff(${x.id},'approved')">Approve</button>`:''}${x.status==='approved'?`<button class="btn btn-red" onclick="updateAff(${x.id},'suspended')">Suspend</button>`:''}</td>
    </tr>`}).join('')||'<tr><td colspan="10" style="text-align:center;color:#64748b">No affiliates</td></tr>';
}
async function updateAff(id,status){await api('/api/affiliates/'+id+'/status',{method:'PATCH',body:JSON.stringify({status})});loadAffiliates()}

async function showAssignRankModal(affId,name,currentRank){
    let ranksHtml='';try{const rnks=await api('/api/ranks');ranksHtml=rnks.map(r=>`<option value="${r.rank_number}" ${r.rank_number===currentRank?'selected':''}>${r.rank_number}. ${E(r.name)}</option>`).join('')}catch(e){for(let i=1;i<=10;i++)ranksHtml+=`<option value="${i}" ${i===currentRank?'selected':''}>${i}</option>`}
    openModal(`<h2>Change Rank: ${name}</h2>
        <label>New Rank</label><select id="ar_rank">${ranksHtml}</select>
        <label>Reason (optional)</label><input id="ar_reason" placeholder="Promotion, performance review, etc.">
        <div class="modal-actions"><button class="btn btn-blue" onclick="assignRank(${affId})">Update Rank</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function assignRank(affId){
    await api('/api/ranks/assign/'+affId,{method:'PATCH',body:JSON.stringify({rank_number:parseInt(document.getElementById('ar_rank').value),reason:document.getElementById('ar_reason').value})});
    closeModal();loadAffiliates();
}

function showAddAffiliateModal(){
    openModal(`<h2>Add Affiliate</h2>
        <label>First Name</label><input id="af_first" placeholder="John">
        <label>Last Name</label><input id="af_last" placeholder="Doe">
        <label>Email</label><input id="af_email" type="email" placeholder="john@example.com">
        <label>Password</label><input id="af_pass" type="password" placeholder="Password">
        <label>Company</label><input id="af_company" placeholder="Company name">
        <label>Phone</label><input id="af_phone" placeholder="+1-555-0123">
        <label>Website</label><input id="af_web" placeholder="https://example.com">
        <div class="modal-actions"><button class="btn btn-blue" onclick="createAffiliate()">Create & Approve</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function createAffiliate(){
    const d=await api('/api/auth/affiliate/register',{method:'POST',body:JSON.stringify({first_name:document.getElementById('af_first').value,last_name:document.getElementById('af_last').value,email:document.getElementById('af_email').value,password:document.getElementById('af_pass').value,company_name:document.getElementById('af_company').value,phone:document.getElementById('af_phone').value,website:document.getElementById('af_web').value,company_id:user?.company_id||1})});
    if(d.affiliate_id)await api('/api/affiliates/'+d.affiliate_id+'/status',{method:'PATCH',body:JSON.stringify({status:'approved'})});
    closeModal();loadAffiliates();
}

