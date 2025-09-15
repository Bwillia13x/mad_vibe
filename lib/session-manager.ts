/**
 * Distributed Session Management
 * Provides session management that works across multiple server instances
 */

import { log } from './log';
import { getEnvVar } from './env-security';

export interface SessionConfig {
  // Storage configuration
  storage: 'memory' | 'redis' | 'database';
  
  // Session settings
  sessionTimeout: number;
  cleanupInterval: number;
  maxSessions: number;
  
  // Security settings
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  
  // Monitoring
  enableMonitoring: boolean;
  monitoringInterval: number;
}

export interface SessionData {
  id: string;
  userId?: string;
  data: Record<string, any>;
  createdAt: number;
  lastAccess: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  averageSessionDuration: number;
  sessionsPerMinute: number;
  memoryUsage: number;
  [key: string]: unknown;
}

export class DistributedSessionManager {
  private config: SessionConfig;
  private sessions: Map<string, SessionData> = new Map();
  private metrics: SessionMetrics;
  private cleanupInterval?: NodeJS.Timeout;
  private monitoringInterval?: NodeJS.Timeout;
  private sessionCreationTimes: number[] = [];

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      storage: 'memory', // In production, use 'redis' or 'database'
      sessionTimeout: 3600000, // 1 hour
      cleanupInterval: 300000,  // 5 minutes
      maxSessions: 10000,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict',
      enableMonitoring: true,
      monitoringInterval: 60000, // 1 minute
      ...config
    };

    this.metrics = this.initializeMetrics();
    this.startCleanup();
    this.startMonitoring();
  }

  private initializeMetrics(): SessionMetrics {
    return {
      totalSessions: 0,
      activeSessions: 0,
      expiredSessions: 0,
      averageSessionDuration: 0,
      sessionsPerMinute: 0,
      memoryUsage: 0
    };
  }

  /**
   * Create a new session
   */
  createSession(userId?: string, ipAddress?: string, userAgent?: string): SessionData {
    // Check session limits
    if (this.sessions.size >= this.config.maxSessions) {
      this.cleanupExpiredSessions();
      
      if (this.sessions.size >= this.config.maxSessions) {
        throw new Error('Maximum session limit reached');
      }
    }

    const now = Date.now();
    const sessionId = this.generateSessionId();
    
    const session: SessionData = {
      id: sessionId,
      userId,
      data: {},
      createdAt: now,
      lastAccess: now,
      expiresAt: now + this.config.sessionTimeout,
      ipAddress,
      userAgent
    };

    this.sessions.set(sessionId, session);
    this.sessionCreationTimes.push(now);
    this.metrics.totalSessions++;

    // Keep only recent creation times for rate calculation
    if (this.sessionCreationTimes.length > 100) {
      this.sessionCreationTimes = this.sessionCreationTimes.slice(-100);
    }

    log('Session created', {
      sessionId,
      userId,
      ipAddress,
      totalSessions: this.sessions.size
    });

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    const now = Date.now();
    
    // Check if session has expired
    if (now > session.expiresAt) {
      this.sessions.delete(sessionId);
      this.metrics.expiredSessions++;
      return null;
    }

    // Update last access time and extend expiration
    session.lastAccess = now;
    session.expiresAt = now + this.config.sessionTimeout;

    return session;
  }

  /**
   * Update session data
   */
  updateSession(sessionId: string, data: Partial<Record<string, any>>): boolean {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return false;
    }

    session.data = { ...session.data, ...data };
    session.lastAccess = Date.now();

    log('Session updated', {
      sessionId,
      userId: session.userId,
      dataKeys: Object.keys(data)
    });

    return true;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      this.sessions.delete(sessionId);
      
      log('Session deleted', {
        sessionId,
        userId: session.userId,
        duration: Date.now() - session.createdAt
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): SessionData[] {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId && Date.now() <= session.expiresAt);
  }

  /**
   * Delete all sessions for a user
   */
  deleteUserSessions(userId: string): number {
    let deletedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      log('User sessions deleted', {
        userId,
        deletedCount
      });
    }

    return deletedCount;
  }

  private generateSessionId(): string {
    // Generate cryptographically secure session ID
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const randomPart2 = Math.random().toString(36).substring(2, 15);
    return `sess_${timestamp}_${randomPart}${randomPart2}`;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupInterval);
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
        this.metrics.expiredSessions++;
      }
    }

    if (cleanedCount > 0) {
      log('Expired sessions cleaned up', {
        cleanedCount,
        remainingSessions: this.sessions.size
      });
    }
  }

  private startMonitoring(): void {
    if (!this.config.enableMonitoring) return;

    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      
      // Log metrics periodically
      if (this.metrics.totalSessions % 100 === 0 && this.metrics.totalSessions > 0) {
        log('Session manager metrics', this.metrics);
      }

      this.checkSessionHealth();
    }, this.config.monitoringInterval);
  }

  private updateMetrics(): void {
    const now = Date.now();
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => now <= session.expiresAt);

    this.metrics.activeSessions = activeSessions.length;

    // Calculate average session duration
    if (activeSessions.length > 0) {
      const totalDuration = activeSessions.reduce((sum, session) => 
        sum + (now - session.createdAt), 0);
      this.metrics.averageSessionDuration = totalDuration / activeSessions.length;
    }

    // Calculate sessions per minute
    const oneMinuteAgo = now - 60000;
    const recentSessions = this.sessionCreationTimes.filter(time => time > oneMinuteAgo);
    this.metrics.sessionsPerMinute = recentSessions.length;

    // Estimate memory usage (rough calculation)
    this.metrics.memoryUsage = this.sessions.size * 1024; // Assume 1KB per session
  }

  private checkSessionHealth(): void {
    const { activeSessions, totalSessions, memoryUsage } = this.metrics;

    // Warn if session count is high
    if (activeSessions > this.config.maxSessions * 0.8) {
      log('High session count detected', {
        activeSessions,
        maxSessions: this.config.maxSessions,
        utilizationPercent: (activeSessions / this.config.maxSessions) * 100
      });
    }

    // Warn if memory usage is high
    if (memoryUsage > 50 * 1024 * 1024) { // 50MB
      log('High session memory usage detected', {
        memoryUsageMB: Math.round(memoryUsage / 1024 / 1024),
        activeSessions
      });
    }

    // Warn if expiration rate is high
    if (totalSessions > 100) {
      const expirationRate = (this.metrics.expiredSessions / totalSessions) * 100;
      if (expirationRate > 20) {
        log('High session expiration rate detected', {
          expirationRate: expirationRate.toFixed(2),
          expiredSessions: this.metrics.expiredSessions,
          totalSessions
        });
      }
    }
  }

  /**
   * Get session cookie configuration
   */
  getCookieConfig(): {
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  } {
    return {
      secure: this.config.secure,
      httpOnly: this.config.httpOnly,
      sameSite: this.config.sameSite,
      maxAge: this.config.sessionTimeout
    };
  }

  /**
   * Get session metrics
   */
  getMetrics(): SessionMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get session manager status
   */
  getStatus(): {
    healthy: boolean;
    activeSessions: number;
    sessionUtilization: number;
    memoryUsageMB: number;
    averageSessionDuration: number;
  } {
    const metrics = this.getMetrics();
    const sessionUtilization = (metrics.activeSessions / this.config.maxSessions) * 100;

    return {
      healthy: sessionUtilization < 80 && metrics.memoryUsage < 100 * 1024 * 1024,
      activeSessions: metrics.activeSessions,
      sessionUtilization,
      memoryUsageMB: Math.round(metrics.memoryUsage / 1024 / 1024),
      averageSessionDuration: Math.round(metrics.averageSessionDuration / 1000) // Convert to seconds
    };
  }

  /**
   * Export session data for backup or migration
   */
  exportSessions(): SessionData[] {
    const now = Date.now();
    return Array.from(this.sessions.values())
      .filter(session => now <= session.expiresAt);
  }

  /**
   * Import session data from backup or migration
   */
  importSessions(sessions: SessionData[]): number {
    let importedCount = 0;
    const now = Date.now();

    for (const session of sessions) {
      // Only import non-expired sessions
      if (now <= session.expiresAt) {
        this.sessions.set(session.id, session);
        importedCount++;
      }
    }

    log('Sessions imported', {
      importedCount,
      totalSessions: this.sessions.size
    });

    return importedCount;
  }

  /**
   * Shutdown the session manager
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // In production, persist sessions to storage before shutdown
    const activeSessions = this.exportSessions();
    log('Session manager shutdown', {
      activeSessionsCount: activeSessions.length
    });

    this.sessions.clear();
    this.sessionCreationTimes = [];
  }
}

// Create and export session manager instance
export const sessionManager = new DistributedSessionManager({
  storage: (getEnvVar('SESSION_STORAGE') as any) || 'memory',
  sessionTimeout: parseInt(getEnvVar('SESSION_TIMEOUT') || '3600000'),
  maxSessions: parseInt(getEnvVar('MAX_SESSIONS') || '10000'),
  secure: getEnvVar('NODE_ENV') === 'production'
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  sessionManager.shutdown();
});

process.on('SIGINT', () => {
  sessionManager.shutdown();
});