(function(root){
 'use strict';
 const T=typeof module!=='undefined'&&module.exports?require('./agent_types'):root.AgentTypes;
 const labels={universe:'买哪些股票',entry:'什么时候买',exit:'什么时候卖',allocation:'买多少',execution:'特殊情况与执行',backtest:'回测设置'};
 function fresh(strategyType='trading'){T.get(strategyType);return {strategyType,format:'strategy-agent-1',source:'',confirmedNotes:'',draft:'',messages:[],assessment:null,assessmentContext:null,receipt:null,confirmed:false,versions:[],revision:0,savedAt:null};}
 function invalidate(s){s.revision++;s.confirmed=false;s.receipt=null;s.assessmentContext=null;s.assessment=null;}
 function send(s,text){text=text.trim();if(!text)throw Error('请先输入策略或补充说明');if(s.messages.length>=98)throw Error('当前对话已达上限，请下载项目保存后，用已确认的策略说明新建项目');if(!s.source){if(text.length>40000)throw Error('策略最多40000字');s.source=text;}else{if(text.length>12000)throw Error('每条补充最多12000字');s.messages.push({role:'user',content:text});}s.draft='';invalidate(s);}
 function context(s){return {strategyType:s.strategyType,confirmedNotes:s.confirmedNotes||'',source:s.source,messages:s.messages.map(m=>({role:m.role,content:m.content}))};}
 function plan(p){
  const labels=T.get(p?.strategyType||'trading').labels;
  if(!p||typeof p.name!=='string'||typeof p.summary!=='string'||typeof p.reply!=='string'||!Array.isArray(p.board)||p.board.length!==Object.keys(labels).length||!Array.isArray(p.blockers)||p.blockers.some(x=>typeof x!=='string')||typeof p.ready!=='boolean')throw Error('确认看板格式不正确');
  for(const key of Object.keys(labels)){const rows=p.board.filter(x=>x?.key===key);if(rows.length!==1||typeof rows[0].content!=='string'||!['confirmed','default','missing'].includes(rows[0].status))throw Error('确认看板模块不完整');}
  if(p.question!=null&&(typeof p.question.text!=='string'||!Object.hasOwn(labels,p.question.boardKey)||!Array.isArray(p.question.options)||p.question.options.some(x=>typeof x!=='string')))throw Error('提问格式不正确');
  if(p.ready&&(p.question||p.blockers.length||p.board.some(x=>x.status==='missing')))throw Error('方案仍有待处理项');
  return p;
 }
 function applyAssessment(s,r,ctx){if((r.assessment?.confirmedNotes||'')!==(ctx.confirmedNotes||''))throw Error('已确认规则未被服务保留，请更新云函数后重新评估');if((r.assessment?.strategyType||'trading')!==s.strategyType)throw Error('服务返回的策略类型不一致，请更新云函数后重新评估');s.assessment=plan(r.assessment);s.receipt=r.receipt;s.assessmentContext=ctx;s.confirmed=false;
  const p=s.assessment;const content=[p.reply,p.question?.text,...(p.question?.options||[])].filter(Boolean).join('\n');s.messages.push({role:'assistant',content});
 }
 function result(r){
  if(!r||typeof r.code!=='string'||!r.code.trim()||r.code.length>100000||typeof r.summary!=='string'||!Array.isArray(r.sections)||!r.sections.length||!r.checks||typeof r.checks.passed!=='boolean'||!Array.isArray(r.checks.issues)||r.checks.issues.some(x=>typeof x!=='string'))throw Error('代码或解释格式不完整');
  const n=r.code.split('\n').length;
  if(r.sections.some(x=>typeof x.title!=='string'||typeof x.explanation!=='string'||!Number.isInteger(x.startLine)||!Number.isInteger(x.endLine)||x.startLine<1||x.endLine<x.startLine||x.endLine>n))throw Error('代码解释行号不正确');
  return r;
 }
 function addVersion(s,r,kind){result(r);s.versions.push({id:Date.now().toString(36)+'-'+s.versions.length,createdAt:new Date().toISOString(),revision:s.revision,kind,result:r,plan:s.assessment});s.versions=s.versions.slice(-6);}
 function restore(raw){
  if(!raw||raw.format!=='strategy-agent-1'||typeof raw.source!=='string'||raw.source.length>40000||!Array.isArray(raw.messages)||raw.messages.length>100||raw.messages.some(m=>!['user','assistant'].includes(m?.role)||typeof m.content!=='string'||m.content.length>12000)||!Array.isArray(raw.versions)||raw.versions.length>6)throw Error('不是有效的代理模式项目');
  if(JSON.stringify(raw).length>1800000)throw Error('项目过大');
  const s=fresh(raw.strategyType||'trading');s.source=raw.source;if(raw.confirmedNotes!=null&&(typeof raw.confirmedNotes!=='string'||raw.confirmedNotes.length>12000))throw Error('已确认规则格式不正确');s.confirmedNotes=raw.confirmedNotes||'';s.draft=typeof raw.draft==='string'?raw.draft.slice(0,40000):'';s.messages=raw.messages.map(m=>({role:m.role,content:m.content}));
  s.assessment=raw.assessment?plan(raw.assessment):null;
  s.versions=raw.versions.map(v=>({id:String(v.id),createdAt:String(v.createdAt),revision:Number(v.revision),kind:String(v.kind),result:result(v.result),plan:v.plan?plan(v.plan):null}));
  s.revision=Number.isSafeInteger(raw.revision)?raw.revision:0;s.savedAt=raw.savedAt;s.confirmed=false;s.receipt=null;
  s.knowledgeSource=typeof raw.knowledgeSource==='string'?raw.knowledgeSource:'';
  s.knowledge=Array.isArray(raw.knowledge)?raw.knowledge.slice(0,3).map(x=>({name:String(x?.name||''),validation:String(x?.validation||'')})):[];
  return s;
 }
 function setStrategyType(s,type){T.get(type);if(s.strategyType===type)return false;s.strategyType=type;invalidate(s);return true;}
 function setConfirmedNotes(s,text){if(typeof text!=='string'||text.length>12000)throw Error('已确认规则最多12000字');if(s.confirmedNotes===text)return;s.confirmedNotes=text;invalidate(s);}
 const api={setConfirmedNotes,types:T.types,setStrategyType,fresh,invalidate,send,context,plan,applyAssessment,result,addVersion,restore,labels};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AgentCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
