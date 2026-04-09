async function loadKnowledge(){
    try{const s=await api('/api/knowledge/stats');document.getElementById('kbStats').innerHTML=`
        <div class="stat-card"><div class="label">Documents</div><div class="value blue">${s.documents}</div></div>
        <div class="stat-card"><div class="label">Ready</div><div class="value green">${s.ready_documents}</div></div>
        <div class="stat-card"><div class="label">Total Chunks</div><div class="value purple">${s.total_chunks}</div></div>
        <div class="stat-card"><div class="label">Conversations</div><div class="value yellow">${s.total_conversations}</div></div>`}catch(e){}
    try{const docs=await api('/api/knowledge/documents');document.querySelector('#kbDocTable tbody').innerHTML=docs.map(d=>`<tr>
        <td>${E(d.title)}</td><td>${E(d.category||'-')}</td><td>${d.chunk_count}</td>
        <td><span class="badge ${d.status==='ready'?'badge-green':d.status==='processing'?'badge-yellow':'badge-red'}">${E(d.status)}</span></td>
        <td>${new Date(d.created_at).toLocaleDateString()}</td>
        <td><button class="btn btn-gray" style="font-size:11px" onclick="reprocessDoc(${d.id})">Reprocess</button> <button class="btn btn-red" style="font-size:11px" onclick="deleteDoc(${d.id})">Delete</button></td>
    </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:#64748b">No documents. Add product guides, training materials, or FAQs.</td></tr>'}catch(e){}
}
function showAddDocModal(){
    openModal(`<h2>Add Document to Knowledge Base</h2>
        <label>Title</label><input id="kb_title" placeholder="Life Insurance Premium - Product Guide">
        <label>Category</label><select id="kb_cat"><option value="products">Products</option><option value="training">Training</option><option value="compliance">Compliance</option><option value="faq">FAQ</option><option value="scripts">Sales Scripts</option><option value="general">General</option></select>
        <label>Content (paste full text)</label><textarea id="kb_content" style="height:200px" placeholder="Paste the full text of the document here..."></textarea>
        <label>Visibility</label><select id="kb_vis"><option value="all">Everyone</option><option value="agents_only">Agents Only</option><option value="admin_only">Admin Only</option></select>
        <label>Description (optional)</label><input id="kb_desc" placeholder="Brief description">
        <div class="modal-actions"><button class="btn btn-blue" onclick="createDoc()">Upload & Process</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function createDoc(){
    const r=await api('/api/knowledge/documents',{method:'POST',body:JSON.stringify({title:document.getElementById('kb_title').value,content:document.getElementById('kb_content').value,category:document.getElementById('kb_cat').value,visibility:document.getElementById('kb_vis').value,description:document.getElementById('kb_desc').value})});
    if(r.error){toast(r.error,'error');return}
    closeModal();toast('Document uploaded! Processing embeddings...','info');loadKnowledge();
}
async function reprocessDoc(id){await api('/api/knowledge/documents/'+id+'/reprocess',{method:'POST'});loadKnowledge()}
async function deleteDoc(id){if(!confirm('Delete this document and all its embeddings?'))return;await api('/api/knowledge/documents/'+id,{method:'DELETE'});loadKnowledge()}
async function testKBSearch(){
    const q=document.getElementById('kbSearchInput').value.trim();if(!q)return;
    document.getElementById('kbSearchResults').innerHTML='<p style="color:#94a3b8">Searching...</p>';
    try{
        const results=await api('/api/knowledge/search?q='+encodeURIComponent(q));
        document.getElementById('kbSearchResults').innerHTML=results.map(r=>`
            <div style="background:#0f172a;padding:12px;border-radius:8px;margin-bottom:8px;border-left:3px solid #8b5cf6">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px"><strong style="font-size:13px">${E(r.doc_title)}</strong><span style="color:#22c55e;font-size:12px">${(r.similarity*100).toFixed(0)}% match</span></div>
                <p style="color:#94a3b8;font-size:12px;line-height:1.5">${E(r.content.substring(0,300))}${r.content.length>300?'...':''}</p>
            </div>
        `).join('')||'<p style="color:#64748b">No results found</p>';
    }catch(e){document.getElementById('kbSearchResults').innerHTML=`<p style="color:#ef4444">${E(e.message||'Search failed')}</p>`}
}
