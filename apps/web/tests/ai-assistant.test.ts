import { describe, it, expect } from 'vitest';
import { retrieveContext } from '../lib/ai/retrieve-context';
import { buildSystemPrompt } from '../lib/ai/system-prompt';
import { executeTool, AI_TOOL_DEFINITIONS } from '../lib/ai/tools';
import { getAvailableSlots, __resetStore } from '../lib/ai/leads-store';
import { defaultAiProvider, SmartFallbackProvider } from '../lib/ai/provider';

describe('Softmato AI Assistant Core System', () => {
  describe('Context Retrieval Engine', () => {
    it('retrieves pricing context when asked about costs and pricing tiers', async () => {
      const contexts = await retrieveContext(
        'How much does custom website development cost?',
      );
      expect(contexts.length).toBeGreaterThan(0);
      const pricingDoc = contexts.find((c) => c.filename === 'pricing.md');
      expect(pricingDoc).toBeDefined();
      expect(pricingDoc?.content).toContain('Pricing');
    });

    it('retrieves service context for tech stack inquiries', async () => {
      const contexts = await retrieveContext(
        'What services and mobile app features do you offer?',
      );
      expect(contexts.length).toBeGreaterThan(0);
      const servicesDoc = contexts.find((c) => c.filename === 'services.md');
      expect(servicesDoc).toBeDefined();
      expect(servicesDoc?.content).toContain('Services');
    });

    it('falls back gracefully to general company context for unknown terms', async () => {
      const contexts = await retrieveContext('random unmapped queryxyz');
      expect(contexts.length).toBeGreaterThan(0);
      expect(contexts.some((c) => c.filename === 'company.md')).toBe(true);
    });
  });

  describe('System Prompt Generator', () => {
    it('formats system prompt with retrieved context blocks and strict rules', () => {
      const mockContext = [
        {
          filename: 'company.md',
          content: 'Softmato Technology Pvt Ltd overview',
          score: 2,
        },
      ];
      const prompt = buildSystemPrompt(mockContext);
      expect(prompt).toContain('Alex');
      expect(prompt).toContain('Knowledge (company.md)');
      expect(prompt).toContain('Strict Human Rules');
    });
  });

  describe('AI Tools & Function Calling', () => {
    it('has valid tool definitions for LLM registration', () => {
      expect(AI_TOOL_DEFINITIONS.length).toBe(4);
      const toolNames = AI_TOOL_DEFINITIONS.map((t) => t.name);
      expect(toolNames).toContain('get_available_meeting_slots');
      expect(toolNames).toContain('book_meeting');
      expect(toolNames).toContain('create_lead');
      expect(toolNames).toContain('contact_human_team');
    });

    it('offers only future slots, never a hardcoded past date', async () => {
      const res = await executeTool('get_available_meeting_slots', {});
      expect(res.success).toBe(true);
      const data = res.data as Record<string, unknown>;
      const slots = data.availableSlots as Array<{
        date: string;
        time: string;
      }>;

      expect(Array.isArray(slots)).toBe(true);
      expect(slots.length).toBeGreaterThan(0);

      const today = new Date().toISOString().slice(0, 10);
      for (const slot of slots) {
        expect(slot.date >= today).toBe(true);
      }
    });

    /*
     * This block sends no mail. It used to: with `.env.local` loaded by
     * vitest.config.ts a live Resend key was present, so every run delivered a
     * booking confirmation to the fixture address and a "[NEW BOOKING]" alert
     * to the founders' inbox. `sendEmail` now refuses outright under a test
     * runner; these cases assert on the returned record, which is the thing
     * actually under test.
     */
    it('books a real offered slot and confirms it', async () => {
      __resetStore();
      const slot = getAvailableSlots()[0];
      expect(slot).toBeDefined();

      const res = await executeTool('book_meeting', {
        name: 'Ram Thapa',
        email: 'ram.thapa@softmato-test.invalid',
        date: slot!.date,
        time: slot!.time,
        details: 'Initial project discussion',
      });

      expect(res.success).toBe(true);
      const data = res.data as Record<string, unknown>;
      expect(data.status).toBe('CONFIRMED');
      expect(data.bookingId).toBeDefined();
      expect(data.date).toBe(slot!.date);
      // Email is suppressed under test, and the tool reports that honestly.
      expect(data.clientNotified).toBe(false);
    });

    it('refuses a slot that is not on offer instead of confirming it', async () => {
      __resetStore();
      const res = await executeTool('book_meeting', {
        name: 'Ram Thapa',
        email: 'ram.thapa@softmato-test.invalid',
        date: '2020-01-01',
        time: '14:00 NPT',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('not one of our open slots');
    });

    it('refuses to double-book a slot it has already given away', async () => {
      __resetStore();
      const slot = getAvailableSlots()[0]!;
      const args = {
        name: 'Ram Thapa',
        email: 'ram.thapa@softmato-test.invalid',
        date: slot.date,
        time: slot.time,
      };

      expect((await executeTool('book_meeting', args)).success).toBe(true);
      const second = await executeTool('book_meeting', {
        ...args,
        name: 'Sita Gurung',
        email: 'sita@softmato-test.invalid',
      });

      expect(second.success).toBe(false);
      expect(second.error).toContain('just been taken');
    });

    it('rejects a malformed date rather than accepting any 8-character string', async () => {
      const res = await executeTool('book_meeting', {
        name: 'Ram Thapa',
        email: 'ram.thapa@softmato-test.invalid',
        date: 'aaaaaaaa',
        time: '14:00',
      });
      expect(res.success).toBe(false);
    });

    it('fails tool execution when required input is invalid', async () => {
      const res = await executeTool('book_meeting', {
        name: 'J',
        email: 'invalid-email',
      });
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('executes create_lead tool successfully', async () => {
      const res = await executeTool('create_lead', {
        name: 'Alex Smith',
        email: 'alex@company.com',
        company: 'TechCorp',
        requirements: 'Need custom SaaS web application and mobile app',
      });
      expect(res.success).toBe(true);
      const data = res.data as Record<string, unknown>;
      expect(data.status).toBe('RECEIVED');
      expect(data.leadId).toBeDefined();
    });
  });

  describe('AI Provider Abstraction', () => {
    it('uses fallback provider seamlessly when external keys are missing', async () => {
      const fallback = new SmartFallbackProvider();
      const response = await fallback.chat({
        messages: [{ role: 'user', content: 'Tell me about Softmato' }],
        systemPrompt: 'Test system prompt',
      });
      expect(response.message).toBeDefined();
      expect(response.providerName).toBe('Softmato Local Engine');
    });

    it('resilient provider executes chat without throwing', async () => {
      const response = await defaultAiProvider.chat({
        messages: [
          { role: 'user', content: 'What are your available meeting slots?' },
        ],
        systemPrompt: 'Test prompt',
      });
      expect(response.message).toBeDefined();
      expect(response.finishReason).toBeDefined();
    }, 15000);
  });
});
