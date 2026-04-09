async function loadConversions(){
    try{
        const d=await api('/api/conversions/list?limit=100');
        const convs=d.conversions||[];
        document.querySelector('#convTable tbody').innerHTML=convs.map(x=>`<tr>
            <td>${x.id}</td>
            <td>${E(x.affiliate_name||x.affiliate_email||'-')}</td>
            <td>${E(x.campaign_name||'-')}</td>
            <td>${E(x.order_id||'-')}</td>
            <td>$${N(x.amount)}</td>
            <td>$${N(x.commission)}</td>
            <td><code style="font-size:11px">${E(x.tracking_method||'-')}</code></td>
            <td><span class="badge ${x.status==='approved'?'badge-green':x.status==='pending'||x.status==='flagged'?'badge-yellow':'badge-red'}">${E(x.status)}</span></td>
            <td>${new Date(x.created_at).toLocaleDateString()}</td>
            <td>${x.status==='pending'||x.status==='flagged'?`<button class="btn btn-green" style="padding:4px 8px;font-size:11px" onclick="approveConv(${x.id})">Approve</button> <button class="btn btn-red" style="padding:4px 8px;font-size:11px" onclick="rejectConv(${x.id})">Reject</button>`:''}</td>
        </tr>`).join('')||'<tr><td colspan="10" style="text-align:center;color:#64748b">No conversions yet</td></tr>';
    }catch(e){document.querySelector('#convTable tbody').innerHTML='<tr><td colspan="10" style="text-align:center;color:#ef4444">Error loading conversions</td></tr>'}
}
async function approveConv(id){await api('/api/conversions/'+id+'/approve',{method:'PATCH'});loadConversions()}
async function rejectConv(id){if(!confirm('Reject this conversion? Commission will be reverted.'))return;await api('/api/conversions/'+id+'/reject',{method:'PATCH'});loadConversions()}

