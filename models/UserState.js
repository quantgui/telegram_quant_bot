const logger = require('../utils/logger');

// 用户状态管理
class UserStateManager {
    constructor() {
        this.states = {};
        this.USER_STATE_TIMEOUT = 30 * 60 * 1000; // 30分钟超时
    }

    // 更新用户状态
    updateState(userId, newState) {
        this.states[userId] = {
            ...newState,
            lastActivity: Date.now()
        };
        logger.debug(`更新用户 ${userId} 状态: ${JSON.stringify(newState)}`);
    }

    // 获取用户状态
    getState(userId) {
        const state = this.states[userId];
        if (state) {
            state.lastActivity = Date.now();
            return state;
        }
        return null;
    }

    // 删除用户状态
    deleteState(userId) {
        delete this.states[userId];
        logger.debug(`删除用户 ${userId} 状态`);
    }

    // 验证用户状态
    validateState(userId, command) {
        const state = this.getState(userId);
        if (!state) return false;
        if (state.command !== command) return false;
        return true;
    }

    // 清理过期状态
    cleanupExpiredStates() {
        const now = Date.now();
        let cleanCount = 0;
        
        Object.keys(this.states).forEach(userId => {
            if (now - this.states[userId].lastActivity > this.USER_STATE_TIMEOUT) {
                this.deleteState(userId);
                cleanCount++;
            }
        });
        
        if (cleanCount > 0) {
            logger.info(`已清理 ${cleanCount} 个过期用户状态`);
        }
    }

    // 启动定期清理
    startCleanupInterval() {
        setInterval(() => this.cleanupExpiredStates(), 10 * 60 * 1000); // 每10分钟清理一次
        logger.info('用户状态清理定时器已启动');
    }
}

// 创建单例实例
const userStateManager = new UserStateManager();

module.exports = userStateManager; 