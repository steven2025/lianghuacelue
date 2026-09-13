/* Agent UI has its own project, request lifecycle and version history. */
(function(){
 'use strict';
 const C=AgentCore,KEY='strategyAgent.v1',MODE='strategyStudio.mode';
 const $=id=>document.getElementById(id);
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let project=C.fresh(),mode='agent',busy=false,controller=null,epoch=0,error='',saved='',tab='plan',selected=null,connectionOpen=false;
 let endpoint=api.backend,access='',composer='',logDraft='',lastAction='agent_assess',scrollToEnd=true;
 try{const raw=localStorage.getItem(KEY);if(raw)project=C.restore(JSON.parse(raw));mode=localStorage.getItem(MODE)||'agent';}catch{error='上次代理项目未能恢复，可导入保存的项目文件。';}
 composer=project.draft;
 const standard=document.querySelector('main');standard.id='standard-workspace';
 const root=document.createElement('div');root.id='agent-workspace';standard.after(root);
 const switcher=document.createElement('div');switcher.className='mode-switch';switcher.setAttribute('aria-label','工作模式');
 switcher.innerHTML='<button id="mode-standard" type="button">标准模式</button><button id="mode-agent" type="button">代理模式 <span>Agent</span></button>';
 document.querySelector('.topbar').insertBefore(switcher,document.querySelector('.topbar').lastElementChild);
 document.querySelector('.badge').textContent='1.3 双模式';
 function persist(){project.draft=composer;project.savedAt=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(project));saved='已保存到此浏览器';}catch{saved='浏览器存储已满，请下载项目保存';}const el=$('agent-saved');if(el)el.textContent=saved;}
 function downloadFile(name,text){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 function currentVersion(){return project.versions.find(v=>v.id===selected)||project.versions.at(-1);}
 function save(){persist();downloadFile((project.assessment?.name||'代理策略')+'.agent.json',JSON.stringify(project,null,2));}
 function exportCode(){const v=currentVersion();if(!v?.result.checks.passed){error='请先完成代码生成与检查。';renderAgent();return;}downloadFile('main.py',v.result.code);}
 function cancel(){epoch++;controller?.abort();controller=null;busy=false;error='已取消当前请求。已保存的回答仍然保留。';renderAgent();}
 function setMode(next){mode=next==='standard'?'standard':'agent';try{localStorage.setItem(MODE,mode);}catch{}standard.hidden=mode!=='standard';root.hidden=mode!=='agent';document.body.classList.toggle('agent-mode',mode==='agent');bindModeShell();if(mode==='agent')renderAgent();}
 function bindModeShell(){
  $('mode-standard').onclick=()=>setMode('standard');$('mode-agent').onclick=()=>setMode('agent');
  $('mode-standard').setAttribute('aria-pressed',String(mode==='standard'));$('mode-agent').setAttribute('aria-pressed',String(mode==='agent'));
  $('save').onclick=mode==='agent'?save:saveProject;$('export').onclick=mode==='agent'?exportCode:windowStandardExport;
  $('export').textContent=mode==='agent'?'下载回测代码':'导出回测代码';
 }
 const windowStandardExport=exportCodeStandard;
 function exportCodeStandard(){window.StandardActions.exportCode();}
 window.bindModeShell=bindModeShell;
 const btn=(id,text,primary=false,disabled=false)=>`<button type="button" id="${id}" class="ag-button ${primary?'ag-primary':''}" ${disabled?'disabled':''}>${text}</button>`;
 function renderAgent(){
  if(mode!=='agent')return;C.enableDialogue(project);
  const oldScroll=$('agent-chat')?.scrollTop||0;
  const a=project.assessment,v=currentVersion(),ready=a?.ready&&project.receipt,latest=project.versions.at(-1),fresh=latest?.revision===project.revision;
  const stage=!project.source?0:!ready?1:!fresh?2:3;
  const spec=C.types[project.strategyType],labels=spec.labels;
  const count=a?.board.filter(x=>x.status!=='missing').length||0;
  root.innerHTML=`<div class="ag-layout">
   <aside class="ag-rail"><div class="ag-rail-title"><span class="ag-spark">✦</span><div><b>策略代理</b><small>股票 · 历史回测</small></div></div><p class="ag-rail-caption">一起把策略想法说明白</p><ol class="ag-steps">${['导入策略','逐条补充','确认方案','代码与解释'].map((x,i)=>`<li class="${i===stage?'current':i<stage?'done':''}"><span>${i<stage?'✓':i+1}</span><div>${x}<small>${['粘贴文本或上传文档','每次只回答一个问题','核对当前策略内容','下载后在掘金回测'][i]}</small></div></li>`).join('')}</ol><div class="ag-rail-actions">${btn('agent-new','＋ 新建代理策略')}${btn('agent-load','导入已保存项目')}<input hidden id="agent-project-file" type="file" accept=".json"></div><div class="ag-history"><h3>代码版本 <span>${project.versions.length}</span></h3>${project.versions.length?project.versions.map((x,i)=>`<button data-version="${escape(x.id)}" class="${v?.id===x.id?'selected':''}"><b>版本 ${i+1}</b><small>${x.kind==='repair'?'日志修复':'首次／重新生成'} · ${new Date(x.createdAt).toLocaleDateString('zh-CN')}</small></button>`).reverse().join(''):'<p>生成后自动保留最近6个版本</p>'}</div><div class="ag-rail-foot">${btn('agent-settings','连接与模板')}<small id="agent-saved">${escape(saved||'代理项目独立保存')}</small></div></aside>
   <section class="ag-conversation"><header class="ag-heading"><div><span class="ag-eyebrow">DEEPSEEK · 策略编写助手</span><h1>${escape(a?.name||'用文字描述你的股票策略')}</h1><p>${project.source?'回答会自动记录，也可以随时提出修改。':'无需填写规则表。先选择策略类型，再描述你的规则。'}</p></div><span class="ag-status"><i></i>${busy?'处理中':'代理模式'}</span></header>
   <fieldset class="ag-types"><legend>策略类型 · 先选择用途，再导入文本</legend>${Object.entries(C.types).map(([id,t])=>`<label class="${project.strategyType===id?'selected':''}"><input type="radio" name="strategy-type" value="${id}" ${project.strategyType===id?'checked':''} ${busy?'disabled':''}><span><b>${t.title}</b><small>${t.description}</small></span></label>`).join('')}</fieldset>
   <details class="ag-confirmed"><summary>已确认规则（随项目保存） · ${project.confirmedNotes?'已记录':'可补充'}</summary><p>这里的规则会原样写入最终方案。修改后重新评估；普通问答仍自动保存在对话记录中。</p><textarea id="agent-confirmed-notes" class="ag-input" rows="5" maxlength="12000" ${busy?'disabled':''}>${escape(project.confirmedNotes)}</textarea>${btn('agent-notes-save','保存规则并继续评估',false,busy)}</details>
   ${project.dialogue?.rules.length?`<details class="ag-confirmed ag-rule-list"><summary>逐条规则记录 · 已明确 ${project.dialogue.rules.filter(r=>r.status==='confirmed').length}/${project.dialogue.rules.length}</summary>${project.dialogue.rules.map(r=>`<article><b>${escape({confirmed:'已明确',proposed:'待接受建议',missing:'待补充',deferred:'暂后处理'}[r.status])}</b><p>${escape(r.text)}</p>${r.status==='proposed'?`<button class="ag-button" data-rule-accept="${escape(r.id)}" ${busy?'disabled':''}>接受此建议</button>`:''}${r.status==='deferred'?`<button class="ag-button" data-rule-resume="${escape(r.id)}" ${busy?'disabled':''}>现在处理</button>`:''}<button class="ag-button" data-rule-edit="${escape(r.id)}" ${busy?'disabled':''}>纠正这条记录</button></article>`).join('')}</details>`:''}
   ${connectionOpen?`<section class="ag-settings"><h3>服务连接</h3><label>后端地址<input id="agent-endpoint" value="${escape(endpoint)}" class="ag-input"></label><label>访问口令（仅服务要求时填写）<input id="agent-token" type="password" autocomplete="off" class="ag-input" value="${escape(access)}"></label><p>口令只在本次页面内存使用。DeepSeek密钥和私有COS模板由后端管理。</p>${btn('agent-settings-close','完成')}</section>`:''}
   <div class="ag-chat" id="agent-chat" aria-live="polite">${!project.source?`<div class="ag-welcome"><span class="ag-orb">✦</span><h2>先告诉我你的策略想法</h2><p>我会按“${escape(spec.title)}”整理相关条件。<br>需要补充时，我们一条一条说清楚。</p><div class="ag-starters"><button data-example="均线">试试当前类型示例 <span>↗</span></button><button data-example="own">我已经有一份策略文档 <span>↗</span></button></div><div class="ag-how"><span>01 阅读策略</span><span>02 逐条问答</span><span>03 确认后生成</span></div></div>`:`<article class="ag-message user"><span class="ag-avatar">你</span><div><small>策略原文</small><details><summary>${escape(project.source.slice(0,90))}${project.source.length>90?'…':''}</summary><p>${escape(project.source)}</p></details></div></article>${project.messages.map((m,i)=>`<article class="ag-message ${m.role==='user'?'user':'assistant'}"><span class="ag-avatar">${m.role==='user'?'你':'✦'}</span><div><small>${m.role==='user'?'你的补充':'策略代理'}</small><p>${escape(i===project.messages.length-1 && m.role==='assistant' && a?.question ? a.reply : m.content)}</p></div></article>`).join('')}`}
   ${a?.question?`<section class="ag-question"><span>本次只需确认这一项</span><h2>${escape(a.question.text)}</h2><div>${a.question.options.map((o,i)=>`<button data-answer="${i}" ${busy?'disabled':''}>${escape(o)}<b>↗</b></button>`).join('')}</div><small>也可以在下方用自己的话回答。</small>${a.question.ruleId?btn('agent-defer','暂后处理，先问其他事项',false,busy):''}</section>`:''}
   ${a?.blockers.length?`<section class="ag-blocker"><h3>需要补齐的模板或数据</h3><ul>${a.blockers.map(x=>`<li>${escape(x)}</li>`).join('')}</ul><p>这些是实现条件，不需要你填写函数名。这些提示不等于平台没有数据。已有接口应先核对版本和权限；行业历史映射等真实缺口补齐后重新评估。</p></section>`:''}
   ${a?.ready?`<section class="ag-ready"><b>${ready?'策略方案已整理好':'已恢复方案，需要重新评估'}</b><p>${ready?'请查看右侧策略内容，包括采用的默认值。问题全部回答后，代码会自动生成。':'问答和代码均已保留；重新评估后再确认生成。'}</p>${btn(ready?'agent-confirm':'agent-reassess',ready?(busy&&lastAction==='agent_generate'?'代码生成中…':project.confirmed?'重新生成代码':'确认方案并生成代码'):'重新评估方案',true,busy)}</section>`:''}
   ${busy?'<div class="ag-working"><span class="ag-dots">● ● ●</span> 正在整理或生成，请稍候… '+btn('agent-cancel','取消')+'</div>':''}
   ${error?`<div class="ag-error" role="alert">${escape(error)}<div>${btn('agent-retry',lastAction==='agent_assess'?'重试评估':'重试本次操作',false,busy)}</div></div>`:''}
   </div><div class="ag-composer"><label class="sr-only" for="agent-message">策略文本或补充回答</label><textarea id="agent-message" placeholder="${project.source?'回答当前问题，或直接说“把……改为……”':spec.example}" rows="3" ${busy?'disabled':''}>${escape(composer)}</textarea><div><label class="ag-upload ${busy?'disabled':''}">＋ 导入文本 / Word<input id="agent-file" type="file" accept=".txt,.md,.docx" ${busy?'disabled':''}></label><small>TXT · MD · DOCX</small>${btn('agent-send',project.source?'发送补充 ↑':'开始整理 ↑',true,busy)}</div><p>点击发送后，策略会通过后端交给DeepSeek处理。Shift + Enter换行。</p></div></section>
   <aside class="ag-board"><header><div><span class="ag-eyebrow">策略工作区</span><h2>确认看板 <em>${count}/${Object.keys(labels).length}</em></h2></div><span class="ag-board-caption">随对话更新</span></header><div class="ag-tabs"><button data-tab="plan" aria-selected="${tab==='plan'}">策略方案</button><button data-tab="code" aria-selected="${tab==='code'}">代码与解释${v?' ●':''}</button></div>${tab==='plan'?`<div class="ag-board-content">${a?`<p class="ag-summary">${escape(a.summary)}</p>`:'<p class="ag-summary">你的策略会逐步整理在这里，随时可以点开修改。</p>'}${Object.entries(labels).map(([key,title],i)=>{const r=a?.board.find(x=>x.key===key);return `<article class="ag-card ${r?.status||'empty'}"><div><span class="ag-card-number">0${i+1}</span><h3>${title}</h3><span class="ag-tag">${{confirmed:'已明确',default:'采用默认值',missing:'需要补充'}[r?.status]||'等待整理'}</span></div><p>${escape(r?.content||'等待从原文与回答中整理：'+title)}</p>${r?`<button data-edit="${key}" ${busy?'disabled':''}>用文字修改 ↗</button>`:''}</article>`;}).join('')}<div class="ag-boundary"><b>历史回测</b><span>信息齐备 → 代码检查 → 掘金运行</span><p>三个状态分别验证，不把生成代码当成回测成功。</p></div></div>`:renderCode(v)}
   </aside></div>`;
  if(tab==='code'&&project.versions.length){
   root.querySelector('.ag-board-content')?.insertAdjacentHTML('afterbegin',`<label class="ag-version-picker">查看版本<select id="agent-version-select" class="ag-input">${project.versions.map((x,i)=>`<option value="${escape(x.id)}" ${v?.id===x.id?'selected':''}>版本 ${i+1} · ${x.kind==='repair'?'日志修复':'代码生成'}</option>`).join('')}</select></label>`);
  }
  if(connectionOpen){
   root.querySelector('.ag-settings')?.insertAdjacentHTML('beforeend',`<p>模板来源：${escape(project.knowledgeSource||'首次评估时加载')}。${Array.isArray(project.knowledge)?project.knowledge.map(x=>escape(x.name)+'（'+escape(x.validation)+'）').join('；'):''}</p>`);
  }
  if(project.source&&!project.assessment&&!busy)root.querySelector('.ag-composer')?.insertAdjacentHTML('beforeend',btn('agent-reassess','继续评估已有策略',true));
  bindAgent();bindModeShell();
  const chat=$('agent-chat');if(chat){chat.scrollTop=scrollToEnd?chat.scrollHeight:oldScroll;scrollToEnd=false;}
 }
 function renderCode(v){
  if(!v)return '<div class="ag-code-empty"><span>⌘</span><h3>确认策略后，在这里查看代码</h3><p>每段功能都有自然语言解释。</p></div>';
  const r=v.result,lines=r.code.split('\n'),historical=v.revision!==project.revision;
  return `<div class="ag-board-content"><div class="ag-code-status"><b>${historical?'历史版本 · 不代表当前策略':'当前生成版本'}</b><p>${r.checks.passed?'Python语法解析与基础检查通过':'代码检查未通过'}</p><small>掘金运行：未验证</small></div><p class="ag-summary">${escape(r.summary)}</p>${r.checks.issues.length?`<ul class="ag-error">${r.checks.issues.map(x=>`<li>${escape(x)}</li>`).join('')}</ul>`:''}<div class="ag-code-actions">${btn('agent-download','下载 main.py',true,!r.checks.passed)}${btn('agent-save-report','下载说明')}</div>${r.sections.map(x=>`<details class="ag-code-section"><summary>${escape(x.title)}<small>第${x.startLine}—${x.endLine}行</small></summary><p>${escape(x.explanation)}</p><pre>${escape(lines.slice(x.startLine-1,x.endLine).join('\n'))}</pre></details>`).join('')}<details class="ag-code-section"><summary>完整代码</summary><pre>${escape(r.code)}</pre></details><section class="ag-repair"><h3>回测报错了？</h3><p>粘贴去除Token等凭证的错误日志。修复会保留原版本，不自动更改策略规则。</p><textarea id="agent-log" class="ag-input" rows="5" placeholder="粘贴掘金错误日志" ${busy?'disabled':''}>${escape(logDraft)}</textarea>${btn('agent-repair','根据日志修复',false,busy||historical||!project.confirmed)}${!project.confirmed?'<small>恢复项目或修改策略后，需重新评估并确认方案。</small>':''}</section></div>`;
 }
 function bindAgent(){
  const on=(id,event,fn)=>{if($(id))$(id)[event]=fn;};
  root.querySelectorAll('[name="strategy-type"]').forEach(el=>el.onchange=()=>{if(busy)return;if(C.setStrategyType(project,el.value)){selected=null;tab='plan';error='';persist();renderAgent();if(project.source)request('agent_assess');}});
  on('agent-notes-save','onclick',()=>{try{C.setConfirmedNotes(project,$('agent-confirmed-notes').value.trim());persist();renderAgent();if(project.source)request('agent_assess');}catch(e){error=e.message;renderAgent();}});
  const changeRule=fn=>{if(busy)return;try{fn();persist();renderAgent();request('agent_assess');}catch(e){error=e.message;renderAgent();}};
  on('agent-defer','onclick',()=>changeRule(()=>C.deferRule(project)));
  root.querySelectorAll('[data-rule-accept]').forEach(el=>el.onclick=()=>changeRule(()=>C.acceptRule(project,el.dataset.ruleAccept)));
  root.querySelectorAll('[data-rule-resume]').forEach(el=>el.onclick=()=>changeRule(()=>C.resumeRule(project,el.dataset.ruleResume)));
  root.querySelectorAll('[data-rule-edit]').forEach(el=>el.onclick=()=>{const r=project.dialogue.rules.find(r=>r.id===el.dataset.ruleEdit);composer='请修改这条规则（'+r.id+'）：'+r.text+'。改为：';persist();renderAgent();$('agent-message').focus();});
  on('agent-message','oninput',()=>{composer=$('agent-message').value;persist();});
  on('agent-message','onkeydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit();}});
  on('agent-send','onclick',submit);on('agent-confirm','onclick',()=>{project.confirmed=true;persist();request('agent_generate');});
  on('agent-reassess','onclick',()=>request('agent_assess'));on('agent-retry','onclick',()=>request(lastAction));on('agent-cancel','onclick',cancel);
  on('agent-download','onclick',exportCode);on('agent-save-report','onclick',()=>{const v=currentVersion();downloadFile('策略代码说明.json',JSON.stringify(v,null,2));});
  on('agent-version-select','onchange',()=>{selected=$('agent-version-select').value;renderAgent();});
  on('agent-log','oninput',()=>logDraft=$('agent-log').value);on('agent-repair','onclick',()=>request('agent_repair'));
  on('agent-settings','onclick',()=>{connectionOpen=!connectionOpen;renderAgent();});on('agent-settings-close','onclick',()=>{connectionOpen=false;renderAgent();});
  on('agent-endpoint','onchange',()=>{try{const u=new URL($('agent-endpoint').value.trim());if((u.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(u.hostname)&&u.protocol==='http:'))||u.username||u.password||u.search||u.hash)throw Error();endpoint=u.href;error='';}catch{error='服务地址应为HTTPS地址，或本机HTTP地址，不包含口令或查询参数。';}renderAgent();});
  on('agent-token','oninput',()=>access=$('agent-token').value.trim());
  on('agent-new','onclick',()=>{if(!confirm('新建会清空当前代理工作区，请先下载项目保存。标准模式不受影响。'))return;cancel();project=C.fresh();composer='';logDraft='';selected=null;error='';tab='plan';persist();renderAgent();});
  on('agent-load','onclick',()=>$('agent-project-file').click());on('agent-project-file','onchange',e=>loadProjectFile(e.target.files[0]));
  on('agent-file','onchange',e=>importStrategy(e.target.files[0]));
  root.querySelectorAll('[data-answer]').forEach(el=>el.onclick=()=>{composer=project.assessment.question.options[Number(el.dataset.answer)];submit();});
  root.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>{tab=el.dataset.tab;renderAgent();});
  root.querySelectorAll('[data-version]').forEach(el=>el.onclick=()=>{selected=el.dataset.version;tab='code';renderAgent();});
  root.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>{composer='关于“'+C.types[project.strategyType].labels[el.dataset.edit]+'”，我想修改为：';persist();renderAgent();$('agent-message').focus();});
  root.querySelectorAll('[data-example]').forEach(el=>el.onclick=()=>{if(el.dataset.example==='own'){$('agent-file').click();return;}composer=C.types[project.strategyType].example;persist();renderAgent();$('agent-message').focus();});
 }
 function submit(){if(busy)return;try{C.send(project,composer);composer='';selected=null;tab='plan';error='';scrollToEnd=true;persist();request('agent_assess');}catch(e){error=e.message;renderAgent();}}
 async function post(body,signal){
  const headers={'Content-Type':'application/json'};if(access)headers.Authorization='Bearer '+access;
  const r=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(body),signal});
  let j;try{j=await r.json();}catch{throw Error('服务返回格式不正确，请检查后端地址与部署版本。');}
  if(!r.ok||!j.ok){const msg=j.error||'服务暂时无法完成请求';if(r.status===400&&/不支持.*action|unknown action|unsupported action/i.test(msg))throw Error('云函数还是旧版本，请重新上传“双模式云函数_v1.3.zip”，并确认入口为 index.main_handler。原有标准模式接口也需保留。');throw Error(msg);}return j;
 }
 async function request(action,automatic=false){
  if(busy)return;
  if(!project.source){error='请先输入策略。';renderAgent();return;}
  if(action!=='agent_assess'&&(!project.confirmed||!project.receipt)){error='请先重新评估并确认方案。';lastAction='agent_assess';renderAgent();return;}
  const version=currentVersion();
  if(action==='agent_repair'&&(!version||version.revision!==project.revision||!logDraft.trim())){error='请选择当前版本，并粘贴错误日志。';renderAgent();return;}
  lastAction=action;busy=true;error='';controller=new AbortController();const c=controller,id=++epoch,rev=project.revision;
  const ctx=action==='agent_assess'?C.context(project):project.assessmentContext;
  const body={action,context:ctx};
  if(action!=='agent_assess')Object.assign(body,{assessment:project.assessment,receipt:project.receipt,confirmed:project.confirmed});
  if(action==='agent_repair')Object.assign(body,{code:version.result.code,log:logDraft});
  renderAgent();const timer=setTimeout(()=>c.abort(),65000);let nextAction=null;
  try{
   const j=await post(body,c.signal);if(id!==epoch||c.signal.aborted||rev!==project.revision)return;
   if(action==='agent_assess'){C.applyAssessment(project,j,ctx);project.knowledge=j.knowledge;project.knowledgeSource=j.knowledgeSource;tab='plan';if(j.assessment?.ready&&j.receipt){project.confirmed=true;nextAction='agent_generate';}}
   else if(j.needsClarification){C.invalidate(project);project.messages.push({role:'assistant',content:'生成时发现需要进一步说明：\n'+j.questions.join('\n')});error='请在对话框补充上述内容，再重新确认方案。';tab='plan';}
   else{
    C.addVersion(project,j.result,action==='agent_repair'?'repair':'generate');selected=project.versions.at(-1).id;tab='code';logDraft='';
    if(!j.result.checks.passed&&!automatic){logDraft='代码自动检查发现以下问题，请修复实现并保持原方案：\n'+j.result.checks.issues.join('\n');nextAction='agent_repair';}
   }
   scrollToEnd=true;persist();
  }catch(e){if(id!==epoch)return;error=e.name==='AbortError'?'请求已取消或超过等待时间，回答已保存，可以重试。':e.message;if(/过期|重新评估|方案已变化/.test(error)){project.confirmed=false;project.receipt=null;lastAction='agent_assess';}}
  finally{clearTimeout(timer);if(id===epoch){busy=false;controller=null;renderAgent();if(nextAction)await request(nextAction,nextAction==='agent_repair');}}
 }
 async function importStrategy(file){
  if(!file||busy)return;const id=++epoch;busy=true;error='';controller=new AbortController();const c=controller;renderAgent();const timer=setTimeout(()=>c.abort(),65000);
  try{if(file.size>2*1024*1024)throw Error('文件不能超过2MB');let text;
   if(/\.docx$/i.test(file.name)){const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));text=(await post({action:'agent_import',name:file.name,file:btoa(binary)},c.signal)).text;}
   else if(/\.(txt|md)$/i.test(file.name)){const buffer=await file.arrayBuffer();try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{text=new TextDecoder('gb18030').decode(buffer);}}
   else throw Error('支持TXT、MD和DOCX文件');
   if(id!==epoch||c.signal.aborted)return;if(typeof text!=='string'||!text.trim()||text.length>40000)throw Error('正文为空或超过40000字');
   C.send(project,text);composer='';selected=null;tab='plan';scrollToEnd=true;persist();
   busy=false;controller=null;clearTimeout(timer);renderAgent();request('agent_assess');return;
  }catch(e){if(id===epoch)error=e.name==='AbortError'?'文档读取已取消或超时':e.message;}
  finally{clearTimeout(timer);if(id===epoch){busy=false;controller=null;renderAgent();}}
 }
 async function loadProjectFile(file){
  if(!file)return;const id=++epoch;controller?.abort();busy=false;
  try{if(file.size>2200000)throw Error('项目文件过大');const p=C.restore(JSON.parse(await file.text()));if(id!==epoch)return;project=p;composer=p.draft;selected=null;logDraft='';error='';tab='plan';persist();renderAgent();}catch(e){error=e.message;renderAgent();}
 }
 setMode(mode);
})();
