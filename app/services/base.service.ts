import { logger } from '~/lib/logger.server';

export class DeviceServiceClient {
  private baseUrl: string;
  private authToken?: string;

  constructor() {
    this.baseUrl = process.env.SERVICE_BASE_URL || 'http://localhost:5000/api';
    this.authToken = process.env.SERVICE_TOKEN;
  }

  async get<T>(endpoint: string): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      // Only log as error if it's not a connection refused (expected in dev mode)
      if (error.cause?.code === 'ECONNREFUSED') {
        logger.debug(`GET ${endpoint} - API unavailable (connection refused)`);
      } else {
        logger.error(`GET ${endpoint} failed`, error);
      }
      throw error;
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      // Only log as error if it's not a connection refused (expected in dev mode)
      if (error.cause?.code === 'ECONNREFUSED') {
        logger.debug(`POST ${endpoint} - API unavailable (connection refused)`);
      } else {
        logger.error(`POST ${endpoint} failed`, error);
      }
      throw error;
    }
  }

  async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      // Only log as error if it's not a connection refused (expected in dev mode)
      if (error.cause?.code === 'ECONNREFUSED') {
        logger.debug(`DELETE ${endpoint} - API unavailable (connection refused)`);
      } else {
        logger.error(`DELETE ${endpoint} failed`, error);
      }
      throw error;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['X-Dashboard-Token'] = this.authToken;
    }

    return headers;
  }
}

export const serviceClient = new DeviceServiceClient();

