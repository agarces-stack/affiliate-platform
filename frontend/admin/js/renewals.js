async function loadRenewals(){
    const [stats,renewals,upcoming]=await Promise.all([api('/api/renewals/stats'),api('/api/renewals?limit=50'),api('/api/renewals/upcoming?days=30')]);
    document.getElementById('renewalStats').innerHTML=`
        <div class="stat-card"><div class="label">Total Renewals</div><div class="value blue">${stats.total_renewals}</div></div>
        <div class="stat-card"><div class="label">This Month</div><div class="value green">${stats.this_month_count}</div></div>
        <div class="stat-card"><div class="label">Renewal Revenue</div><div class="value green">$${N(stats.total_amount)}</div></div>
        <div class="stat-card"><div class="label">Renewal Commission</div><div class="value purple">$${N(stats.total_commission)}</div></div>
        <div class="stat-card"><div class="label">Pending</div><div class="value yellow">${stats.pending_count}</div></div>`;
    const rnws=renewals.renewals||[];
    document.querySelector('#renewalTable tbody').innerHTML=rnws.map(x=>`<tr>
        <td>${x.id}</td><td>${E(x.affiliate_name||x.affiliate_email||'-')}</td><td>${E(x.policy_number||x.order_id||'-')}</td>
        <td>$${N(x.amount)}</td><td>$${N(x.commission)}</td><td>#${x.renewal_number}</td>
        <td>${x.period_start?new Date(x.period_start).toLocaleDateString():''}${x.period_end?' - '+new Date(x.period_end).toLocaleDateString():''}</td>
        <td><span class="badge ${x.status==='approved'||x.status==='paid'?'badge-green':x.status==='pending'?'badge-yellow':'badge-red'}">${E(x.status)}</span></td>
        <td>${x.status==='pending'?`<button class="btn btn-green" style="padding:3px 8px;font-size:11px" onclick="approveRenewal(${x.id})">Approve</button> <button class="btn btn-red" style="padding:3px 8px;font-size:11px" onclick="cancelRenewal(${x.id})">Cancel</button>`:''}</td>
    </tr>`).join('')||'<tr><td colspan="9" style="text-align:center;color:#64748b">No renewals yet</td></tr>';
    const up=upcoming||[];
    document.querySelector('#upcomingTable tbody').innerHTML=up.map(x=>`<tr>
        <td>${E(x.customer_name||x.customer_email||'-')}</td><td>${E(x.first_name||x.affiliate_email||'-')}</td>
        <td>${E(x.campaign_name||'-')}</td><td>$${N(x.amount)}</td>
        <td>${new Date(x.original_date).toLocaleDateString()}</td><td>${x.renewal_count||0}</td>
        <td><button class="btn btn-blue" style="padding:3px 8px;font-size:11px" onclick="quickRenewal(${x.conversion_id},${x.amount})">Create Renewal</button></td>
    </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:#64748b">No upcoming renewals</td></tr>';
}
async function approveRenewal(id){await api('/api/renewals/'+id+'/approve',{method:'PATCH'});loadRenewals()}
async function cancelRenewal(id){if(!confirm('Cancel this renewal? Commission will be reverted.'))return;await api('/api/renewals/'+id+'/cancel',{method:'PATCH'});loadRenewals()}
function quickRenewal(convId,amount){
    openModal(`<h2>Create Renewal</h2>
        <label>Original Conversion ID</label><input id="rn_conv" type="number" value="${convId}" readonly>
        <label>Amount</label><input id="rn_amount" type="number" value="${amount}" step="0.01">
        <label>Policy Number</label><input id="rn_policy" placeholder="POL-123">
        <label>Period Start</label><input id="rn_pstart" type="date">
        <label>Period End</label><input id="rn_pend" type="date">
        <label>Notes</label><input id="rn_notes" placeholder="Annual renewal">
        <div class="modal-actions"><button class="btn btn-blue" onclick="createRenewal()">Create</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
function showAddRenewalModal(){
    openModal(`<h2>Add Renewal</h2>
        <label>Affiliate ID or Ref ID</label><input id="rn_aff" placeholder="5 or AFF123">
        <label>Campaign ID</label><input id="rn_camp" type="number" placeholder="1">
        <label>Amount</label><input id="rn_amount" type="number" step="0.01" placeholder="150.00">
        <label>Policy Number</label><input id="rn_policy" placeholder="POL-123">
        <label>Customer Email</label><input id="rn_email" placeholder="client@email.com">
        <label>Customer Name</label><input id="rn_cname" placeholder="John Doe">
        <label>Period Start</label><input id="rn_pstart" type="date">
        <label>Period End</label><input id="rn_pend" type="date">
        <label>Notes</label><input id="rn_notes" placeholder="Annual renewal">
        <div class="modal-actions"><button class="btn btn-blue" onclick="createRenewalManual()">Create</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function createRenewal(){
    await api('/api/renewals',{method:'POST',body:JSON.stringify({original_conversion_id:parseInt(document.getElementById('rn_conv').value),amount:parseFloat(document.getElementById('rn_amount').value),policy_number:document.getElementById('rn_policy').value,period_start:document.getElementById('rn_pstart').value||null,period_end:document.getElementById('rn_pend').value||null,notes:document.getElementById('rn_notes').value})});
    closeModal();loadRenewals();
}
async function createRenewalManual(){
    const affVal=document.getElementById('rn_aff').value;
    const body={amount:parseFloat(document.getElementById('rn_amount').value),campaign_id:parseInt(document.getElementById('rn_camp').value)||null,policy_number:document.getElementById('rn_policy').value,customer_email:document.getElementById('rn_email').value,customer_name:document.getElementById('rn_cname').value,period_start:document.getElementById('rn_pstart').value||null,period_end:document.getElementById('rn_pend').value||null,notes:document.getElementById('rn_notes').value};
    if(isNaN(parseInt(affVal)))body.ref_id=affVal;else body.affiliate_id=parseInt(affVal);
    await api('/api/renewals',{method:'POST',body:JSON.stringify(body)});
    closeModal();loadRenewals();
}
