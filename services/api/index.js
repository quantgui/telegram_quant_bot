const BackendAPI = require('./backend');

// 导出所有API方法
module.exports = {
    // 用户相关
    register: BackendAPI.register,
    get_member_exchange_api: BackendAPI.get_member_exchange_api,

    // 策略相关
    create_strategy_task: BackendAPI.create_strategy_task,
    get_strategy_task_list: BackendAPI.get_strategy_task_list,
    update_strategy_task_status: BackendAPI.update_strategy_task_status,
    get_strategy_task_detail: BackendAPI.get_strategy_task_detail
}; 