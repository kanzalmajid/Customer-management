let customers   = JSON.parse(localStorage.getItem('crm_customers') || '[]');
  let editingId   = null;
  let currentModalId = null;
 
  const sourceInfo = {
    facebook:  { icon: '📘', label: 'فيسبوك',          cls: 'facebook' },
    instagram: { icon: '📸', label: 'إنستقرام',        cls: 'instagram' },
    tiktok:    { icon: '🎵', label: 'تيك توك',         cls: 'tiktok' },
    promoter:  { icon: '🤝', label: 'مروّج من الشركة', cls: 'promoter' },
  };
 
  function save() { localStorage.setItem('crm_customers', JSON.stringify(customers)); updateStats(); }
 
  function updateStats() {
    document.getElementById('total-count').textContent  = customers.length;
    document.getElementById('branch-count').textContent = customers.reduce((s,c) => s + (c.branches?.length||0), 0);
  }
 
  function switchTab(tab) {
    document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', (i===0)===(tab==='add')));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-'+tab).classList.add('active');
    if (tab==='list') renderCustomers();
  }
 
  function addBranch() {
    const list = document.getElementById('branch-list');
    const row  = document.createElement('div');
    row.className = 'branch-row';
    row.innerHTML = `<input type="text" placeholder="موقع الفرع (مثال: جدة - حي الروضة)">
                     <button class="btn-icon" onclick="removeBranch(this)">✕</button>`;
    list.appendChild(row);
    row.querySelector('input').focus();
  }
 
  function removeBranch(btn) {
    const list = document.getElementById('branch-list');
    if (list.children.length === 1) { showToast('⚠️ يجب أن يكون هناك فرع واحد على الأقل'); return; }
    btn.closest('.branch-row').remove();
  }
 
  function getBranches() {
    return [...document.querySelectorAll('#branch-list .branch-row input')].map(i=>i.value.trim()).filter(Boolean);
  }
 
  function setBranches(branches) {
    const list = document.getElementById('branch-list');
    list.innerHTML = '';
    (branches.length ? branches : ['']).forEach(b => {
      const row = document.createElement('div');
      row.className = 'branch-row';
      row.innerHTML = `<input type="text" placeholder="موقع الفرع" value="${escHtml(b)}">
                       <button class="btn-icon" onclick="removeBranch(this)">✕</button>`;
      list.appendChild(row);
    });
  }
 
  function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
 
  /* ═══════════════════════════════════════════════════════
     Google Drive upload — uses the existing buildPage() HTML
  ═══════════════════════════════════════════════════════ */
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxNJC4vkPkEQOcmbQfVihhURdqbu_zMvIl1LrXaaSrSe66A3AGPGW4NVNnSqPQexiI/exec';
 
  async function capturePageToPdfBase64(customer) {
    const { jsPDF } = window.jspdf;

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;font-family:Tajawal,sans-serif;direction:rtl;z-index:-1;pointer-events:none';
    container.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
        .pdf-render-wrap { font-family:'Tajawal',sans-serif; direction:rtl; background:#fff; }
        .pdf-render-wrap .pdf-page        { padding:44px 48px;background:#fff;font-family:'Tajawal',sans-serif;direction:rtl; }
        .pdf-render-wrap .pdf-topbar      { display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;margin-bottom:28px;border-bottom:3px solid #C9A84C; }
        .pdf-render-wrap .pdf-co-name     { font-size:24px;font-weight:900;color:#111; }
        .pdf-render-wrap .pdf-co-sub      { font-size:12px;color:#999;margin-top:3px; }
        .pdf-render-wrap .pdf-tag         { background:#C9A84C;color:#fff;padding:7px 18px;border-radius:6px;font-size:13px;font-weight:800; }
        .pdf-render-wrap .pdf-hero        { display:flex;align-items:center;gap:22px;margin-bottom:30px; }
        .pdf-render-wrap .pdf-av          { width:70px;height:70px;border-radius:14px;background:#fdf5e0;border:2px solid #C9A84C;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:#C9A84C;flex-shrink:0; }
        .pdf-render-wrap .pdf-cname       { font-size:26px;font-weight:900;color:#111; }
        .pdf-render-wrap .pdf-cproj       { font-size:15px;color:#C9A84C;font-weight:700;margin-top:4px; }
        .pdf-render-wrap .pdf-grid        { display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px; }
        .pdf-render-wrap .pdf-cell        { background:#fafaf8;border:1px solid #e8e0cc;border-radius:10px;padding:14px 18px; }
        .pdf-render-wrap .pdf-cell.span2  { grid-column:1/-1; }
        .pdf-render-wrap .pdf-cell-lbl    { font-size:10px;font-weight:800;color:#aaa;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:7px; }
        .pdf-render-wrap .pdf-cell-val    { font-size:15px;font-weight:700;color:#111; }
        .pdf-render-wrap .pdf-branch-list { display:flex;flex-direction:column;gap:8px;margin-top:6px; }
        .pdf-render-wrap .pdf-branch-row  { display:flex;align-items:center;gap:10px;font-size:14px;color:#333; }
        .pdf-render-wrap .pdf-bnum        { background:#C9A84C;color:#fff;width:22px;height:22px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0; }
        .pdf-render-wrap .pdf-pill        { display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:20px;font-size:13px;font-weight:700; }
        .pdf-render-wrap .pdf-pill.facebook  { background:#e8f0fd;color:#1877F2;border:1px solid #bad2fb; }
        .pdf-render-wrap .pdf-pill.instagram { background:#fde8ef;color:#E1306C;border:1px solid #fbb7ce; }
        .pdf-render-wrap .pdf-pill.tiktok    { background:#f0f0f0;color:#333;border:1px solid #ccc; }
        .pdf-render-wrap .pdf-pill.promoter  { background:#fdf4e0;color:#8a6000;border:1px solid #e8c97a; }
        .pdf-render-wrap .pdf-notes { background:#fdf9f0;border:1px solid #e8d9a8;border-radius:8px;padding:12px 16px;font-size:13px;color:#555;line-height:1.8;margin-top:6px; }
        .pdf-render-wrap .pdf-foot  { margin-top:36px;padding-top:14px;border-top:1px solid #e0d5b0;display:flex;justify-content:space-between;font-size:11px;color:#bbb; }
      </style>
      <div class="pdf-render-wrap">${buildPage(customer)}</div>`;

    document.body.appendChild(container);
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 300));

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    await doc.html(container.querySelector('.pdf-render-wrap'), {
      callback: function(doc) {},
      x: 0,
      y: 0,
      width: 210,
      windowWidth: 794,
      autoPaging: 'text'
    });

    document.body.removeChild(container);
    return doc.output('datauristring').split(',')[1];
  }
 
  async function uploadToDrive(pdfBase64, fileName) {
    console.log("This is the secret" + GOOGLE_SCRIPT_URL);
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === '%%GOOGLE_SCRIPT_URL%%') {
      console.warn('GOOGLE_SCRIPT_URL not set — skipping Drive upload.');
      return false;
    }
    try {
      // Google Apps Script doesn't send CORS headers, so we use no-cors mode.
      // The request still goes through and the script saves the file —
      // we just can't read the response back (opaque response), which is fine.
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, pdfBase64 })
      });
      // With no-cors we always get an opaque response — treat reaching here as success
      return true;
    } catch (err) {
      console.error('Drive upload error:', err);
      return false;
    }
  }
 
  async function saveCustomer() {
    const name    = document.getElementById('cust-name').value.trim();
    const project = document.getElementById('cust-project').value.trim();
    const phone   = document.getElementById('cust-phone').value.trim();
    const branches= getBranches();
    const src     = document.querySelector('input[name="source"]:checked')?.value || '';
    const notes   = document.getElementById('cust-notes').value.trim();
 
    if (!name)    { showToast('⚠️ الرجاء إدخال اسم العميل');    return; }
    if (!project) { showToast('⚠️ الرجاء إدخال اسم المشروع');   return; }
    if (!src)     { showToast('⚠️ الرجاء اختيار مصدر المعرفة'); return; }
 
    const customer = {
      id: editingId || Date.now().toString(),
      name, project, phone, branches, source: src, notes,
      date: editingId
        ? (customers.find(c=>c.id===editingId)?.date || new Date().toLocaleDateString('ar-SA'))
        : new Date().toLocaleDateString('ar-SA')
    };
 
    if (editingId) { customers[customers.findIndex(c=>c.id===editingId)] = customer; editingId = null; }
    else           { customers.unshift(customer); }
 
    save(); clearForm(); switchTab('list');
    showToast('⏳ جاري إنشاء ملف PDF ورفعه إلى Drive...');
 
    try {
      const pdfBase64 = await capturePageToPdfBase64(customer);
      const fileName = `استمارة_${customer.name}.pdf`;
      const uploaded  = await uploadToDrive(pdfBase64, fileName);
      showToast(uploaded ? '✅ تم الحفظ ورفع PDF إلى Google Drive بنجاح' : '✅ تم حفظ العميل (PDF لم يُرفع — تحقق من إعدادات Drive)');
    } catch (err) {
      console.error('PDF error:', err);
      showToast('✅ تم حفظ بيانات العميل بنجاح');
    }
  }
 
  function clearForm() {
    ['cust-name','cust-project','cust-phone','cust-notes'].forEach(id => document.getElementById(id).value='');
    document.querySelectorAll('input[name="source"]').forEach(r=>r.checked=false);
    setBranches(['']); editingId = null;
  }
 
  function renderCustomers() {
    const q  = document.getElementById('search-input').value.toLowerCase();
    const sf = document.getElementById('source-filter').value;
    const grid = document.getElementById('customers-grid');
 
    const filtered = customers.filter(c => {
      const matchQ = !q || c.name.toLowerCase().includes(q) || c.project.toLowerCase().includes(q)
        || (c.phone||'').includes(q) || (c.branches||[]).some(b=>b.toLowerCase().includes(q));
      return matchQ && (!sf || c.source===sf);
    });
 
    document.getElementById('list-count').textContent =
      filtered.length ? `عرض ${filtered.length} من ${customers.length} عميل` : '';
 
    if (!filtered.length) {
      grid.innerHTML = customers.length===0
        ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📋</div><div class="empty-title">لا يوجد عملاء بعد</div><div class="empty-sub">ابدأ بإضافة عميلك الأول</div></div>`
        : `<div class="no-results">🔍 لا توجد نتائج مطابقة للبحث</div>`;
      return;
    }
 
    grid.innerHTML = filtered.map(c => {
      const si = sourceInfo[c.source]||{icon:'❓',label:'غير محدد',cls:''};
      const bc = (c.branches||[]).length;
      const bp = (c.branches||[]).slice(0,3).map(b=>`<div class="branch-item">${b}</div>`).join('');
      const bm = bc>3 ? `<div class="branch-item" style="color:var(--text-dim)">+${bc-3} فروع أخرى</div>` : '';
 
      return `<div class="customer-card" onclick="showDetail('${c.id}')">
        <div class="cust-header">
          <div class="cust-avatar">${c.name[0]}</div>
          <div class="cust-actions">
            <button class="btn-icon" onclick="printSingle(event,'${c.id}')" title="طباعة PDF" style="color:var(--success)">🖨️</button>
            <button class="btn-icon" onclick="editCustomer(event,'${c.id}')" title="تعديل">✏️</button>
            <button class="btn-icon" onclick="deleteCustomer(event,'${c.id}')" title="حذف">✕</button>
          </div>
        </div>
        <div class="cust-name">${c.name}</div>
        <div class="cust-project">📁 ${c.project}</div>
        ${c.phone?`<div class="cust-phone">📞 ${c.phone}</div>`:''}
        <div class="cust-meta">
          <div class="meta-tag branches">🌿 ${bc} فرع</div>
          <div class="meta-tag">📅 ${c.date}</div>
        </div>
        <span class="source-badge ${si.cls}">${si.icon} ${si.label}</span>
        ${bc?`<div class="branches-preview">${bp}${bm}</div>`:''}
      </div>`;
    }).join('');
  }
 
  function showDetail(id) {
    const c = customers.find(x=>x.id===id); if (!c) return;
    currentModalId = id;
    const si = sourceInfo[c.source]||{icon:'❓',label:'غير محدد',cls:''};
    const branches = (c.branches||[]).map((b,i)=>`<div class="branch-item">الفرع ${i+1}: ${b}</div>`).join('');
    document.getElementById('modal-title').textContent = c.name;
    document.getElementById('modal-body').innerHTML = `
      <div class="detail-row"><div class="detail-icon">👤</div><div class="detail-content"><div class="detail-label">اسم العميل</div><div class="detail-value">${c.name}</div></div></div>
      <div class="detail-row"><div class="detail-icon">📁</div><div class="detail-content"><div class="detail-label">اسم المشروع</div><div class="detail-value">${c.project}</div></div></div>
      ${c.phone?`<div class="detail-row"><div class="detail-icon">📞</div><div class="detail-content"><div class="detail-label">رقم الهاتف</div><div class="detail-value" style="direction:ltr;text-align:right">${c.phone}</div></div></div>`:''}
      <div class="detail-row"><div class="detail-icon">📍</div><div class="detail-content">
        <div class="detail-label">الفروع ومواقعها (${(c.branches||[]).length} فرع)</div>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">${branches||'<span style="color:var(--text-dim);font-size:14px">لا توجد فروع</span>'}</div>
      </div></div>
      <div class="detail-row"><div class="detail-icon">${si.icon}</div><div class="detail-content"><div class="detail-label">مصدر المعرفة</div><div class="detail-value"><span class="source-badge ${si.cls}">${si.icon} ${si.label}</span></div></div></div>
      ${c.notes?`<div class="detail-row"><div class="detail-icon">📝</div><div class="detail-content"><div class="detail-label">ملاحظات</div><div class="detail-value" style="font-size:14px;line-height:1.7;color:var(--text-muted)">${c.notes}</div></div></div>`:''}
      <div class="detail-row"><div class="detail-icon">📅</div><div class="detail-content"><div class="detail-label">تاريخ الإضافة</div><div class="detail-value">${c.date}</div></div></div>
    `;
    document.getElementById('modal-overlay').classList.add('open');
  }
 
  function closeModal(e) { if (e.target===document.getElementById('modal-overlay')) hideModal(); }
  function hideModal()   { document.getElementById('modal-overlay').classList.remove('open'); currentModalId=null; }
 
  function editCustomer(e, id) {
    e.stopPropagation();
    const c = customers.find(x=>x.id===id); if (!c) return;
    editingId = id; switchTab('add');
    setTimeout(() => {
      document.getElementById('cust-name').value    = c.name;
      document.getElementById('cust-project').value = c.project;
      document.getElementById('cust-phone').value   = c.phone||'';
      document.getElementById('cust-notes').value   = c.notes||'';
      const m = {facebook:'fb',instagram:'ig',tiktok:'tt',promoter:'pr'};
      const r = document.getElementById('src-'+m[c.source]);
      if (r) r.checked = true;
      setBranches(c.branches?.length ? c.branches : ['']);
    }, 50);
  }
 
  function deleteCustomer(e, id) {
    e.stopPropagation();
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    customers = customers.filter(c=>c.id!==id);
    save(); renderCustomers(); showToast('🗑 تم حذف العميل');
  }
 
  /* ═══════════════════════════════════
     PDF — build one page per customer
  ═══════════════════════════════════ */
  function buildPage(c) {
    const si = sourceInfo[c.source]||{icon:'❓',label:'غير محدد',cls:''};
    const bRows = (c.branches||[]).map((b,i)=>`
      <div class="pdf-branch-row">
        <div class="pdf-bnum">${i+1}</div>
        <span>${b}</span>
      </div>`).join('');
 
    return `<div class="pdf-page">
 
      <div class="pdf-topbar">
        <div>
          <div class="pdf-co-name">🏢 شركة كنز الماجد - نظام إدارة العملاء</div>
          <div class="pdf-co-sub">ملف العميل — تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</div>
        </div>
        <div class="pdf-tag">بيانات عميل</div>
      </div>
 
      <div class="pdf-hero">
        <div class="pdf-av">${c.name[0]}</div>
        <div>
          <div class="pdf-cname">${c.name}</div>
          <div class="pdf-cproj">📁 ${c.project}</div>
        </div>
      </div>
 
      <div class="pdf-grid">
        ${c.phone?`
        <div class="pdf-cell">
          <div class="pdf-cell-lbl">📞 رقم الهاتف</div>
          <div class="pdf-cell-val" style="direction:ltr;text-align:right">${c.phone}</div>
        </div>`:''}
 
        <div class="pdf-cell">
          <div class="pdf-cell-lbl">📅 تاريخ الإضافة</div>
          <div class="pdf-cell-val">${c.date}</div>
        </div>
 
        <div class="pdf-cell ${c.phone?'':'span2'}">
          <div class="pdf-cell-lbl">📢 مصدر المعرفة</div>
          <div class="pdf-cell-val"><span class="pdf-pill ${si.cls}">${si.icon} ${si.label}</span></div>
        </div>
 
        <div class="pdf-cell span2">
          <div class="pdf-cell-lbl">📍 الفروع ومواقعها — ${(c.branches||[]).length} فرع</div>
          <div class="pdf-branch-list">
            ${bRows||'<span style="color:#aaa;font-size:13px">لا توجد فروع مسجلة</span>'}
          </div>
        </div>
 
        ${c.notes?`
        <div class="pdf-cell span2">
          <div class="pdf-cell-lbl">📝 ملاحظات</div>
          <div class="pdf-notes">${c.notes}</div>
        </div>`:''}
      </div>
 
      <div class="pdf-foot">
        <span>نظام إدارة العملاء</span>
        <span>رقم العميل: #${c.id.slice(-6)}</span>
      </div>
    </div>`;
  }
 
  function doPrint(html) {
    document.getElementById('print-target').innerHTML = html;
    setTimeout(() => window.print(), 350);
  }
 
  function printSingle(e, id) {
    e.stopPropagation();
    const c = customers.find(x=>x.id===id);
    if (c) doPrint(buildPage(c));
  }
 
  function printSingleFromModal() {
    const c = customers.find(x=>x.id===currentModalId);
    if (c) doPrint(buildPage(c));
  }
 
  function printAllCustomers() {
    if (!customers.length) { showToast('⚠️ لا يوجد عملاء للطباعة'); return; }
    doPrint(customers.map(buildPage).join(''));
  }
 
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), 3000);
  }
 
  updateStats();
