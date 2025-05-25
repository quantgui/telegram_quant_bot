const { Bot, Keyboard, InlineKeyboard, GrammyError, HttpError } = require("grammy");
const fs = require("fs");
const path = require("path");
const { SocksProxyAgent } = require("socks-proxy-agent");
const dotenv = require('dotenv');
const userStateManager = require("./models/UserState")
const newCommand = require('./commands/new');
const listCommand = require('./commands/list');
const logger = require('./utils/logger');
// 加载环境变量
dotenv.config();


// 环境变量
const BOT_TOKEN = process.env.BOT_TOKEN;
const USE_PROXY = process.env.USE_PROXY === "true";
const PROXY_HOST = process.env.PROXY_HOST;
const PROXY_PORT = process.env.PROXY_PORT;
const PROXY_TYPE = process.env.PROXY_TYPE;


// 创建代理客户端(如果启用)
let client = undefined;
if (USE_PROXY) {
  const proxyUrl = `${PROXY_TYPE}://${PROXY_HOST}:${PROXY_PORT}`;
  logger.info(`使用代理: ${proxyUrl}`);
  client = {
    baseFetchConfig: {
      agent: new SocksProxyAgent(proxyUrl),
    },
  };
}

const bot = new Bot(BOT_TOKEN, { client });
logger.info("机器人实例已创建");


// 注册命令处理器
const registerCommands = async () => {
    try {
        // 动态导入命令
        const commandsPath = path.join(__dirname, "commands");
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

        // 收集所有命令和描述
        const commands = [];
        for (const file of commandFiles) {
            const commandName = file.split(".")[0];
            const command = require(path.join(commandsPath, file));
            
            // 注册命令处理器
            bot.command(commandName, command.handler);
            logger.info(`已注册命令处理器: /${commandName}`);

            // 收集命令描述
            if (command.description) {
                commands.push({
                    command: commandName,
                    description: command.description
                });
            }
        }

        // 设置机器人命令列表
        if (commands.length > 0) {
            await bot.api.setMyCommands(commands);
            logger.info(`已设置 ${commands.length} 个命令到命令列表`);
        }
    } catch (error) {
        logger.error("注册命令失败:", error);
        throw error; // 向上传播错误
    }
};

// 错误处理中间件
const handleError = (err) => {
    const ctx = err.ctx;
    logger.error(`处理更新 ${ctx.update.update_id} 时发生错误:`);
    logger.error(err);

    if (err instanceof GrammyError) {
        logger.error("Telegram API 错误:", err.description);
    } else if (err instanceof HttpError) {
        logger.error("网络错误:", err.error);
    } else {
        logger.error("未知错误:", err);
    }
};

// 启动机器人
const startBot = async () => {
    try {
        // 启动用户状态清理定时器
        userStateManager.startCleanupInterval();

        // 注册命令处理器
        await registerCommands();

        // 注册策略创建相关的回调处理器
        bot.callbackQuery(/^show_template:(.+)$/, newCommand.handleTemplateShow);
        bot.callbackQuery("strategy_confirm", newCommand.handleStrategyConfirm);
        bot.callbackQuery("strategy_cancel", newCommand.handleStrategyCancel);
        bot.on("message:text", newCommand.handleParameterInput);

        // 注册任务列表相关的回调处理器
        bot.callbackQuery(/^task_details_(\d+)$/, listCommand.handleTaskDetails);
        bot.callbackQuery(/^pause_task_(\d+)$/, listCommand.handleTaskPause);
        bot.callbackQuery(/^run_task_(\d+)$/, listCommand.handleTaskStart);
        bot.callbackQuery(/^finish_task_(\d+)$/, listCommand.handleTaskFinish);
        bot.callbackQuery(/^(confirm|cancel)_terminate_(\d+)$/, listCommand.handleTerminateConfirmation);
        
        // 注册错误处理
        bot.catch(handleError);

        // 启动机器人
        await bot.start();
        logger.info("机器人已启动并开始轮询更新");
    } catch (error) {
        logger.error("启动机器人失败:", error);
        process.exit(1);
    }
};

// 主函数
const main = async () => {
    try {
        await startBot();
    } catch (error) {
        logger.error("程序启动失败:", error);
        process.exit(1);
    }
};

// 启动程序
main();

// 优雅退出
process.on('SIGTERM', () => {
    logger.info('收到 SIGTERM 信号，准备关闭程序...');
    bot.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('收到 SIGINT 信号，准备关闭程序...');
    bot.stop();
    process.exit(0);
});

