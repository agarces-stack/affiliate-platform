async function loadSettings(){
    // Payout settings
    try{const s=await api('/api/wallet/settings');document.getElementById('set_schedule').value=s.payout_schedule||'on_request';document.getElementById('set_minpayout').value=s.min_payout_amount||50;document.getElementById('set_hold').value=s.payout_hold_days||0;document.getElementById('set_autoapprove').value=String(s.auto_approve_payouts||false)}catch(e){}
    // Providers
    try{const provs=await api('/api/payments/providers');document.querySelector('#providerTable tbody').innerHTML=provs.map(x=>`<tr><td>${E(x.provider)}</td><td>${E(x.name)}</td><td>${E(x.mode||'—')}</td><td>${x.is_default?'<span class="badge badge-green">Default</span>':''}</td><td>${N(x.fee_percent)}% + $${N(x.fee_fixed)}</td><td>$${N(x.total_sent)} (${x.total_transactions})</td><td><button class="btn btn-gray" style="font-size:11px" onclick="toggleProvider(${x.id},${!x.is_active})">${x.is_active?'Disable':'Enable'}</button></td></tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:#64748b">No providers configured</td></tr>'}catch(e){}
    // Webhooks
    try{const wh=await api('/api/webhooks');document.querySelector('#webhookTable tbody').innerHTML=wh.map(x=>`<tr><td>${E(x.name)}</td><td style="font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis">${E(x.url)}</td><td style="font-size:11px">${(x.events||[]).join(', ')}</td><td><span class="badge ${x.is_active?'badge-green':'badge-red'}">${x.is_active?'Active':'Inactive'}</span></td><td style="font-size:11px">${x.last_triggered_at?new Date(x.last_triggered_at).toLocaleString():'Never'}</td><td><button class="btn btn-red" style="font-size:11px" onclick="deleteWebhook(${x.id})">Delete</button></td></tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:#64748b">No webhooks</td></tr>'}catch(e){}
}
async function savePayoutSettings(){await api('/api/wallet/settings',{method:'PUT',body:JSON.stringify({payout_schedule:document.getElementById('set_schedule').value,min_payout_amount:parseFloat(document.getElementById('set_minpayout').value)||50,payout_hold_days:parseInt(document.getElementById('set_hold').value)||0,auto_approve_payouts:document.getElementById('set_autoapprove').value==='true'})});toast('Settings saved!','success')}
function showAddProviderModal(){
    openModal(`<h2>Add Payment Provider</h2>
        <label>Provider</label><select id="pv_type"><option value="paypal">PayPal</option><option value="wire">Wire/ACH</option><option value="zelle">Zelle</option><option value="manual">Manual</option></select>
        <label>Name</label><input id="pv_name" placeholder="PayPal Business">
        <label>Client ID (PayPal)</label><input id="pv_cid" placeholder="Leave empty for non-PayPal">
        <label>Client Secret (PayPal)</label><input id="pv_csec" type="password" placeholder="Leave empty for non-PayPal">
        <label>Mode</label><select id="pv_mode"><option value="sandbox">Sandbox (testing)</option><option value="live">Live (production)</option></select>
        <label>Fee %</label><input id="pv_feepct" type="number" value="0" step="0.01">
        <label>Fee Fixed $</label><input id="pv_feefix" type="number" value="0" step="0.01">
        <label>Set as Default?</label><select id="pv_default"><option value="false">No</option><option value="true">Yes</option></select>
        <div class="modal-actions"><button class="btn btn-blue" onclick="createProvider()">Add</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function createProvider(){await api('/api/payments/providers',{method:'POST',body:JSON.stringify({provider:document.getElementById('pv_type').value,name:document.getElementById('pv_name').value,config:{client_id:document.getElementById('pv_cid').value||undefined,client_secret:document.getElementById('pv_csec').value||undefined,mode:document.getElementById('pv_mode').value},fee_percent:parseFloat(document.getElementById('pv_feepct').value)||0,fee_fixed:parseFloat(document.getElementById('pv_feefix').value)||0,is_default:document.getElementById('pv_default').value==='true'})});closeModal();loadSettings()}
async function toggleProvider(id,active){await api('/api/payments/providers/'+id,{method:'PUT',body:JSON.stringify({is_active:active})});loadSettings()}
function showAddWebhookModal(){
    openModal(`<h2>Add Webhook</h2>
        <label>Name</label><input id="wh_name" placeholder="n8n - Conversions">
        <label>URL</label><input id="wh_url" placeholder="https://your-n8n.com/webhook/abc">
        <label>Secret (optional, for HMAC signing)</label><input id="wh_secret" placeholder="Leave empty for unsigned">
        <label>Events (comma separated)</label><input id="wh_events" placeholder="new_conversion, new_affiliate, rank_promotion">
        <p style="color:#64748b;font-size:11px;margin-top:4px">Valid: new_conversion, new_affiliate, affiliate_approved, payout_completed, rank_promotion, fraud_alert</p>
        <div class="modal-actions"><button class="btn btn-blue" onclick="createWebhook()">Add</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function createWebhook(){await api('/api/webhooks',{method:'POST',body:JSON.stringify({name:document.getElementById('wh_name').value,url:document.getElementById('wh_url').value,secret:document.getElementById('wh_secret').value||null,events:document.getElementById('wh_events').value.split(',').map(e=>e.trim()).filter(e=>e)})});closeModal();loadSettings()}
async function deleteWebhook(id){if(!confirm('Delete this webhook?'))return;await api('/api/webhooks/'+id,{method:'DELETE'});loadSettings()}
function showAddApiKeyModal(){toast('Run on server: npm run generate-api-key <company_id> "name"','info',5000)}

