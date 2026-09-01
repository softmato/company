import { NextResponse } from 'next/server';
import { defaultAiProvider } from '@/lib/ai/provider';
import { retrieveContext } from '@/lib/ai/retrieve-context';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { AI_TOOL_DEFINITIONS, executeTool } from '@/lib/ai/tools';
import type { ChatMessage, ToolExecutionResult } from '@/lib/ai/types';
import { allowBooking, allowTurn, callerAddress, hashAddress } from '@/lib/ai/chat-rate-limit';
import { formatToolResults } from '@/lib/ai/format-reply';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const caller = hashAddress(callerAddress(req));

    if (!allowTurn(caller)) {
      return NextResponse.json(
        { message: "you're going a bit fast for me — give me a moment and try again." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const messages: ChatMessage[] = body.messages || [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

    // Step 1: Lightweight Context Retrieval
    const retrievedContexts = await retrieveContext(lastUserMessage, 3);

    // Step 2: Build System Prompt
    const systemPrompt = buildSystemPrompt(retrievedContexts);

    // Step 3: Send query to AI Provider
    const aiResponse = await defaultAiProvider.chat({
      messages,
      systemPrompt,
      context: retrievedContexts,
      tools: AI_TOOL_DEFINITIONS,
    });

    const executedToolResults: ToolExecutionResult[] = [];
    let finalMessage = aiResponse.message;

    // Step 4: Handle Tool/Function Calling if requested by LLM or Intent Engine
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      for (const toolCall of aiResponse.toolCalls) {
        // Booking is the one tool that sends mail, so it carries its own,
        // stricter budget on top of the per-turn limit.
        if (toolCall.function.name === 'book_meeting' && !allowBooking(caller)) {
          executedToolResults.push({
            toolName: 'book_meeting',
            success: false,
            error: 'You have booked several calls already. Reply here and a founder will sort the rest out directly.',
          });
          continue;
        }

        const result = await executeTool(toolCall.function.name, toolCall.function.arguments);
        executedToolResults.push(result);
      }

      const toolSummaries = formatToolResults(executedToolResults);

      if (finalMessage && !finalMessage.includes('Processing your request')) {
        finalMessage = `${finalMessage}\n\n${toolSummaries}`;
      } else {
        finalMessage = toolSummaries;
      }
    }

    return NextResponse.json({
      message: finalMessage,
      executedTools: executedToolResults,
      provider: aiResponse.providerName,
    });
  } catch (err) {
    console.error('[API /api/chat] Internal error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your AI request.' },
      { status: 500 }
    );
  }
}
