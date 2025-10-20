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
    logger.warn('AI API unavailable, using mock data', { endpoint: '/ai/conversations' });
    // Return mock conversations when API is unavailable
    const now = new Date();
    return [
      {
        id: '1',
        timestamp: new Date(now.getTime() - 3600000).toISOString(),
        duration: 180,
        summary: 'Asked about weather and favorite animals',
      },
      {
        id: '2',
        timestamp: new Date(now.getTime() - 7200000).toISOString(),
        duration: 120,
        summary: 'Story time about dinosaurs',
      },
    ];
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
    logger.warn('AI API unavailable, using mock data', { endpoint: `/ai/conversation/${conversationId}/transcript` });
    // Return mock transcript when API is unavailable
    return {
      messages: [
        {
          role: 'child',
          content: 'What\'s the weather like today?',
        },
        {
          role: 'ai',
          content: 'Today is sunny and warm! It\'s a great day to play outside.',
        },
        {
          role: 'child',
          content: 'Tell me about dinosaurs!',
        },
        {
          role: 'ai',
          content: 'Dinosaurs were amazing creatures that lived millions of years ago! Some were really big like the Brachiosaurus, and some were smaller like the Velociraptor.',
        },
      ],
    };
  }
}

