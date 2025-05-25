const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize } = format;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 从.env获取日志级别，默认为info
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// 创建日志目录
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 自定义日志格式
const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// 日志文件名格式（按日期）
const getLogFileName = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.log`;
};

// 清理旧日志文件（只保留最近5天）
const cleanOldLogs = () => {
  const files = fs.readdirSync(logDir);
  if (files.length <= 5) return;
  
  const logFiles = files
    .filter(file => file.endsWith('.log'))
    .map(file => ({
      name: file,
      time: fs.statSync(path.join(logDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // 按修改时间排序（降序）
  
  // 删除旧的日志文件（保留最新的5个）
  logFiles.slice(5).forEach(file => {
    fs.unlinkSync(path.join(logDir, file.name));
    console.log(`已删除旧日志文件: ${file.name}`);
  });
};

// 创建日志实例
const logger = createLogger({
  level: LOG_LEVEL,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    myFormat
  ),
  transports: [
    // 控制台输出
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        myFormat
      )
    }),
    // 文件输出
    new transports.File({
      filename: path.join(logDir, getLogFileName()),
      maxsize: 5242880, // 5MB
    })
  ]
});

// 每天凌晨更新日志文件名并清理旧日志
const scheduleLogRotation = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const timeUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    // 更新文件传输对象使用新的日志文件
    logger.transports.forEach(transport => {
      if (transport instanceof winston.transports.File) {
        transport.filename = path.join(logDir, getLogFileName());
      }
    });
    
    // 清理旧日志
    cleanOldLogs();
    
    // 记录日志轮转信息
    logger.info('日志文件已轮转');
    
    // 递归调用以设置下一天的轮转
    scheduleLogRotation();
  }, timeUntilMidnight);
};

// 初始清理和设置日志轮转
cleanOldLogs();
scheduleLogRotation();

// 记录日志系统启动信息
logger.info(`日志系统已启动，日志级别: ${LOG_LEVEL}`);

module.exports = logger;