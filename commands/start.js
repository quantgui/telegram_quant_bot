/**
 * 处理 /start 命令
 */
const { register } = require('../api')
const logger = require('../utils/logger');
const dotenv = require('dotenv');
// 加载环境变量
dotenv.config();

const ADMIN = process.env.ADMIN;

module.exports = {
  description: "开始使用机器人",
  handler: async (ctx) => {
    const userName = ctx.from.first_name;
    const userId = ctx.from.id;
    
    logger.info(`用户 ${userName} (ID: ${userId}) 开始使用机器人`);

    const user = {
      telegram_id: String(ctx.from.id),
      username: ctx.from.username || "未设置用户名",
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
    };

    // 调用API注册用户
    await register(user);
    
    // 发送欢迎消息
    await ctx.reply(
      `用户信息：名称【@${user.username}】, 电报编号【${user.telegram_id}】\n激活使用请联系管理员 ${ADMIN}\n如已激活，请忽略。\n\n` +
      `🤖 可用指令:\n` +
      `/new - 快速创建策略任务\n` +
      `/list - 查看当前执行的任务\n` +
      `/help - 查看帮助信息`
    );

  }
}; 
 