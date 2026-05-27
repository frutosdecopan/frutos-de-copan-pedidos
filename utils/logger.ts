/**
 * Logger Utility - Reemplaza console.log en producción
 * Mantiene logs detallados en desarrollo, filtra en producción
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogData {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private isDev = import.meta.env.DEV;
  
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const dataStr = data ? ' ' + JSON.stringify(data) : '';
    return `${prefix} ${message}${dataStr}`;
  }

  debug(message: string, data?: any) {
    if (this.isDev) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }
  
  info(message: string, data?: any) {
    if (this.isDev) {
      console.info(this.formatMessage('info', message, data));
    }
  }
  
  warn(message: string, data?: any) {
    // Warn siempre se muestra, incluso en producción
    const logData: LogData = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      data
    };
    console.warn(this.formatMessage('warn', message, data));
    
    // En producción, podrías enviar a un servicio de monitoreo
    if (!this.isDev) {
      this.sendToMonitoring(logData);
    }
  }
  
  error(message: string, error?: any) {
    // Error siempre se muestra, incluso en producción
    const logData: LogData = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      data: error
    };
    console.error(this.formatMessage('error', message), error);
    
    // En producción, podrías enviar a un servicio de monitoreo
    if (!this.isDev) {
      this.sendToMonitoring(logData);
    }
  }
  
  private sendToMonitoring(logData: LogData) {
    // Placeholder para envío a servicio de monitoreo (Sentry, LogRocket, etc.)
    // En el futuro, integrar con un servicio real
    try {
      // Ejemplo: enviar a endpoint de logging
      // fetch('/api/log', { method: 'POST', body: JSON.stringify(logData) });
    } catch (e) {
      // Silenciar errores en el logger para evitar loops
    }
  }
}

export const logger = new Logger();
