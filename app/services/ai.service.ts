import { serviceClient } from './base.service';
import { logger } from '~/lib/logger.server';

export interface Conversation {
  id: string;
  timestamp: string;
  duration: number;
  summary: string;
}

export interface ConversationTranscript {
  messages: {
    role: 'child' | 'ai';
    content: string;
  }[];
}

export async function getConversations(date?: string): Promise<Conversation[]> {
  try {
    const endpoint = date ? `/ai/conversations?date=${date}` : '/ai/conversations';
    const conversations = await serviceClient.get<Conversation[]>(endpoint);
    return conversations;
  } catch (error) {
    logger.error('Failed to get conversations', error);
    return [];
  }
}

export async function getConversationTranscript(
  conversationId: string
): Promise<ConversationTranscript | null> {
  try {
    const transcript = await serviceClient.get<ConversationTranscript>(
      `/ai/conversation/${conversationId}/transcript`
    );
    return transcript;
  } catch (error) {
    logger.error('Failed to get conversation transcript', error);
    return null;
  }
}

