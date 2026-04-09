async function loadProducts(){
    const prods=await api('/api/products?include_goals=true');
    document.getElementById('productList').innerHTML=prods.map(p=>`
        <div style="background:#1e293b;padding:20px;border-radius:12px;margin-bottom:15px;border-left:3px solid ${p.status==='active'?'#22c55e':'#64748b'}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <div><strong style="font-size:16px">${E(p.name)}</strong> ${p.sku?`<code style="color:#3b82f6;margin-left:8px">${E(p.sku)}</code>`:''} ${p.category?`<span style="color:#64748b;margin-left:8px">${E(p.category)}</span>`:''}</div>
                <div><span style="color:#22c55e;font-weight:700;margin-right:15px">$${N(p.price)}</span><button class="btn btn-blue" style="font-size:11px" onclick="showEditProductModal(${p.id})">Edit</button> <button class="btn btn-gray" style="font-size:11px" onclick="showAddGoalModal(${p.id},'${E(p.name)}')">+ Goal</button></div>
            </div>
            <div style="color:#94a3b8;font-size:12px;margin-bottom:8px">${E(p.commission_type)} · ${p.commission_percent?p.commission_percent+'%':''}${p.commission_percent&&p.commission_amount?' + ':''}${p.commission_amount?'$'+N(p.commission_amount):''}${p.is_recurring?' · <span style="color:#8b5cf6">Recurring ('+p.renewal_period_months+'mo)</span>':''}</div>
            ${(p.goals||[]).length?`<div style="display:flex;gap:6px;flex-wrap:wrap">${p.goals.map((g,i)=>`<div style="background:#0f172a;padding:6px 12px;border-radius:6px;font-size:12px;display:flex;align-items:center;gap:6px"><span style="background:#334155;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">${g.step_order}</span><span style="color:#e2e8f0">${E(g.name)}</span><span style="color:#64748b">${g.commission_amount?'$'+N(g.commission_amount):''}${g.commission_percent?g.commission_percent+'%':''}</span>${g.is_final?'<span style="color:#22c55e;font-size:10px">FINAL</span>':''}</div>`).join('')}</div>`:'<span style="color:#64748b;font-size:12px">No goals configured</span>'}
        </div>
    `).join('')||'<p style="color:#64748b;text-align:center;padding:40px">No products yet. Click + Add Product to create your first product.</p>';
}
function showAddProductModal(){
    openModal(`<h2>Add Product</h2>
        <label>Name</label><input id="pd_name" placeholder="Seguro de Vida Premium">
        <label>SKU</label><input id="pd_sku" placeholder="VIDA-PREMIUM">
        <label>Category</label><input id="pd_cat" placeholder="vida, salud, auto, dental...">
        <label>Price</label><input id="pd_price" type="number" value="0" step="0.01">
        <label>Commission Type</label><select id="pd_type"><option value="hybrid">Hybrid (% + Fixed)</option><option value="cpa">CPA (Fixed only)</option><option value="revshare">RevShare (% only)</option></select>
        <label>Commission %</label><input id="pd_pct" type="number" value="0" step="0.01">
        <label>Commission Fixed $</label><input id="pd_fix" type="number" value="0" step="0.01">
        <label>Recurring</label><select id="pd_recur"><option value="false">No</option><option value="true">Yes</option></select>
        <label>Renewal Period (months)</label><input id="pd_renew" type="number" value="12">
        <label>Campaign ID (optional)</label><input id="pd_camp" type="number" placeholder="Link to a campaign">
        <div class="modal-actions"><button class="btn btn-blue" onclick="createProduct()">Create</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function createProduct(){
    await api('/api/products',{method:'POST',body:JSON.stringify({name:document.getElementById('pd_name').value,sku:document.getElementById('pd_sku').value||null,category:document.getElementById('pd_cat').value||null,price:parseFloat(document.getElementById('pd_price').value)||0,commission_type:document.getElementById('pd_type').value,commission_percent:parseFloat(document.getElementById('pd_pct').value)||0,commission_amount:parseFloat(document.getElementById('pd_fix').value)||0,is_recurring:document.getElementById('pd_recur').value==='true',renewal_period_months:parseInt(document.getElementById('pd_renew').value)||12,campaign_id:parseInt(document.getElementById('pd_camp').value)||null})});
    closeModal();loadProducts();
}
async function showEditProductModal(pid){
    const p=await api('/api/products/'+pid);
    openModal(`<h2>Edit: ${E(p.name)}</h2>
        <label>Name</label><input id="pde_name" value="${E(p.name)}">
        <label>SKU</label><input id="pde_sku" value="${E(p.sku||'')}">
        <label>Category</label><input id="pde_cat" value="${E(p.category||'')}">
        <label>Price</label><input id="pde_price" type="number" value="${p.price||0}" step="0.01">
        <label>Commission %</label><input id="pde_pct" type="number" value="${p.commission_percent||0}" step="0.01">
        <label>Commission $</label><input id="pde_fix" type="number" value="${p.commission_amount||0}" step="0.01">
        <label>Status</label><select id="pde_status"><option value="active" ${p.status==='active'?'selected':''}>Active</option><option value="inactive" ${p.status==='inactive'?'selected':''}>Inactive</option></select>
        <div class="modal-actions"><button class="btn btn-blue" onclick="updateProduct(${pid})">Save</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function updateProduct(pid){await api('/api/products/'+pid,{method:'PUT',body:JSON.stringify({name:document.getElementById('pde_name').value,sku:document.getElementById('pde_sku').value||null,category:document.getElementById('pde_cat').value||null,price:parseFloat(document.getElementById('pde_price').value)||0,commission_percent:parseFloat(document.getElementById('pde_pct').value)||0,commission_amount:parseFloat(document.getElementById('pde_fix').value)||0,status:document.getElementById('pde_status').value})});closeModal();loadProducts()}
function showAddGoalModal(pid,pname){
    openModal(`<h2>Add Goal: ${pname}</h2>
        <label>Slug (unique ID)</label><input id="gl_slug" placeholder="policy_bound">
        <label>Name</label><input id="gl_name" placeholder="Policy Bound">
        <label>Step Order</label><input id="gl_step" type="number" value="1" min="1">
        <label>Commission Type</label><select id="gl_type"><option value="cpa">Fixed (CPA)</option><option value="revshare">% of amount</option><option value="hybrid">Both</option></select>
        <label>Commission $</label><input id="gl_fix" type="number" value="0" step="0.01">
        <label>Commission %</label><input id="gl_pct" type="number" value="0" step="0.01">
        <label>Is Final Goal?</label><select id="gl_final"><option value="false">No</option><option value="true">Yes</option></select>
        <label>Triggers Renewal?</label><select id="gl_renewal"><option value="false">No</option><option value="true">Yes</option></select>
        <label>Requires Previous Goal?</label><select id="gl_prev"><option value="false">No</option><option value="true">Yes</option></select>
        <div class="modal-actions"><button class="btn btn-blue" onclick="createGoal(${pid})">Create</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function createGoal(pid){
    await api('/api/products/'+pid+'/goals',{method:'POST',body:JSON.stringify({slug:document.getElementById('gl_slug').value,name:document.getElementById('gl_name').value,step_order:parseInt(document.getElementById('gl_step').value)||1,commission_type:document.getElementById('gl_type').value,commission_amount:parseFloat(document.getElementById('gl_fix').value)||0,commission_percent:parseFloat(document.getElementById('gl_pct').value)||0,is_final:document.getElementById('gl_final').value==='true',triggers_renewal:document.getElementById('gl_renewal').value==='true',requires_previous_goal:document.getElementById('gl_prev').value==='true'})});
    closeModal();loadProducts();
}
