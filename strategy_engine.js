/* Local deterministic rule schema and Python emitter. No generated code is executed here. */
(function (root) {
 'use strict';
 const fields = {name:'策略名称',type:'策略类型',mode:'运行模式',symbols:'股票代码',frequency:'行情周期',budget:'总仓位上限',perStock:'单股仓位上限',cashReserve:'保留现金比例',cash:'初始资金',start:'回测开始日期',end:'回测结束日期',commission:'手续费率',slippage:'滑点率'};
 const kinds = {ma_above:'收盘价高于均线',ma_below:'收盘价低于均线',return_above:'N周期涨跌幅大于',return_below:'N周期涨跌幅小于',boll_above:'收盘价高于布林上轨',boll_below:'收盘价低于布林下轨'};
 const sample = `# 股票条件组合 · 教学示例（不是V9.7）
策略名称：双均线条件试用
股票代码：SHSE.600000,SZSE.000001
行情周期：1d
总仓位上限：40%
单股仓位上限：20%
保留现金比例：20%
初始资金：100000
回测开始日期：2023-01-01
回测结束日期：2024-01-01
手续费率：0.0003
滑点率：0.0001
买入关系：全部满足
卖出关系：任一满足
R01|买入|收盘价高于均线|20|0
R02|买入|N周期涨跌幅大于|10|0%
R03|卖出|收盘价低于均线|20|0
执行约定：每根已结束K线判断；仅空仓买入，有仓不加仓；卖出优先且同根K线不再买；限价为该K线收盘价；下一K线撮合；未成交订单存在时跳过该股票；拒单不立即重试，下一K线重评；卖出不超过可卖数量；缺数据跳过；组预算按股票池数量等分且受单股上限约束；剩余资金不跨股票补配；不管理股票池外持仓；不恢复历史子策略归属。
`;
 const template = `# 股票策略填写模板 · 0.4
只填写冒号后内容；规则行按“编号|买入或卖出|条件|周期|阈值”填写。
策略名称：
股票代码：
行情周期：
总仓位上限：
单股仓位上限：
保留现金比例：
初始资金：
回测开始日期：
回测结束日期：
手续费率：
滑点率：
买入关系：
卖出关系：
R01|买入|||
R02|卖出|||
执行约定：

## 填写说明（不参与规则读取）
股票代码示例：SHSE.600000,SZSE.000001；行情周期：1d、60s、300s。
百分比写20%，手续费率可写0.0003。买入和卖出关系填写“全部满足”或“任一满足”。
条件：收盘价高于均线、收盘价低于均线、N周期涨跌幅大于、N周期涨跌幅小于、收盘价高于布林上轨、收盘价低于布林下轨。
周期为K线根数。均线阈值写0；涨跌幅阈值写百分比；布林阈值写标准差倍数（如2）。
点击“载入教学示例”查看完整填写和执行约定。其他自然语言内容请使用AI解析，未支持的内容会列为待解决项。
`;
 function blank(){return {version:1,name:'',type:'',mode:'',symbols:[],frequency:'',budget:null,perStock:null,cashReserve:null,cash:null,start:'',end:'',commission:null,slippage:null,buyJoin:'',sellJoin:'',rules:[],unresolved:[],executionNote:'',explanation:'',metadata:{},executionConfirmed:false};}
 function number(v){if(v===null||v===undefined||String(v).trim()==='')return null;const s=String(v).trim();return /%$/.test(s)?Number(s.slice(0,-1))/100:Number(s);}
 function parse(text){
  const s=blank(), ignored=[],seen=new Set(); let instructions=false,section='';
  for(const raw of text.split(/\r?\n/)){
   const line=raw.trim(); if(line.startsWith('## 填写说明'))instructions=true;
   const heading=line.match(/^##\s+(.+)/); if(heading){section=heading[1];continue;}
   if(instructions||!line||line.startsWith('#')||line.startsWith('只填写'))continue;
   if(/^R[\w-]+\|/.test(line)){
    const a=line.split('|').map(x=>x.trim()); if(a.length!==5)ignored.push('规则应有5列：'+line); const kind=Object.keys(kinds).find(k=>kinds[k]===a[2]);
    s.rules.push({id:a[0],side:a[1]==='买入'?'buy':a[1]==='卖出'?'sell':'',kind:kind||'',period:number(a[3]),threshold:number(a[4]),source:line});continue;
   }
   const m=line.match(/^([^：:]+)[：:](.*)$/); if(!m){
    if(/执行约定|执行细节/.test(section))s.executionNote+=(s.executionNote?'\n':'')+line;
    else if(/解释|说明/.test(section))s.explanation+=(s.explanation?'\n':'')+line;
    else ignored.push(line);continue;
   }
   const metadataKeys=['策略版本','用途','状态','备注','目标'];
   if(metadataKeys.includes(m[1])){s.metadata[m[1]]=m[2].trim();continue;}
   if(seen.has(m[1]))ignored.push('字段重复，请确认唯一取值：'+line);seen.add(m[1]);
   const aliases={'交易标的':'symbols','股票代码':'symbols','策略类型':'type','运行模式':'mode','总仓位':'budget','总仓位上限':'budget','单股上限':'perStock','单股仓位上限':'perStock','保留现金':'cashReserve','保留现金比例':'cashReserve'};
   const key=aliases[m[1]]||Object.keys(fields).find(k=>fields[k]===m[1]);
   if(key){const v=m[2].trim();s[key]=key==='symbols'?v.split(/[,，\s]+/).filter(Boolean):['budget','perStock','cashReserve','cash','commission','slippage'].includes(key)?number(v):v;}
   else if(m[1]==='买入关系'||m[1]==='卖出关系'){
    s[m[1]==='买入关系'?'buyJoin':'sellJoin']=m[2].trim()==='全部满足'?'all':m[2].trim()==='任一满足'?'any':'';
   }else if(m[1]==='执行约定'){s.executionNote=m[2].trim();}
   else ignored.push(line);
  }
  s.unresolved=ignored.map(x=>'未识别原文：'+x);return s;
 }
 function validate(s){
  const pool=s.metadata?.pool;
  if(pool){
   const issues=[];
   if(!Array.isArray(pool.sources)||!pool.sources.length)issues.push('请选择股票池来源');
   if(pool.ranking==='top'&&(!Number.isInteger(pool.count)||pool.count<1))issues.push('排名数量应为正整数');
   if(pool.ranking==='top'&&(!Array.isArray(pool.factors)||!pool.factors.length||pool.factors.some(f=>!f||!Number.isFinite(f.weight)||f.weight<=0)))issues.push('排名至少需要一个因子，且权重必须为正数');
   if(pool.sources?.some(x=>x!=='manual')||pool.exclude?.length||pool.blacklist||pool.filters||pool.ranking==='top')issues.push('股票池自动选股、过滤或因子排名尚未接入代码生成');
   if(issues.length)return issues;
  }
  const e=[];if(!s||typeof s!=='object')return ['结构化结果必须为对象'];
  if(s.version!==1)e.push('结构版本不受支持');
  if(typeof s.name!=='string'||!s.name.trim())e.push('填写策略名称');
  if(!Array.isArray(s.symbols)||!s.symbols.length||s.symbols.length>50||s.symbols.some(x=>typeof x!=='string'||! /^(SHSE|SZSE)\.\d{6}$/.test(x)))e.push('股票池需为1—50个完整沪深代码；暂不支持自动指数成分股或行业股票池');
  else if(new Set(s.symbols).size!==s.symbols.length)e.push('股票代码重复');
  if(!['1d','60s','300s'].includes(s.frequency))e.push('行情周期请选择1d、60s或300s');
  for(const key of ['budget','perStock'])if(typeof s[key]!=='number'||!Number.isFinite(s[key])||s[key]<=0||s[key]>1)e.push(fields[key]+'应大于0且不超过100%');
  if(typeof s.cashReserve!=='number'||!Number.isFinite(s.cashReserve)||s.cashReserve<0||s.cashReserve>1)e.push(fields.cashReserve+'应填写0%到100%');
  else if(typeof s.budget==='number'&&s.budget+s.cashReserve>1)e.push('总仓位上限与保留现金比例之和不能超过100%');
  if(s.perStock>s.budget)e.push('单股上限不能高于总仓位上限');
  if(typeof s.cash!=='number'||!Number.isFinite(s.cash)||s.cash<=0)e.push('初始资金必须大于0');
  for(const k of ['commission','slippage'])if(typeof s[k]!=='number'||!Number.isFinite(s[k])||s[k]<0||s[k]>=1)e.push(fields[k]+'应为0到1之间的小数');
  for(const k of ['start','end']){const d=typeof s[k]==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s[k])?new Date(s[k]+'T00:00:00Z'):new Date(NaN);if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s[k])e.push(fields[k]+'格式不正确');}
  if(s.start>=s.end)e.push('回测结束日期必须晚于开始日期');
  if(!['all','any'].includes(s.buyJoin)||!['all','any'].includes(s.sellJoin))e.push('明确买入、卖出条件的组合关系');
  if(!Array.isArray(s.rules)||s.rules.length===0||s.rules.length>30)e.push('需要1—30条规则');
  else {
   const ids=new Set();for(const r of s.rules){
    if(!r||typeof r!=='object'){e.push('规则对象无效');continue;}
    if(typeof r.id!=='string'||!/^R[A-Za-z0-9_-]+$/.test(r.id)||ids.has(r.id))e.push('规则编号无效或重复：'+String(r.id));ids.add(r.id);
    const supported=Object.hasOwn(kinds,r.kind);
    if(!['buy','sell'].includes(r.side)||!supported)e.push(String(r.id)+'：条件暂未支持');
    if(supported&&(!Number.isInteger(r.period)||r.period<2||r.period>500))e.push(String(r.id)+'：周期应为2—500的整数');
    if(typeof r.threshold!=='number'||!Number.isFinite(r.threshold))e.push(String(r.id)+'：阈值需为数字');
    if(String(r.kind).startsWith('boll')&&r.threshold<=0)e.push(String(r.id)+'：布林标准差倍数应大于0');
    if(String(r.kind).startsWith('ma_')&&r.threshold!==0)e.push(String(r.id)+'：均线条件阈值固定为0');
   }
   if(!s.rules.some(r=>r?.side==='buy')||!s.rules.some(r=>r?.side==='sell'))e.push('至少填写一条买入和一条卖出规则');
  }
  if(!Array.isArray(s.unresolved))e.push('待解决项必须为数组');else for(const q of s.unresolved)e.push(String(q));
  if(s.executionConfirmed!==true)e.push('请阅读并确认本版执行约定');return e;
 }
 function evaluate(r,closes){if(closes.length<r.period+1)return null;const x=closes.slice(-r.period),last=closes.at(-1);if(x.some(v=>!Number.isFinite(v)||v<=0))return null;
  const mean=x.reduce((a,b)=>a+b,0)/x.length;
  if(r.kind==='ma_above')return last>mean;if(r.kind==='ma_below')return last<mean;
  if(r.kind.startsWith('return_')){const old=closes.at(-r.period-1);if(!Number.isFinite(old)||old<=0)return null;const ret=last/old-1;return r.kind==='return_above'?ret>r.threshold:ret<r.threshold;}
  const std=Math.sqrt(x.reduce((a,b)=>a+(b-mean)**2,0)/(x.length-1));return r.kind==='boll_above'?last>mean+r.threshold*std:last<mean-r.threshold*std;
 }
 function decision(s,closes,held){const side=k=>{const vals=s.rules.filter(r=>r.side===k).map(r=>evaluate(r,closes));return vals.includes(null)?null:(s[k+'Join']==='all'?vals.every(Boolean):vals.some(Boolean));};const sell=side('sell'),buy=side('buy');if(sell===null||buy===null)return '跳过：数据不足';if(sell)return held?'卖出可卖持仓':'不买入：卖出信号优先';if(buy&&!held)return '按预算买入';return '保持';}
 function generate(s){const errors=validate(s);if(errors.length)throw Error(errors.join('\n'));
  const clean={...s}; delete clean.unresolved;delete clean.executionNote;delete clean.executionConfirmed;
  const lines=[],notes=[];function add(block,note){for(const line of block.split('\n')){lines.push(line);notes.push(note);}}
  add('# coding=utf-8\nfrom __future__ import print_function, absolute_import, unicode_literals\nfrom gm.api import *\nimport json\nimport math\nimport os','掘金入口与标准库；代码只导出，不在编辑器执行。');
  add('CONFIG = json.loads('+JSON.stringify(JSON.stringify(clean))+')','用户确认的参数与规则，保留规则编号；JSON文本安全编码。');
  add(`
def init(context):
    context.seen = {}
    subscribe(symbols=CONFIG['symbols'], frequency=CONFIG['frequency'],
              count=max(r['period'] for r in CONFIG['rules']) + 1)

def rule_matches(rule, closes):
    n = rule['period']
    values = closes[-n:]
    mean = sum(values) / n
    last = closes[-1]
    kind = rule['kind']
    if kind == 'ma_above':
        return last > mean
    if kind == 'ma_below':
        return last < mean
    if kind.startswith('return_'):
        change = last / closes[-n - 1] - 1
        return change > rule['threshold'] if kind == 'return_above' else change < rule['threshold']
    std = math.sqrt(sum((v - mean) ** 2 for v in values) / (n - 1))
    return last > mean + rule['threshold'] * std if kind == 'boll_above' else last < mean - rule['threshold'] * std

def combined(side, closes):
    results = [rule_matches(r, closes) for r in CONFIG['rules'] if r['side'] == side]
    return all(results) if CONFIG[side + 'Join'] == 'all' else any(results)
`, '订阅已完成K线；计算规则条件，严格比较不包含等号。布林使用样本标准差。全部满足或任一满足由确认参数决定。');
  for(const r of s.rules)add('# ['+r.id+'] '+kinds[r.kind]+'；周期='+r.period+'；阈值='+r.threshold+'；'+(r.side==='buy'?'买入':'卖出'),'规则 '+r.id+' 在CONFIG中保存，由rule_matches计算、combined组合。');
  add(`
def on_bar(context, bars):
    for bar in bars:
        symbol = bar['symbol']
        if symbol not in CONFIG['symbols'] or bar['frequency'] != CONFIG['frequency']:
            continue
        stamp = str(bar['eob'])
        if context.seen.get(symbol) == stamp:
            continue
        context.seen[symbol] = stamp
        pending = get_unfinished_orders()
        if any(o['symbol'] == symbol for o in pending):
            continue
        count = max(r['period'] for r in CONFIG['rules']) + 1
        data = context.data(symbol=symbol, frequency=CONFIG['frequency'], count=count, fields='close')
        if data is None or len(data) < count:
            continue
        closes = [float(v) for v in data['close'].values]
        if any(not math.isfinite(v) or v <= 0 for v in closes):
            continue
        price = float(bar['close'])
        positions = [p for p in get_position() if p['symbol'] == symbol and p['volume'] > 0]
        held = bool(positions)
        if combined('sell', closes):
            for p in positions:
                # 可卖昨仓 = 非冻结总仓 - 非冻结今仓。
                if 'available_today' not in p or 'available' not in p:
                    print('持仓字段不完整，跳过卖出', symbol)
                    continue
                available = max(0, int(p['available'] - p['available_today']))
                if available:
                    order_volume(symbol=symbol, volume=available, side=OrderSide_Sell,
                                 order_type=OrderType_Limit, position_effect=PositionEffect_Close, price=price)
            continue
        if not held and combined('buy', closes):
            weight = min(CONFIG['perStock'], CONFIG['budget'] / len(CONFIG['symbols']))
            order_target_percent(symbol=symbol, percent=weight, order_type=OrderType_Limit,
                                 position_side=PositionSide_Long, price=price)

def on_order_status(context, order):
    print(context.now, order['symbol'], '委托状态', order['status'])

def on_backtest_finished(context, indicator):
    print('回测结束，请在掘金查看成交记录与绩效', indicator)
`, '统一交易入口：同根K线去重、有未成交单时跳过；先判断卖出，空仓才买入。限价取当前已完成K线收盘价，订单状态仅日志记录，不虚构成交。');
  add(`
if __name__ == '__main__':
    run(strategy_id=os.environ.get('GM_STRATEGY_ID', 'YOUR_STRATEGY_ID'),
        filename=os.path.basename(__file__), mode=MODE_BACKTEST,
        token=os.environ.get('GM_TOKEN', 'YOUR_TOKEN'),
        backtest_start_time=CONFIG['start'] + ' 09:00:00',
        backtest_end_time=CONFIG['end'] + ' 15:30:00',
        backtest_adjust=ADJUST_NONE,
        backtest_initial_cash=CONFIG['cash'],
        backtest_commission_ratio=CONFIG['commission'],
        backtest_slippage_ratio=CONFIG['slippage'], backtest_match_mode=0)
`, '回测入口：需在本机配置掘金策略ID与Token；不复权，除权会影响指标。撮合与数据权限需在掘金实际验证。');
  return {code:lines.join('\n'),notes};
 }
 const api={fields,kinds,blank,number,parse,validate,evaluate,decision,generate,sample,template};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StrategyEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
