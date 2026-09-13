/* Independent text-to-code workflow. No model code is executed in the browser. */
'use strict';
let aiDraft=null;
function aiTextPanel(){
 const d=aiDraft?.text===state.text?aiDraft.result:null;
 const list=xs=>`<ul>${xs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
 return section('AI 自动生成回测代码',`<p>直接用上面的文字描述策略，无需先解析或修改标准配置。点击后会通过腾讯云发送策略给DeepSeek，可能产生接口费用。</p><p>缺少普通回测参数时会采用并展示默认值；关键买卖条件不清楚时，只需用文字补充回答。</p><label>后端访问口令（服务要求时填写）<input id="aiAccess" class="input" type="password" autocomplete="off" placeholder="可选；只在本次页面内使用" value="${esc(api.accessToken||'')}"></label><div class="actions">${button('generateText','AI 自动生成','green')}</div>${d?`<h3>${esc(d.name)}</h3><p>${esc(d.summary)}</p>${d.assumptions.length?'<h3>本次采用的参数与约定</h3>'+list(d.assumptions):''}${d.questions.length?'<h3>请用自己的话补充</h3>'+list(d.questions):''}${d.warnings.length?'<h3>需要了解的事项</h3>'+list(d.warnings):''}<p>${esc(d.checks.note)}</p>${d.checks.issues.length?list(d.checks.issues):''}<label>补充说明或修改要求<textarea id="aiFollowup" class="input" rows="3" placeholder="例如：使用沪深300股票；跌破20日均线卖出；初始资金改为20万元"></textarea></label><div class="actions">${button('regenerateText','提交补充并重新生成')}</div>${d.code?`<details open><summary>查看 Python 回测代码</summary><pre class="code">${esc(d.code)}</pre></details><div class="actions">${d.checks.passed?button('exportAiCode','下载 main.py','green'):''}${button('exportAiReport','保存生成说明')}</div><p>下载后在掘金配置 GM_STRATEGY_ID 和 GM_TOKEN，运行历史回测。当前未验证Python语法或真实掘金运行；基础检查失败时不可导出代码。</p>`:''}`:''}`);
}
function bindAiText(){
 const on=(id,event,fn)=>{if($(id))$(id)[event]=fn;};
 on('aiAccess','oninput',()=>{api.accessToken=$('aiAccess').value.trim();});
 on('generateText','onclick',()=>generateTextCode());
 on('regenerateText','onclick',()=>{const extra=$('aiFollowup').value.trim();if(!extra){notify('请先填写补充说明。');return;}state.text+='\n\n补充说明：\n'+extra;state.spec=null;invalidate();render();generateTextCode();});
 on('exportAiCode','onclick',()=>{if(aiDraft?.text!==state.text||!aiDraft.result.checks.passed||!aiDraft.result.code){notify('请先生成当前文本的代码。');return;}download('main.py',aiDraft.result.code);});
 on('exportAiReport','onclick',()=>{if(aiDraft?.text===state.text)download('AI生成说明.json',JSON.stringify(aiDraft,null,2));});
}
async function generateTextCode(){
 if(api.busy){notify('正在生成，请等待或取消当前请求。');return;}
 if(state.language!=='python'){notify('AI自动生成目前支持Python，请先选择Python。');return;}
 if(!state.text.trim()||state.text.length>40000){notify('请填写1—40000字策略文本。');return;}
 const revision=state.revision,text=state.text,c=new AbortController();
 aiDraft=null;api.busy=true;api.controller=c;api.status='正在生成代码';render();
 const timer=setTimeout(()=>c.abort(),65000);
 try{
  const headers={'Content-Type':'application/json'};if(api.accessToken)headers.Authorization='Bearer '+api.accessToken;
  const r=await fetch(api.backend,{method:'POST',headers,body:JSON.stringify({action:'generate',text}),signal:c.signal});
  let j;try{j=await r.json();}catch{throw Error('后端未返回有效JSON，请检查云函数部署。');}
  if(!r.ok||!j.ok)throw Error(j.error||'AI生成失败');
  if(c.signal.aborted||revision!==state.revision||text!==state.text)throw Error('请求已取消或策略已修改，旧结果已丢弃');
  const d=j.result;
  if(!d||typeof d.code!=='string'||typeof d.name!=='string'||typeof d.summary!=='string'||['assumptions','questions','warnings'].some(k=>!Array.isArray(d[k])||d[k].some(x=>typeof x!=='string'))||!d.checks||typeof d.checks.passed!=='boolean'||!Array.isArray(d.checks.issues))throw Error('后端尚未支持自动生成，或返回格式不正确。请部署新版云函数。');
  if(d.questions.length){d.code='';d.checks.passed=false;}
  aiDraft={text,result:d};api.status=d.questions.length?'等待文字补充':'生成完成';
  notify(d.questions.length?'请在下方用文字回答问题，无需修改规则。':d.checks.passed?'代码已生成，尚未在掘金运行。':'代码基础检查未通过，请补充要求后重新生成。');
 }catch(e){api.status='生成未完成';notify(e.name==='AbortError'?'生成已取消或超时，可重试。':e.message);}
 finally{clearTimeout(timer);api.busy=false;api.controller=null;render();}
}
