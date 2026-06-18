/** Edge Runtime 兼容的日志模块 — 不支持 fs 的环境回落为仅控制台输出 */

let hasFs = true;
let fs: any, path: any;
let LOG_FILE = '';
try {
  fs = require('fs');
  path = require('path');
  LOG_FILE = path.join(process.cwd(), 'data', 'logs', 'app.log');
} catch {
  hasFs = false;
}

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  time: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

const RESET = '\x1b[0m';
const COLORS: Record<LogLevel, string> = {
  [LogLevel.INFO]: '\x1b[36m',
  [LogLevel.WARN]: '\x1b[33m',
  [LogLevel.ERROR]: '\x1b[31m',
};

function formatTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds())}`;
}

function writeToFile(entry: LogEntry): void {
  if (!hasFs) return;
  try {
    const line = JSON.stringify(entry) + '\n';
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line, 'utf-8');
  } catch { /* silent */ }
}

function log(level: LogLevel, module: string, message: string, data?: unknown): void {
  const time = formatTime();
  const entry: LogEntry = { time, level, module, message };
  if (data !== undefined) entry.data = data;

  const prefix = `${COLORS[level]}[${time}] [${level}] [${module}]${RESET}`;
  if (level === LogLevel.ERROR) {
    console.error(`${prefix} ${message}`, data ?? '');
  } else if (level === LogLevel.WARN) {
    console.warn(`${prefix} ${message}`, data ?? '');
  } else {
    console.log(`${prefix} ${message}`, data ?? '');
  }

  writeToFile(entry);
}

export const logger = {
  info: (module: string, message: string, data?: unknown) => log(LogLevel.INFO, module, message, data),
  warn: (module: string, message: string, data?: unknown) => log(LogLevel.WARN, module, message, data),
  error: (module: string, message: string, data?: unknown) => log(LogLevel.ERROR, module, message, data),
};
