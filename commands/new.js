const { InlineKeyboard } = require("grammy");
// const api = require('../services/api');
const { getExchangeApi, createStrategyTask } = require('../api')
const logger = require('../utils/logger');
const { STRATEGY } = require('../models/Strategy');
const userStateManager = require('../models/UserState');
const dotenv = require('dotenv');
// 加载环境变量
dotenv.config();

const ADMIN = process.env.ADMIN;

// 处理 /new 命令
async function handleNew(ctx) {
    const userId = String(ctx.from.id);
    logger.info(`用户 ${userId} 开始创建策略`);

    try {
        // 验证用户API Key
        const apiKeysResult = await getExchangeApi(userId);

        if (!Array.isArray(apiKeysResult) || apiKeysResult.length === 0) {
            await ctx.reply(
                "⚠️ 您尚未设置交易所API密钥，无法创建策略。\n" +
                `请先联系管理员 ${ADMIN}设置API密钥`
            );
            return;
        }
        
        // 创建策略选择键盘
        const kbd = new InlineKeyboard();
        
        // 显示所有可用策略及其描述
        Object.entries(STRATEGY).forEach(([name, strategy]) => {
            kbd.text(`${name} - ${strategy.description}`, `show_template:${name}`).row();
        });

        await ctx.reply(
            "📋 请选择策略模板：",
            { reply_markup: kbd }
        );

        userStateManager.updateState(userId, { 
            command: "strategy_create",
            step: "template_selection"
        });
        
        logger.info(`已向用户 ${userId} 发送策略模板选择界面`);
    } catch (error) {
        logger.error(`创建策略流程出错: ${error.message}`);
        await ctx.reply(`⚠️ 操作失败，请稍后重试或联系管理员 ${ADMIN}`);
    }
}

// 处理模板展示回调
async function handleTemplateShow(ctx) {
    const userId = ctx.from.id;
    const templateName = ctx.match[1];
    
    try {
        const strategy = STRATEGY[templateName];
        if (!strategy) {
            await ctx.answerCallbackQuery("找不到所选模板，请重新选择");
            return;
        }

        // 创建复制按钮
        const keyboard = new InlineKeyboard()
            .switchInlineCurrent("📋 复制示例到输入框", strategy.example);

        // 显示模板详情
        await ctx.editMessageText(
            `📝 <b>${templateName}</b>\n` +
            '━━━━━━━━━━━━━━━━\n' +
            '<b>策略参数说明：</b>\n' +
            `${strategy.template
                .replace(/</g, '&lt;')  // 转义所有左尖括号
                .replace(/>/g, '&gt;')  // 转义所有右尖括号
                .replace(/(\n)/g, '\n│ ')}\n\n` + 
            '⚙️ <b>参数规则：</b>\n' +
            '• [必填] 必须填写参数\n' +
            '• [可选] 可留空或删除\n' +
            '• 方头括号内为参考输入内容\n\n' +
            '✨ 点击下方按钮复制示例模板，修改参数后直接发送即可',
            {
                parse_mode: "HTML",
                reply_markup: keyboard
            }
        );

        userStateManager.updateState(userId, {
            command: "strategy_create",
            step: "awaiting_params",
            templateName: templateName
        });

        logger.info(`用户 ${userId} 查看了 ${templateName} 模板`);
    } catch (error) {
        logger.error(`处理模板展示出错: ${error.message}`);
        await ctx.answerCallbackQuery("加载模板时出错，请重试");
    }
}

// 处理参数输入
async function handleParameterInput(ctx) {
    const userId = ctx.from.id;
    if (!userStateManager.validateState(userId, "strategy_create")) return;
    
    const userState = userStateManager.getState(userId);
    if (userState.step !== "awaiting_params") return;

    const rawText = ctx.message.text;
    
    try {
        // 预处理输入，保留原始格式
        const params = rawText
            .replace(/@\w+/g, "")
            .replace(/：/g, ":")
            // 移除策略名称字段
            .replace(/^策略名称\s*:.*\n?/gm, '')
            // 过滤空值字段并保留换行符
            .split('\n')
            .filter(line => {
                const [, value] = line.split(':').map(s => s.trim());
                return value && value.length > 0;
            })
            .join('\n');
 
        
        // 更新用户状态中的参数
        userState.params = params;
        userStateManager.updateState(userId, userState);

        // 显示确认信息
        await sendConfirmation(ctx, params, userState.templateName);
    } catch (error) {
        logger.error(`[参数解析] ${error.stack}`);
        await ctx.reply(`⚠️ 系统解析异常，请检查格式或联系管理员 ${ADMIN}`);
    }
}

// 发送确认信息
async function sendConfirmation(ctx, params, templateName) {
    try {
        // 将参数转换为带序号的列表
        const paramsList = params.split('\n')
            .map(line => `➤ <b>${line.split(':')[0].trim()}</b>: <code>${line.split(':')[1].trim()}</code>`)
            .join('\n');

        const message = `
✅ <b>策略参数确认</b>
────────────────
${paramsList}

📝 <b>策略名称</b>: ${templateName}
────────────────
• 请仔细核对上方参数
• 错误参数可直接修改后重新发送
• 确认无误后点击下方按钮提交
`;

        const keyboard = new InlineKeyboard()
            .text("✅ 确认创建", "strategy_confirm")
            .text("❌ 取消创建", "strategy_cancel");

        await ctx.reply(message, {
            parse_mode: "HTML",
            reply_markup: keyboard
        });
        
        logger.debug(`已向用户 ${ctx.from.id} 发送确认信息`);
    } catch (error) {
        logger.error(`发送确认信息失败: ${error.message}`);
        await ctx.reply("⚠️ 显示确认信息时出错，请重试");
    }
}

// 处理策略确认
async function handleStrategyConfirm(ctx) {
    const userId = ctx.from.id;
    const userState = userStateManager.getState(userId);
    
    if (!userStateManager.validateState(userId, "strategy_create")) {
        await ctx.answerCallbackQuery("会话已过期，请重新开始");
        return;
    }
    
    try {
        await ctx.answerCallbackQuery("正在创建策略...");
        
        const params = userState.params;
        if (!params) {
            await ctx.reply("❌ 无效的参数数据，请重新开始");
            userStateManager.deleteState(userId);
            return;
        }

        const data = params
            .replace(/@\w+/g, "")
            .replace(/：/g, ":")
            .split('\n')
            .reduce((acc, line) => {
                const [key, value] = line.split(':').map(s => s.trim());
                if (key && value) acc[key] = value;
                return acc;
            }, {});
        // 创建策略任务
        const task = {
            strategy_name: userState.templateName,
            telegram_id: String(userId),
            params: JSON.stringify(data),  // 直接使用原始参数文本
            status: -1
        };
        
        logger.info(`创建策略任务: ${JSON.stringify(task)}`);
        const result = await createStrategyTask(task);

        if (result?.detail) {
            await ctx.reply(`❌ 策略创建失败，请联系管理员 ${ADMIN}！`);
            logger.error(`策略任务创建失败: ${result.detail}`);
        } else if (result?.id) {
            await ctx.reply(`✅ 策略创建成功！\n任务ID: ${result.id}\n\n使用 /list 命令查看任务状态`);
            logger.info(`策略任务创建成功，任务ID: ${result.id}`);
        } else {
            await ctx.reply(`❌ 服务器繁忙，请稍后再试`);
            logger.error(`策略任务创建失败，未知错误'}`);
        }
  
    } catch (error) {
        logger.error(`创建策略出错: ${error.message}`);
        await ctx.reply(`❌ 创建策略时出现错误: ${error.message}`);
    } finally {
        userStateManager.deleteState(userId);
    }
}

// 处理策略取消
async function handleStrategyCancel(ctx) {
    const userId = ctx.from.id;
    userStateManager.deleteState(userId);

    await ctx.reply("❌ 您已取消创建！", {
        reply_markup: { remove_keyboard: true }
    });

    logger.info(`用户 ${userId} 已取消策略创建`);
}

module.exports = {
    description: "创建新策略",
    handler: handleNew,
    handleTemplateShow,
    handleStrategyConfirm,
    handleStrategyCancel,
    handleParameterInput
};