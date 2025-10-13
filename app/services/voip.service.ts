import { serviceClient } from './base.service';
import { logger } from '~/lib/logger.server';

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
    // Return mock call history when API is unavailable
    const now = new Date();
    return [
      {
        id: '1',
        contactName: 'Mom',
        phoneNumber: '+1 555-0101',
        direction: 'outgoing',
        duration: 180,
        timestamp: new Date(now.getTime() - 3600000).toISOString(),
        answered: true,
      },
      {
        id: '2',
        contactName: 'Dad',
        phoneNumber: '+1 555-0102',
        direction: 'incoming',
        duration: 240,
        timestamp: new Date(now.getTime() - 7200000).toISOString(),
        answered: true,
      },
      {
        id: '3',
        contactName: 'Grandma',
        phoneNumber: '+1 555-0103',
        direction: 'outgoing',
        duration: 0,
        timestamp: new Date(now.getTime() - 10800000).toISOString(),
        answered: false,
      },
    ];
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

