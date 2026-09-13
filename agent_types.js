(function(root){
 'use strict';
 const types={
  selection:{title:'纯选股',description:'只筛选股票名单，不买卖',labels:{universe:'股票范围',filters:'筛选条件',ranking:'排序与入选数量',timing:'选股时间与频率',output:'名单输出方式',backtest:'历史验证区间'},example:'从沪深主板股票中，每天收盘后选出收盘价高于20日均线的股票，按当天成交额从高到低取前10只，只输出股票名单，不进行买卖。'},
  signal:{title:'信号提示',description:'发现条件时提示，不自动交易',labels:{universe:'关注哪些股票',signals:'什么条件发出提示',timing:'检查时间与频率',output:'提示内容与重复处理',backtest:'历史验证区间'},example:'关注SHSE.600000和SZSE.000001，每天收盘后检查价格是否从20日均线下方突破至上方，满足时在日志输出股票、时间和提示原因，不下单。'},
  trading:{title:'完整交易',description:'选股、买卖、仓位与回测',labels:{universe:'买哪些股票',entry:'什么时候买',exit:'什么时候卖',allocation:'买多少',execution:'特殊情况与执行',backtest:'回测设置'},example:'教学回测策略：只交易SHSE.600000和SZSE.000001。每天收盘价高于20日均线时，空仓买入；低于20日均线时卖出可卖持仓。有仓不加仓。总仓位40%，单股最多20%。'}
 };
 function get(id){if(!Object.hasOwn(types,id))throw Error('请选择有效的策略类型');return types[id];}
 const api={types,get};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AgentTypes=api;
})(typeof globalThis!=='undefined'?globalThis:this);
