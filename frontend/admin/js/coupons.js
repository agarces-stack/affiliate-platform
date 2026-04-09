async function loadCoupons(){
    const c=await api('/api/coupons');
    document.querySelector('#coupTable tbody').innerHTML=c.map(x=>`<tr>
        <td><code style="color:#22c55e">${E(x.code)}</code></td><td>${E(x.affiliate_email)||'-'}</td><td>${E(x.campaign_name)||'-'}</td>
        <td>${x.discount_type==='percent'?x.discount_value+'%':'$'+N(x.discount_value)}</td><td>${x.usage_count}${x.max_usage?'/'+x.max_usage:''}</td>
        <td><span class="badge ${x.is_active?'badge-green':'badge-red'}">${x.is_active?'Active':'Inactive'}</span></td>
        <td>${x.is_active?`<button class="btn btn-red" onclick="deactivateCoupon(${x.id})">Deactivate</button>`:''}</td>
    </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:#64748b">No coupons</td></tr>';
}
async function deactivateCoupon(id){await api('/api/coupons/'+id,{method:'DELETE'});loadCoupons()}

function showAddCouponModal(){
    openModal(`<h2>Create Coupon</h2>
        <label>Coupon Code</label><input id="cp_code" placeholder="SAVE20" style="text-transform:uppercase">
        <label>Affiliate ID</label><input id="cp_aff" type="number" placeholder="1">
        <label>Campaign ID</label><input id="cp_camp" type="number" placeholder="1">
        <label>Discount Type</label><select id="cp_type"><option value="percent">Percentage</option><option value="fixed">Fixed Amount</option></select>
        <label>Discount Value</label><input id="cp_val" type="number" value="10" step="0.01">
        <label>Max Usage (0 = unlimited)</label><input id="cp_max" type="number" value="0">
        <div class="modal-actions"><button class="btn btn-blue" onclick="createCoupon()">Create</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function createCoupon(){
    await api('/api/coupons',{method:'POST',body:JSON.stringify({code:document.getElementById('cp_code').value,affiliate_id:parseInt(document.getElementById('cp_aff').value),campaign_id:parseInt(document.getElementById('cp_camp').value),discount_type:document.getElementById('cp_type').value,discount_value:parseFloat(document.getElementById('cp_val').value),max_usage:parseInt(document.getElementById('cp_max').value)||null})});
    closeModal();loadCoupons();
}

