import { parseBooking } from './parse-booking';
import type {
  AiProviderChatParams,
  AiProviderResponse,
  ChatMessage,
  ToolCall,
} from './types';

export interface AiProvider {
  name: string;
  chat(params: AiProviderChatParams): Promise<AiProviderResponse>;
}

/**
 * Google Gemini Provider Implementation (with model auto-failover on 429 rate limit)
 */
export class GeminiAiProvider implements AiProvider {
  name = 'Google Gemini Provider';
  private apiKey: string;
  private primaryModel: string;
  private fallbackModels = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];

  constructor(apiKey?: string, model?: string) {
    this.apiKey =
      apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      '';
    this.primaryModel =
      model || process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private async callModel(
    model: string,
    params: AiProviderChatParams,
  ): Promise<AiProviderResponse> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    // Format messages for Gemini API
    const contents = params.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Format tools for Gemini API
    const toolsPayload =
      params.tools && params.tools.length > 0
        ? [
            {
              functionDeclarations: params.tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              })),
            },
          ]
        : undefined;

    const payload = {
      systemInstruction: {
        parts: [{ text: params.systemPrompt }],
      },
      contents,
      tools: toolsPayload,
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API Error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const candidate = json.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let textContent = '';
    const toolCalls: ToolCall[] = [];

    for (const part of parts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args || {}),
          },
        });
      }
    }

    return {
      message: textContent.trim(),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      providerName: `${this.name} (${model})`,
    };
  }

  async chat(params: AiProviderChatParams): Promise<AiProviderResponse> {
    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const modelsToTry = [
      this.primaryModel,
      ...this.fallbackModels.filter((m) => m !== this.primaryModel),
    ];
    let lastError: unknown;

    for (const model of modelsToTry) {
      try {
        return await this.callModel(model, params);
      } catch (err) {
        lastError = err;
        // If 429 (quota exceeded), continue to try next lightweight Gemini model
        const errStr = String(err);
        if (
          errStr.includes('429') ||
          errStr.includes('RESOURCE_EXHAUSTED') ||
          errStr.includes('quota')
        ) {
          console.warn(
            `[GeminiAiProvider] Model ${model} rate-limited (429), failing over to next model...`,
          );
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error('Gemini models exhausted');
  }
}

/**
 * Groq Provider Implementation (Llama 3.3 / Llama 3.1)
 */
export class GroqAiProvider implements AiProvider {
  name = 'Groq AI Provider';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';
    this.model =
      model || process.env.GROQ_DEFAULT_MODEL || 'llama-3.3-70b-versatile';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(params: AiProviderChatParams): Promise<AiProviderResponse> {
    if (!this.isConfigured()) {
      throw new Error('GROQ_API_KEY is not set');
    }

    const formattedMessages: ChatMessage[] = [
      { role: 'system', content: params.systemPrompt },
      ...params.messages,
    ];

    const formattedTools = params.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages.map((m) => ({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
        })),
        tools: formattedTools,
        tool_choice:
          formattedTools && formattedTools.length > 0 ? 'auto' : undefined,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const messageObj = choice?.message;

    return {
      message: messageObj?.content || '',
      toolCalls: messageObj?.tool_calls,
      finishReason: choice?.finish_reason || 'stop',
      providerName: `${this.name} (${this.model})`,
    };
  }
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAiProvider implements AiProvider {
  name = 'OpenAI Provider';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = 'gpt-4o-mini') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(params: AiProviderChatParams): Promise<AiProviderResponse> {
    if (!this.isConfigured()) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const formattedMessages: ChatMessage[] = [
      { role: 'system', content: params.systemPrompt },
      ...params.messages,
    ];

    const formattedTools = params.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages.map((m) => ({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
        })),
        tools: formattedTools,
        tool_choice:
          formattedTools && formattedTools.length > 0 ? 'auto' : undefined,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const messageObj = choice?.message;

    return {
      message: messageObj?.content || '',
      toolCalls: messageObj?.tool_calls,
      finishReason: choice?.finish_reason || 'stop',
      providerName: `${this.name} (${this.model})`,
    };
  }
}

/**
 * OpenRouter Provider Implementation
 */
export class OpenRouterAiProvider implements AiProvider {
  name = 'OpenRouter Provider';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    this.model =
      model ||
      process.env.OPENROUTER_LIGHT_MODEL_NAME ||
      'mistralai/mistral-7b-instruct';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(params: AiProviderChatParams): Promise<AiProviderResponse> {
    if (!this.isConfigured()) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    const formattedMessages: ChatMessage[] = [
      { role: 'system', content: params.systemPrompt },
      ...params.messages,
    ];

    const formattedTools = params.tools?.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://softmato.com',
        'X-Title': 'Softmato AI Assistant',
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages.map((m) => ({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
        })),
        tools: formattedTools,
        tool_choice:
          formattedTools && formattedTools.length > 0 ? 'auto' : undefined,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const messageObj = choice?.message;

    return {
      message: messageObj?.content || '',
      toolCalls: messageObj?.tool_calls,
      finishReason: choice?.finish_reason || 'stop',
      providerName: `${this.name} (${this.model})`,
    };
  }
}

/**
 * Smart Fallback Provider
 * Context-aware local engine that reads conversation history, detects user intent
 * through broad natural language patterns, and triggers tools or responds naturally.
 * Speaks casually as "Alex" with zero robotic pitches.
 */
export class SmartFallbackProvider implements AiProvider {
  name = 'Softmato Local Engine';

  private detectPriorSuggestion(
    messages: ChatMessage[],
  ): 'booking' | 'lead' | 'handoff' | 'slots' | null {
    const assistantMsgs = messages.filter((m) => m.role === 'assistant');
    const lastAssistant =
      assistantMsgs[assistantMsgs.length - 1]?.content?.toLowerCase() || '';
    if (
      /discovery call|book.*meeting|schedule.*call|15.?min|grab a slot|reserve a/.test(
        lastAssistant,
      )
    )
      return 'booking';
    if (
      /register.*lead|log.*lead|project lead|quote|estimate|requirements/.test(
        lastAssistant,
      )
    )
      return 'lead';
    if (
      /human team|speak.*founder|talk.*person|hand.*off|support team/.test(
        lastAssistant,
      )
    )
      return 'handoff';
    if (/available.*slot|meeting.*slot|check.*availability/.test(lastAssistant))
      return 'slots';
    return null;
  }

  async chat(params: AiProviderChatParams): Promise<AiProviderResponse> {
    const lastUserMessage =
      [...params.messages].reverse().find((m) => m.role === 'user')?.content ||
      '';
    const lowerQuery = lastUserMessage.toLowerCase().trim();

    const toolCalls: ToolCall[] = [];

    // SLOTS
    const wantsSlots =
      /slot|available.*meet|time.*meet|when.*can.*meet|show.*time|schedule.*call|free.*time|open.*time|check.*availab/.test(
        lowerQuery,
      );

    // BOOKING
    const wantsBooking =
      /\bbook\b|reserve|schedule.*meet|set.?up.*call|lock.*in.*time|confirm.*call|lets.*meet|book.*15|book.*call|book.*meeting/.test(
        lowerQuery,
      );

    // LEAD
    const wantsLead =
      /\blead\b|\bquote\b|estimate|hire|build my|start.*project|need.*develop|interested.*work|want.*build|create.*project/.test(
        lowerQuery,
      );

    // HUMAN
    const wantsHuman =
      /talk.*team|speak.*with|talk.*person|talk.*someone|connect.*me|real.*person|\bhuman\b|talk.*founder|speak.*founder|reach.*team|contact.*team/.test(
        lowerQuery,
      );

    // AGREEMENT
    const isAgreement =
      /^(yeah|yes|yep|yup|sure|ok|okay|lets do|let's do|sounds good|go ahead|do it|please|absolutely|definitely|for sure|why not|im down|i'm down|alright|right|cool)/.test(
        lowerQuery,
      ) ||
      /lets do that|let's do that|that works|works for me|i'd like that|i would like|sign me up|count me in/.test(
        lowerQuery,
      );

    let bodyText = '';

    if (
      isAgreement &&
      !wantsSlots &&
      !wantsBooking &&
      !wantsLead &&
      !wantsHuman
    ) {
      const priorSuggestion = this.detectPriorSuggestion(params.messages);
      if (priorSuggestion === 'booking' || priorSuggestion === 'slots') {
        toolCalls.push({
          id: `call_${Date.now()}_slots`,
          type: 'function',
          function: {
            name: 'get_available_meeting_slots',
            arguments: '{}',
          },
        });
      } else if (priorSuggestion === 'lead' || priorSuggestion === 'handoff') {
        /*
         * "yeah, sure" is agreement, not contact details. This branch used to
         * fabricate them — filing leads under "Prospective Client" at
         * prospect@example.com and handoffs at support@example.com, so a
         * cheerful "yes" produced a record nobody could ever follow up.
         * Ask instead.
         */
        bodyText = `great — what's your name and email? I'll get it straight to the team.`;
      }
      if (toolCalls.length > 0) {
        return {
          message: 'sure thing! pulling that up for you right now ✨',
          toolCalls,
          finishReason: 'tool_calls',
          providerName: this.name,
        };
      }
    }

    if (wantsSlots) {
      toolCalls.push({
        id: `call_${Date.now()}_slots`,
        type: 'function',
        function: {
          name: 'get_available_meeting_slots',
          arguments: '{}',
        },
      });
    } else if (wantsBooking) {
      /*
       * A booking is only made when the visitor has actually supplied all
       * four facts. Anything missing is asked for.
       *
       * What used to happen instead: the first word of the sentence became
       * the client's name (so "book a call…" booked a client called "Book"),
       * and the date and time were the literals '2026-09-02' and '14:00 NPT'
       * — which is why every confirmation the founders received showed the
       * same date regardless of what anyone asked for.
       */
      const parsed = parseBooking(lastUserMessage);

      if (parsed.email && parsed.name && parsed.date && parsed.time) {
        toolCalls.push({
          id: `call_${Date.now()}_book`,
          type: 'function',
          function: {
            name: 'book_meeting',
            arguments: JSON.stringify({
              name: parsed.name,
              email: parsed.email,
              date: parsed.date,
              time: parsed.time,
              ...(parsed.phone ? { phone: parsed.phone } : {}),
              details: lastUserMessage,
            }),
          },
        });
      } else if (parsed.email || parsed.name || parsed.date) {
        const missing: string[] = [];
        if (!parsed.name) missing.push('your name');
        if (!parsed.email) missing.push('your email');
        if (!parsed.date || !parsed.time)
          missing.push('which slot works for you');
        bodyText = `almost there — just need ${missing.join(' and ')} and I'll lock it in.`;
      } else {
        toolCalls.push({
          id: `call_${Date.now()}_slots`,
          type: 'function',
          function: {
            name: 'get_available_meeting_slots',
            arguments: '{}',
          },
        });
      }
    } else if (wantsLead) {
      const parsed = parseBooking(lastUserMessage);
      if (parsed.email && parsed.name) {
        toolCalls.push({
          id: `call_${Date.now()}_lead`,
          type: 'function',
          function: {
            name: 'create_lead',
            arguments: JSON.stringify({
              name: parsed.name,
              email: parsed.email,
              ...(parsed.phone ? { phone: parsed.phone } : {}),
              requirements: lastUserMessage,
            }),
          },
        });
      } else if (parsed.email && !parsed.name) {
        bodyText = `got the email — what name should I put this under?`;
      } else {
        bodyText = `love to help you set up a quote! drop your name & email, or pick a call slot below!`;
      }
    } else if (wantsHuman) {
      const parsed = parseBooking(lastUserMessage);
      if (parsed.email && parsed.name) {
        toolCalls.push({
          id: `call_${Date.now()}_human`,
          type: 'function',
          function: {
            name: 'contact_human_team',
            arguments: JSON.stringify({
              name: parsed.name,
              email: parsed.email,
              ...(parsed.phone ? { phone: parsed.phone } : {}),
              message: lastUserMessage,
            }),
          },
        });
      } else if (parsed.email && !parsed.name) {
        bodyText = `sure — who should I say is asking?`;
      } else {
        bodyText = `our founders (Jiwan & Siddhant) are happy to connect! drop your email or pick a 15-min call slot!`;
      }
    }

    if (toolCalls.length > 0) {
      return {
        message: 'on it! getting that ready for you... 🚀',
        toolCalls,
        finishReason: 'tool_calls',
        providerName: this.name,
      };
    }

    if (bodyText) {
      return {
        message: bodyText,
        finishReason: 'stop',
        providerName: this.name,
      };
    }

    // Conversational Responses
    const isGreeting =
      /^(hi|hello|hey|greetings|sup|hola|yo|howdy|good\s?(morning|evening|afternoon))/i.test(
        lowerQuery,
      ) ||
      /anyone there|anyone here|anybody|is someone|are you there|you there/i.test(
        lowerQuery,
      );

    if (isGreeting) {
      bodyText = `hey! yep, I'm right here. I'm Alex from Softmato. what software idea or project are you looking to build?`;
    } else if (
      /who.*founder|who.*lead|who.*behind|\bfounder\b|leadership/i.test(
        lowerQuery,
      )
    ) {
      bodyText =
        `Softmato is founded and equally led by **Jiwan Mijhar** (Founder & CEO) and **Siddhant Yadav** (Founder & CTO).\n\n` +
        `• **Jiwan** leads business strategy, external operations, client relations, and legal compliance.\n` +
        `• **Siddhant** leads software engineering, technical architecture, internal product dev, and mapping strategy.\n\n` +
        `want to grab a quick 15-minute call with our team to discuss your project idea?`;
    } else if (/company|about|softmato|what do you do/i.test(lowerQuery)) {
      bodyText =
        `we're **Softmato Technology**, a product engineering agency based in Kathmandu, Nepal! 🚀\n\n` +
        `we build high-performance web applications, mobile apps, SaaS platforms, and custom software systems for startups and enterprises worldwide.\n\n` +
        `Softmato is founded and equally led by **Jiwan Mijhar** (Founder & CEO) and **Siddhant Yadav** (Founder & CTO).\n\n` +
        `what kind of project are you looking to build? I can help you scope it out or set up a quick 15-min discovery call!`;
    } else if (
      /price|cost|how much|budget|afford|expensive|cheap/i.test(lowerQuery)
    ) {
      bodyText = `we structure custom software into static sites, SaaS web platforms, and mobile apps. what kind of project do you have in mind? I can give you an estimate or grab a quick 15-min call with our engineering team!`;
    } else if (
      /service|what.*offer|capabilit|specializ|expertise/i.test(lowerQuery)
    ) {
      bodyText = `we build high-performance web apps, mobile apps, custom SaaS products, and APIs. what are you planning to build?`;
    } else if (/thank|thanks|thx|cheers|appreciate/i.test(lowerQuery)) {
      bodyText = `anytime! let me know if you want to scope out a project or grab a call with our team.`;
    } else if (/bye|goodbye|see you|later|gotta go/i.test(lowerQuery)) {
      bodyText = `catch you later! I'll be right here whenever you need anything.`;
    } else {
      bodyText = `sounds interesting! I can help scope that out with you or set up a quick 15-min discovery call with our tech team. want me to pull up the open slots?`;
    }

    return {
      message: bodyText,
      finishReason: 'stop',
      providerName: this.name,
    };
  }
}

/**
 * Multi-LLM Provider Cascade Manager
 * Tries configured cloud LLMs in order (Gemini -> Groq -> OpenAI -> OpenRouter -> Local Fallback Engine)
 */
export class ResilientAiProvider implements AiProvider {
  name = 'Softmato Multi-LLM Engine';
  private providers: AiProvider[] = [];
  private fallbackProvider: AiProvider = new SmartFallbackProvider();

  constructor() {
    // 1. Google Gemini (primary with internal auto-failover on 429)
    const gemini = new GeminiAiProvider();
    if (gemini.isConfigured()) {
      this.providers.push(gemini);
    }

    // 2. Groq (Llama 3.3 / 3.1)
    const groq = new GroqAiProvider();
    if (groq.isConfigured()) {
      this.providers.push(groq);
    }

    // 3. OpenAI (GPT-4o-mini)
    const openAi = new OpenAiProvider();
    if (openAi.isConfigured()) {
      this.providers.push(openAi);
    }

    // 4. OpenRouter
    const openRouter = new OpenRouterAiProvider();
    if (openRouter.isConfigured()) {
      this.providers.push(openRouter);
    }
  }

  async chat(params: AiProviderChatParams): Promise<AiProviderResponse> {
    for (const provider of this.providers) {
      try {
        return await provider.chat(params);
      } catch (err) {
        console.warn(
          `[AiProvider] Provider (${provider.name}) failed/rate-limited, trying next provider in cascade...`,
          err,
        );
      }
    }

    // If all cloud LLMs fail or are unconfigured, use smart local engine
    return this.fallbackProvider.chat(params);
  }
}

export const defaultAiProvider = new ResilientAiProvider();
