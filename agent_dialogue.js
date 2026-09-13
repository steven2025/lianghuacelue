(function(root){
 'use strict';
 function fresh(){return {version:1,rules:[],attempts:{}};}
 function validate(d){
  if(!d||d.version!==1||!Array.isArray(d.rules)||d.rules.length>100||!d.attempts||typeof d.attempts!=='object'||Array.isArray(d.attempts)||JSON.stringify(d).length>90000)throw Error('规则记录格式不正确');
  const ids=new Set();
  for(const r of d.rules){if(!r||typeof r.id!=='string'||!/^[a-z][a-z0-9_.-]{0,79}$/.test(r.id)||ids.has(r.id)||typeof r.key!=='string'||typeof r.text!=='string'||!r.text.trim()||r.text.length>2000||!['confirmed','proposed','missing','deferred'].includes(r.status)||!Array.isArray(r.evidence)||r.evidence.length>4)throw Error('逐条规则格式不正确');ids.add(r.id);
   for(const e of r.evidence)if(!e||typeof e.source!=='string'||typeof e.quote!=='string'||!e.quote.trim()||e.quote.length>2000)throw Error('规则依据格式不正确');
  }
  for(const [id,n]of Object.entries(d.attempts))if(!ids.has(id)||!Number.isInteger(n)||n<0||n>3)throw Error('追问次数不正确');
  return JSON.parse(JSON.stringify(d));
 }
 function evidenceText(ctx,e){if(e.source==='source')return ctx.source;if(e.source==='notes')return ctx.confirmedNotes||'';const m=/^message:(\d+)$/.exec(e.source);return m&&ctx.messages[Number(m[1])]?.role==='user'?ctx.messages[Number(m[1])].content:'';}
 function merge(ctx,updates,labels){
  const d=validate(ctx.dialogue);if(!Array.isArray(updates)||updates.length>100)throw Error('Agent未返回逐条规则更新，请重试或检查服务版本');
  const changed=[];const seen=new Set();
  for(const item of updates){
   const r=validate({version:1,rules:[item],attempts:{}}).rules[0];
   if(!Object.hasOwn(labels,r.key)||seen.has(r.id))throw Error('规则模块或编号不正确');seen.add(r.id);
   const old=d.rules.find(x=>x.id===r.id);if(old&&old.key!==r.key)throw Error('同一规则不能变更所属模块');
   if(r.status==='confirmed'&&(!r.evidence.length||r.evidence.some(e=>!evidenceText(ctx,e).includes(e.quote))))throw Error('已明确规则缺少原文或用户回答依据');
   // The model cannot silently discard or downgrade a known rule.
   if(old?.status==='confirmed'&&r.status!=='confirmed')throw Error('已明确规则发生冲突，请明确提出修改问题，不要撤销原记录');
   if(old?.status==='deferred'&&r.status!=='confirmed')continue;
   if(old?.status==='confirmed'&&JSON.stringify(old)!==JSON.stringify(r)){
    const lastAssistant=ctx.messages.map(x=>x.role).lastIndexOf('assistant');
    if(!r.evidence.some(e=>e.source==='notes'||(/^message:\d+$/.test(e.source)&&Number(e.source.slice(8))>lastAssistant)))throw Error('修改已有规则需要本轮用户依据');
   }
   if(old){d.rules[d.rules.indexOf(old)]=r;}else d.rules.push(r);
   if(r.status==='confirmed'&&(!old||old.text!==r.text||old.status!==r.status))changed.push(r);
  }
  validate(d);return {dialogue:d,changed};
 }
 function route(d,question){
  for(const r of d.rules)if(['missing','proposed'].includes(r.status)&&(d.attempts[r.id]||0)>=3)r.status='deferred';
  let rule=question&&d.rules.find(r=>r.id===question.ruleId);
  if(question&&(!rule||question.boardKey!==rule.key))throw Error('提问必须关联待确认规则');
  if(rule&&['confirmed','deferred'].includes(rule.status))rule=null;
  if(rule&&(d.attempts[rule.id]||0)>=3){rule.status='deferred';rule=null;}
  if(!rule)rule=d.rules.find(r=>['missing','proposed'].includes(r.status)&&(d.attempts[r.id]||0)<3);
  if(!rule)return null;
  const count=(d.attempts[rule.id]||0)+1;d.attempts[rule.id]=count;
  const same=question?.ruleId===rule.id;
  return {ruleId:rule.id,boardKey:rule.key,text:count===3?'换个方式确认（也可暂后处理）：'+(same?question.text:rule.text):same?question.text:'请确认：'+rule.text,options:same?question.options:[],attempt:count};
 }
 const api={fresh,validate,merge,route};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AgentDialogue=api;
})(typeof globalThis!=='undefined'?globalThis:this);
