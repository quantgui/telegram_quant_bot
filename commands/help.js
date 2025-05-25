/**
 * 处理 /help 命令
 */
const fs = require("fs");
const path = require("path");
const logger = require('../utils/logger');
const dotenv = require('dotenv');
// 加载环境变量
dotenv.config();

const ADMIN = process.env.ADMIN;

module.exports = {
  description: "显示帮助信息",
  handler: async (ctx) => {
    const userName = ctx.from.first_name;
    const userId = String(ctx.from.id);

    logger.info(`用户 ${userName} (ID: ${userId}) 请求帮助信息`);

    // 动态读取所有命令及其描述
    const commandsPath = path.join(__dirname);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

    let helpText = "🤖 量化交易机器人使用帮助\n\n📝 基本命令：\n";

    // 添加每个命令的描述
    for (const file of commandFiles) {
      const commandName = file.split(".")[0];
      const { description } = require(path.join(commandsPath, file));
      if (description) {
        helpText += `/${commandName} - ${description}\n`;
      }
    }

    helpText += `\n❗️ 注意事项：
- 首次使用需要联系管理员配置API
- 请确保账户有足够的资金
- 建议先小额测试策略

🔧 遇到问题？
请联系管理员 ${ADMIN} 获取帮助。
`;

    await ctx.reply(helpText, { parse_mode: "Markdown" });
    logger.debug(`已发送帮助信息给用户 ${userName}`);
  }
};
