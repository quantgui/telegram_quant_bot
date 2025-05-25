/**
 * 处理 /list 命令
 */
const { InlineKeyboard } = require("grammy");
const { getExchangeApi, getStrategyTaskList } = require('../api');
const { STATUS_MAP, STRATEGY } = require('../models/Strategy');
const userStateManager = require('../models/UserState');
const logger = require('../utils/logger');

// 处理 /list 命令
async function handleList(ctx) {
    const userId = String(ctx.from.id);
    logger.info(`用户 ${userId} 请求查看任务列表`);

    try {
        // 验证用户API Key
        const apiKeysResult = await getExchangeApi(userId);

        if (!Array.isArray(apiKeysResult) || apiKeysResult.length === 0) {
            await ctx.reply(
                "⚠️ 您尚未设置交易所API密钥，无法查看任务列表。\n" +
                "请先联系管理员设置API密钥"
            );
            return;
        }

        // 获取任务列表
        const taskList = await getStrategyTaskList(userId);

        if (!Array.isArray(taskList)) {
            await ctx.reply("⚠️ 策略任务加载失败，请检查网络或联系管理员");
            return;
        }

        if (taskList.length > 0) {
            await displayTaskList(ctx, taskList);
        } else {
            await ctx.reply("📭 您当前没有正在运行的策略任务。\n使用 /new 命令创建新策略。");
        }

    } catch (error) {
        logger.error(`获取任务列表失败: ${error.message}`);
        await ctx.reply("⚠️ 获取任务列表失败，请稍后重试");
    }
}

// 显示任务列表
async function displayTaskList(ctx, tasks) {
    let message = `📋 <b>您的策略任务列表</b> (共${tasks.length}个):\n\n`;
    const keyboard = new InlineKeyboard();

    // 保存任务数据到用户状态
    const userId = String(ctx.from.id);
    const userState = userStateManager.getState(userId) || {};
    userState.taskList = {};

    // 处理每个任务
    for (const task of tasks) {
        const strategyName = task.strategy_name;
        userState.taskList[task.id] = { task, strategyName };

        // 添加任务信息
        message += formatTaskInfo(task);
        
        // 添加操作按钮
        addTaskButtons(keyboard, task);
        1
        message += '\n';
    }

    // 更新用户状态
    userStateManager.updateState(userId, userState);

    // 发送消息
    await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
    });
}

// 处理任务详情展开
async function handleTaskDetails(ctx) {
    const userId = ctx.from.id;
    const taskId = ctx.match[1];
    
    try {
        const userState = userStateManager.getState(userId);
        if (!userState?.taskList?.[taskId]) {
            await ctx.answerCallbackQuery("❌ 任务数据不存在，请重新执行 /list 命令");
            return;
        }
        
        const { task, strategyType } = userState.taskList[taskId];
        await ctx.answerCallbackQuery("正在展示详情...");
        
        // 解析参数
        const params = typeof task.params === 'string' ? JSON.parse(task.params) : task.params;
        
        // 创建详情消息
        const detailMessage = formatTaskDetails(task, strategyType, params);
        
        // 创建操作按键盘
        const keyboard = createTaskOperationKeyboard(task);
        
        await ctx.reply(detailMessage, {
            parse_mode: "HTML",
            reply_markup: keyboard
        });
    } catch (error) {
        logger.error(`展示任务 ${taskId} 详情时出错: ${error.message}`);
        await ctx.answerCallbackQuery("❌ 展示详情时出错");
    }
}

// 处理任务暂停
async function handleTaskPause(ctx) {
    const userId = ctx.from.id;
    const taskId = ctx.match[1];
    
    logger.info(`用户 ${userId} 请求暂停任务 ${taskId}`);
    
    try {
        await ctx.answerCallbackQuery("正在暂停任务...");
        const result = await api.updateStrategyTaskStatus(taskId, -2);
        
        if (result.code === 0) {
            await ctx.reply(`✅ 任务 #${taskId} 已成功暂停`);
        } else {
            await ctx.reply(`❌ 暂停任务失败: ${result.msg || '未知错误'}`);
            logger.error(`暂停任务 ${taskId} 失败: ${result.msg}`);
        }
    } catch (error) {
        logger.error(`暂停任务 ${taskId} 时出错: ${error.message}`);
        await ctx.reply(`❌ 操作失败: ${error.message}`);
    }
}

// 处理任务启动
async function handleTaskStart(ctx) {
    const userId = ctx.from.id;
    const taskId = ctx.match[1];
    
    logger.info(`用户 ${userId} 请求启动任务 ${taskId}`);
    
    try {
        await ctx.answerCallbackQuery("正在启动任务...");
        const result = await api.updateStrategyTaskStatus(taskId, -1);
        
        if (result.code === 0) {
            await ctx.reply(`✅ 任务 #${taskId} 已成功启动`);
        } else {
            await ctx.reply(`❌ 启动任务失败: ${result.msg || '未知错误'}`);
            logger.error(`启动任务 ${taskId} 失败: ${result.msg}`);
        }
    } catch (error) {
        logger.error(`启动任务 ${taskId} 时出错: ${error.message}`);
        await ctx.reply(`❌ 操作失败: ${error.message}`);
    }
}

// 处理任务终止
async function handleTaskFinish(ctx) {
    const userId = ctx.from.id;
    const taskId = ctx.match[1];
    
    logger.info(`用户 ${userId} 通过按钮请求终止任务 ${taskId}`);
    
    try {
        await ctx.answerCallbackQuery("请确认终止操作");
        
        const confirmKeyboard = new InlineKeyboard()
            .text("✅ 确认终止", `confirm_terminate_${taskId}`)
            .text("❌ 取消", `cancel_terminate_${taskId}`);
        
        await ctx.reply(
            `⚠️ 确认终止任务 #${taskId}?\n\n` +
            `终止后策略将停止运行，持仓将不会自动平仓，请手动处理持仓。\n` +
            `此操作不可撤销，请确认:`,
            { reply_markup: confirmKeyboard }
        );
    } catch (error) {
        logger.error(`处理终止任务 ${taskId} 请求时出错: ${error.message}`);
        await ctx.answerCallbackQuery("❌ 操作失败");
    }
}

// 处理终止确认/取消
async function handleTerminateConfirmation(ctx) {
    const userId = ctx.from.id;
    const action = ctx.match[1];
    const taskId = ctx.match[2];
    
    await ctx.answerCallbackQuery();
    
    if (action === "cancel") {
        await ctx.reply(`已取消终止任务 #${taskId}`);
        return;
    }
    
    try {
        const result = await api.updateStrategyTaskStatus(taskId, -3);
        
        if (result.code === 0) {
            await ctx.reply(`✅ 任务 #${taskId} 已成功终止\n请注意手动处理持仓`);
            logger.info(`任务 ${taskId} 已成功终止`);
        } else {
            await ctx.reply(`❌ 终止任务失败: ${result.msg || '未知错误'}`);
            logger.error(`终止任务失败: ${result.msg}`);
        }
    } catch (error) {
        logger.error(`终止任务出错: ${error.message}`);
        await ctx.reply(`❌ 终止任务时出现错误: ${error.message}`);
    }
}

// 辅助函数
function formatTaskInfo(task) {
    return `<b>【${task.id}】 【${task.strategy_name}】</b> ${STATUS_MAP[task.status] || '❓'} ` +
           `<b>创建时间:</b> ${new Date(task.create_time).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
                }).replace(/\//g, '-')}\n` + 
           `<b>参数:</b> ${STRATEGY[task.strategy_name]?.showMainParams?.(task.params) ?? '参数解析失败'}\n`;
}


function createTaskOperationKeyboard(task) {
    const keyboard = new InlineKeyboard();
    
    switch (task.status.toString()) {
        case '1':
        case '-1':
            keyboard.text("⏸️ 暂停", `pause_task_${task.id}`)
                   .text("⏹️ 终止", `finish_task_${task.id}`);
            break;
        case '-2':
        case '2':
            keyboard.text("▶️ 启动", `run_task_${task.id}`)
                   .text("⏹️ 终止", `finish_task_${task.id}`);
            break;
    }
    
    return keyboard;
}

function addTaskButtons(keyboard, task) {
    let taskButtons = [`详情#${task.id}:task_details_${task.id}`];
    
    switch (task.status.toString()) {
        case '1':
        case '-1':
            taskButtons.push(`暂停#${task.id}:pause_task_${task.id}`);
            taskButtons.push(`终止#${task.id}:finish_task_${task.id}`);
            break;
        case '-2':
        case '2':
            taskButtons.push(`启动#${task.id}:run_task_${task.id}`);
            taskButtons.push(`终止#${task.id}:finish_task_${task.id}`);
            break;
    }
    
    // 添加按钮到键盘（每行最多3个按钮）
    const buttonsPerRow = 3;
    for (let j = 0; j < taskButtons.length; j += buttonsPerRow) {
        keyboard.row();
        const rowButtons = taskButtons.slice(j, j + buttonsPerRow);
        rowButtons.forEach(button => {
            const [text, callback] = button.split(':');
            keyboard.text(text, callback);
        });
    }
}

module.exports = {
    description: "查看当前执行的任务",
    handler: handleList,
    // 导出回调处理函数
    handleTaskDetails,
    handleTaskPause,
    handleTaskStart,
    handleTaskFinish,
    handleTerminateConfirmation
};

