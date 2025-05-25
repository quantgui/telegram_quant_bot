const axios = require("axios");
const logger = require('../../utils/logger');
const dotenv = require("dotenv");
const path = require("path");

// 加载环境变量 - 使用path确保从项目根目录加载
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 配置 API 基本 URL
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:8000";
logger.info("API_BASE_URL:", API_BASE_URL);

// 请求配置
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    }
});

// 错误处理中间件
axiosInstance.interceptors.response.use(
    response => response,
    error => {
        logger.error(`API请求失败: ${error.message}`);
        if (error.response) {
            logger.error(`状态码: ${error.response.status}, 数据: ${JSON.stringify(error.response.data)}`);
        }
        return Promise.reject(error);
    }
);

class BackendAPI {
    // 用户注册
    static async register(userData) {
        try {
            logger.info(`注册用户: ${JSON.stringify(userData)}`);
            const response = await axiosInstance.post("/api/v1/user/register", userData);
            logger.info(`用户注册成功: ${userData.telegram_id}`);
            return response.data;
        } catch (error) {
            logger.error(`用户注册失败: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // 查询用户是否已添加交易所API密钥
    static async get_member_exchange_api(telegramId) {
        try {
            const response = await axiosInstance.get("/api/v1/exchange-apis", {
                params: { telegram_id: telegramId }
            });

            logger.debug(`获取到交易所API信息: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            logger.error(`获取交易所API信息失败: ${error.message}`);
            return null;
        }
    }

    // 创建策略任务
    static async create_strategy_task(taskData) {
        try {
            logger.info(`创建策略任务: ${taskData.strategy_name} 用户ID: ${taskData.telegram_id}`);
            logger.debug(`任务参数: ${taskData.params}`);

            const response = await axiosInstance.post("/api/v1/strategies", taskData);

            logger.info(`响应result: ${JSON.stringify(response.data)}`);
            return {code: 0, data: response.data};
        } catch (error) {
            logger.error(`创建策略任务失败: ${error.message}`);
            return {
                code: -1,
                data: null,
                msg: error.message
            };
        }
    }

    // 查询用户的所有任务
    static async get_strategy_task_list(telegramId, statusList = [-1, 1, -2, 2, -3]) {
        try {
            logger.info(`查询用户 ${telegramId} 正在执行的所有策略任务`);

            const response = await axiosInstance.get("/api/v1/strategies/list", {
                params: {
                    status_list: statusList.join(','),
                    telegram_id: telegramId,
                }
            });

            logger.debug(`获取到 ${response.data?.data?.length || 0} 个任务`);
            return {code: 0, data: response.data};
        } catch (error) {
            logger.error(`获取策略任务列表失败: ${error.message}`);
            return {
                code: -1,
                data: [],
                msg: error.message
            };
        }
    }

    // 更新任务状态
    static async update_strategy_task_status(taskId, status) {
        try {
            logger.info(`更新任务 ${taskId} 状态为 ${status}`);

            const response = await axiosInstance.post("/strategies/update", {
                task_id: taskId,
                status: status
            });

            logger.info(`任务状态更新成功: ${JSON.stringify(response.data)}`);
            return {code: 0, data: response.data};
        } catch (error) {
            logger.error(`更新任务状态失败: ${error.message}`);
            return {
                code: -1,
                data: 0,
                msg: error.message
            };
        }
    }

    // 获取单个任务详情
    static async get_strategy_task_detail(taskId) {
        try {
            logger.info(`获取任务 ${taskId} 详情`);

            const response = await axiosInstance.get("/api/telegram/strategy-task/get", {
                params: { task_id : taskId }
            });

            logger.debug(`获取到任务详情: ${JSON.stringify(response.data)}`);
            return {code: 0, data: response.data};
        } catch (error) {
            logger.error(`获取任务详情失败: ${error.message}`);
            return {
                code: -1,
                data: null,
                msg: error.message
            };
        }
    }
}

module.exports = BackendAPI; 