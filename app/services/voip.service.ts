import { serviceClient } from './base.service';
import { logger } from '~/lib/logger';

export interface CallHistoryEntry {
  id: string;
  contactName: string;
  phoneNumber: string;
  direction: 'incoming' | 'outgoing';
  duration: number; // seconds
  timestamp: string;
  answered: boolean;
}

export async function getCallHistory(limit: number = 50): Promise<CallHistoryEntry[]> {
  try {
    const history = await serviceClient.get<CallHistoryEntry[]>(
      `/voip/call-history?limit=${limit}`
    );
    return history;
  } catch (error) {
    logger.error('Failed to get call history', error);
    return [];
  }
}

export async function initiateCall(contactId: string): Promise<{ success: boolean }> {
  try {
    const result = await serviceClient.post<{ success: boolean }>('/voip/initiate-call', {
      contactId,
    });
    return result;
  } catch (error) {
    logger.error('Failed to initiate call', error);
    return { success: false };
  }
}

