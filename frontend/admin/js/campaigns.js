async function loadCampaigns(){
    const c=await api('/api/campaigns');
    document.querySelector('#campTable tbody').innerHTML=c.map(x=>`<tr>
        <td>${x.id}</td><td>${E(x.name)}</td><td><a href="${E(x.url)}" target="_blank" style="color:#3b82f6">${E(x.url.substring(0,35))}...</a></td>
        <td>${E(x.commission_type).toUpperCase()}</td><td>${x.commission_type==='cpa'?'$'+N(x.commission_amount):x.commission_type==='revshare'?N(x.commission_percent)+'%':'$'+N(x.commission_amount)+' + '+N(x.commission_percent)+'%'}</td>
        <td>${x.mlm_enabled?'<span class="badge badge-green">Yes</span>':'No'}</td>
        <td><span class="badge badge-green">${E(x.status)}</span></td>
    </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:#64748b">No campaigns</td></tr>';
}

function showAddCampaignModal(){
    openModal(`<h2>Create Campaign</h2>
        <label>Name</label><input id="cm_name" placeholder="Campaign name">
        <label>Landing Page URL</label><input id="cm_url" placeholder="https://yoursite.com/landing">
        <label>Description</label><textarea id="cm_desc" placeholder="Campaign description"></textarea>
        <label>Commission Type</label><select id="cm_type"><option value="cpa">CPA (Fixed amount)</option><option value="revshare">RevShare (Percentage)</option><option value="hybrid">Hybrid (Fixed + %)</option></select>
        <label>Fixed Amount ($)</label><input id="cm_amount" type="number" value="25" step="0.01">
        <label>Percentage (%)</label><input id="cm_percent" type="number" value="0" step="0.1">
        <label>Cookie Duration (days)</label><input id="cm_cookie" type="number" value="30">
        <label>MLM Enabled</label><select id="cm_mlm"><option value="false">No</option><option value="true">Yes</option></select>
        <div class="modal-actions"><button class="btn btn-blue" onclick="createCampaign()">Create</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function createCampaign(){
    await api('/api/campaigns',{method:'POST',body:JSON.stringify({name:document.getElementById('cm_name').value,url:document.getElementById('cm_url').value,description:document.getElementById('cm_desc').value,commission_type:document.getElementById('cm_type').value,commission_amount:parseFloat(document.getElementById('cm_amount').value),commission_percent:parseFloat(document.getElementById('cm_percent').value),cookie_days:parseInt(document.getElementById('cm_cookie').value),mlm_enabled:document.getElementById('cm_mlm').value==='true'})});
    closeModal();loadCampaigns();
}

