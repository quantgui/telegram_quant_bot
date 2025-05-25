const STATUS_MAP = {
  "-1": "🕒等待运行",
  "1": "🟢运行中",
  "-2": "🕒等待暂停",
  "2": "🟠已暂停",
  "-3": "🕒等待终止"
}



/**
 * 策略模板定义
 */
const STRATEGY = {
    "网格1号": {
        description: "低买高卖捕捉波动收益",  // 策略描述
        template: `
策略名称：网格1号
[必填] 交易所: 【币安合约、Gate合约】
[必填] 交易对: 【BTC、eth、1000shib】
[必填] 下单数量: 0.01
[必填] 网格比例: 0.5%
[必填] 最大买入次数: 50
[必填] 最大卖出次数: 50
[可选] 触发价格: 【>100、<5】
[可选] 最大买入时终止: 【是、否】
[可选] 最大卖出时终止: 【是、否】`,
        example: `
策略名称：网格1号
交易所: 币安合约
交易对: btc
下单数量: 0.01
网格比例: 0.5%
最大买入次数: 50
最大卖出次数: 50
触发价格:
最大买入时终止:
最大卖出时终止:`,
    showMainParams: function(params) {
      const paramsObj = typeof params === 'string' ? JSON.parse(params) : params;
      return `${paramsObj.交易所} | ${paramsObj.交易对} | ${paramsObj.下单数量} | ${paramsObj.网格比例}% | ${paramsObj.最大买入次数}/${paramsObj.最大卖出次数}`;
    }
    },

    "网格2号": {
        description: "发散型网格抵御单边风险", 
        template: `
策略名称：网格2号
[必填] 交易所: 【币安合约、Gate合约】
[必填] 交易对: 【BTC、eth、1000shib】
[必填] 基础比例: 0.5%
[必填] 递增比例: 0.5%
[必填] 下单数量: 0.01
[必填] 递增数量: 0.01
[必填] 递增数量: 0.01
[必填] 最大持仓数量: 50
[可选] 触发价格: 【>100、<5】
[可选] 最大买入时终止: 【是、否】
[可选] 最大卖出时终止: 【是、否】`,
        example: `
策略名称：网格2号
交易所: 币安合约
交易对: sol
基础比例: 0.5%
递增比例: 0.1%
下单数量: 0.5
递增数量: 0.1
最大持仓数量: 10
触发价格:
最大买入时终止:
最大卖出时终止:`,
        showMainParams: function(params) {
          const paramsObj = typeof params ==='string'? JSON.parse(params) : params;
          return `${paramsObj.交易所} | ${paramsObj.交易对} | ${paramsObj.基础比例}% | ${paramsObj.递增比例}% | ${paramsObj.下单数量} | ${paramsObj.最大持仓数量}`;
        }


    },
    "马丁1号": {
        description: "马丁格尔加仓倍投",
        template: `
策略名称：马丁1号
[必填] 交易所: 【币安合约、Gate合约】
[必填] 交易对: 【BTC、eth、1000shib】
[必填] 方向: 【多、空】
[必填] 下单价值: 0.01
[必填] 加仓触发比例: 5%
[必填] 加仓乘数: 1.5
[必填] 平仓触发比例: 10%
[可选] 启动触发价格: 【>100、<5】
[可选] 开仓触发比例: 2%`,
        example: `
策略名称：马丁1号
交易所: 币安合约
交易对: eth
方向: 多
下单价值: 100
加仓触发比例: 5%
加仓乘数: 1.5
平仓触发比例: 10%
启动触发价格:
开仓触发比例:`,
        showMainParams: function(params) {
          const paramsObj = typeof params ==='string'? JSON.parse(params) : params;
          return `${paramsObj.交易所} | ${paramsObj.交易对} | ${paramsObj.方向} | ${paramsObj.下单价值} | ${paramsObj.加仓触发比例}% | ${paramsObj.加仓乘数} | ${paramsObj.平仓触发比例}%`;
        }
    },
    "对冲1号": {
        description: "等额对冲多强空弱",
        template: `
策略名称：对冲1号
[必填] 交易所: 【币安合约、Gate合约】
[必填] 多头交易对: 【BTC、eth、1000shib】
[必填] 空头交易对: 【BTC、eth、1000shib】
[必填] 对冲价值: 500
[必填] 止盈参数: 3%,20%;6%,50%;10%,100%
[可选] 加仓参数: 2%,500;4%,1000;10%,1000
[可选] 回调触发比例: 2%`,
        example: `
策略名称：对冲1号
交易所: 币安合约
多头交易对: eth
空头交易对: btc
对冲价值: 500
止盈参数: 3%,20%;6%,50%;10%,100%
加仓参数: 2%,500;4%,1000;10%,1000 
回调触发比例:`,
        showMainParams: function(params) {
          const paramsObj = typeof params ==='string'? JSON.parse(params) : params;
          return `${paramsObj.交易所} | ${paramsObj.多头交易对} | ${paramsObj.空头交易对} | ${paramsObj.对冲价值} | ${paramsObj.止盈参数}`;
        }
    },

}

module.exports = {
  STATUS_MAP,
  STRATEGY
}; 