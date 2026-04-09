async function loadPayouts(){
    const p=await api('/api/payouts');
    document.querySelector('#payTable tbody').innerHTML=p.map(x=>`<tr>
        <td>${x.id}</td><td>${E(x.affiliate_email)||E(x.ref_id)||'-'}</td><td>$${N(x.amount)}</td><td>${E(x.payment_method)||'-'}</td>
        <td><span class="badge ${x.status==='completed'?'badge-green':x.status==='pending'?'badge-yellow':'badge-red'}">${E(x.status)}</span></td>
        <td>${new Date(x.created_at).toLocaleDateString()}</td>
        <td>${x.status==='pending'?`<button class="btn btn-green" onclick="completePayout(${x.id})">Mark Paid</button>`:''}</td>
    </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:#64748b">No payouts</td></tr>';
}
async function completePayout(id){await api('/api/payouts/'+id+'/complete',{method:'PATCH',body:JSON.stringify({transaction_id:'manual-'+Date.now()})});loadPayouts()}

function showAddPayoutModal(){
    openModal(`<h2>Create Payout</h2>
        <label>Affiliate ID</label><input id="po_aff" type="number" placeholder="1">
        <label>Amount ($)</label><input id="po_amount" type="number" placeholder="100" step="0.01">
        <label>Payment Method</label><select id="po_method"><option value="paypal">PayPal</option><option value="bank_transfer">Bank Transfer</option><option value="crypto">Crypto</option><option value="check">Check</option></select>
        <label>Notes</label><textarea id="po_notes" placeholder="Optional notes"></textarea>
        <div class="modal-actions"><button class="btn btn-blue" onclick="createPayout()">Create Payout</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function createPayout(){
    await api('/api/payouts',{method:'POST',body:JSON.stringify({affiliate_id:parseInt(document.getElementById('po_aff').value),amount:parseFloat(document.getElementById('po_amount').value),payment_method:document.getElementById('po_method').value,notes:document.getElementById('po_notes').value})});
    closeModal();loadPayouts();
}

