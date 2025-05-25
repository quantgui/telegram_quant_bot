const axios = require("axios");
const logger = require('./utils/logger');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 创建API实例
const api = axios.create({
    baseURL: process.env.API_BASE_URL,
    timeout: process.env.API_TIMEOUT || 10000,
    headers: {
        "Content-Type": "application/json",
    }
});

// 错误处理中间件
api.interceptors.response.use(
    response => response.data,
    error => {
        logger.error(`API请求失败: ${error.message}`);
        return Promise.reject(error);
    }
);

// API方法封装
module.exports = {
    // 用户相关
    register: (userData) => api.post("/api/v1/user/register", userData),

    getExchangeApi: (telegramId) => api.get("/api/v1/exchange-apis", { params: { telegram_id: telegramId } }),

    // 策略相关
    createStrategyTask: (taskData) => api.post("/api/v1/strategy/create", taskData),

    getStrategyTaskList: (telegramId, statusList = [-1, 1, -2, 2, -3]) => 
        api.get("/api/v1/strategy/list", {
            params: {
                status_list: statusList.join(','),
                telegram_id: telegramId,
            }
        }),
    
    updateStrategyTaskStatus: (taskId, status) => 
        api.post("/api/v1/strategy/update", { task_id: taskId, status: status }),

    getStrategyTaskDetail: (taskId) => 
        api.get("/api/telegram/strategy/get", { params: { task_id: taskId } })
    
}; 
