import { z } from 'zod';
import type { ToolDefinition, ToolExecutionResult } from './types';

/**
 * 1. AI Tool Definitions JSON Schema for LLM function calling
 */
export const AI_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_available_meeting_slots',
    description:
      'Retrieves upcoming available meeting slots for client discovery and architecture calls with Softmato engineers.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'book_meeting',
    description:
      'Books a discovery meeting with the Softmato team. Requires client name, email, date, time slot, and project details.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Full name of the client' },
        email: {
          type: 'string',
          description: 'Valid email address of the client',
        },
        date: {
          type: 'string',
          description: 'Meeting date in YYYY-MM-DD format (e.g., 2026-09-02)',
        },
        time: {
          type: 'string',
          description: 'Selected time slot (e.g., "14:00 NPT" or "10:00 NPT")',
        },
        details: {
          type: 'string',
          description:
            'Brief description of project requirements or discussion topics',
        },
      },
      required: ['name', 'email', 'date', 'time'],
    },
  },
  {
    name: 'create_lead',
    description:
      'Registers a project lead or business inquiry for a custom project quote or technical proposal.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Client name' },
        email: { type: 'string', description: 'Client email' },
        company: {
          type: 'string',
          description: 'Company name or organization (optional)',
        },
        requirements: {
          type: 'string',
          description:
            'Detailed summary of project requirements, timeline, or goal',
        },
      },
      required: ['name', 'email', 'requirements'],
    },
  },
  {
    name: 'contact_human_team',
    description:
      'Hands off an inquiry or support request directly to the Softmato human team.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the contact person' },
        email: { type: 'string', description: 'Email of the contact person' },
        message: {
          type: 'string',
          description: 'Support message or question for the team',
        },
      },
      required: ['name', 'email', 'message'],
    },
  },
];

import {
  getAvailableSlots,
  recordBooking,
  recordLead,
  recordSupportRequest,
} from './leads-store';
import { sendEmail } from '@/lib/email/send';
import { env } from '@/lib/env';
import {
  bookingClientEmail,
  bookingOwnerEmail,
} from '@/lib/email/templates/booking-confirmation';

/**
 * Zod Schemas for Server-side Tool Input Validation
 */
/**
 * `date` was previously `z.string().min(8)`, which accepts "aaaaaaaa" and
 * every date in the past. A booking is a promise to be somewhere at a time,
 * so the shape of the string is the least of what has to be true about it.
 */
const bookMeetingSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .refine(
      (d) => !Number.isNaN(Date.parse(d)),
      'Date is not a real calendar date',
    ),
  time: z.string().regex(/^\d{1,2}:\d{2}/, 'Time must be HH:MM'),
  details: z.string().optional(),
});

const createLeadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  requirements: z.string().min(5, 'Requirements description must be provided'),
});

const contactHumanSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  message: z.string().min(5, 'Message must be at least 5 characters'),
});

/**
 * Server-side Tool Executors
 */
export async function executeTool(
  toolName: string,
  rawArgs: Record<string, unknown> | string,
): Promise<ToolExecutionResult> {
  let argsObj: Record<string, unknown> = {};
  if (typeof rawArgs === 'string') {
    try {
      argsObj = JSON.parse(rawArgs);
    } catch {
      return {
        toolName,
        success: false,
        error: 'Invalid JSON arguments provided',
      };
    }
  } else {
    argsObj = rawArgs;
  }

  try {
    switch (toolName) {
      case 'get_available_meeting_slots': {
        const slots = getAvailableSlots();
        return {
          toolName,
          success: true,
          data: {
            availableSlots: slots,
            timezone: 'Nepal Standard Time (NPT, UTC+5:45)',
            message: `Found ${slots.length} available discovery meeting slots.`,
          },
        };
      }

      case 'book_meeting': {
        const parsed = bookMeetingSchema.parse(argsObj);

        const outcome = recordBooking({
          name: parsed.name,
          email: parsed.email,
          date: parsed.date,
          time: parsed.time,
          ...(parsed.phone ? { phone: parsed.phone } : {}),
          ...(parsed.details ? { details: parsed.details } : {}),
        });

        // A slot we cannot honour is a failure, not a confirmation. Returning
        // success here is what let the assistant double-book, and what mailed
        // confirmations for times nobody was ever free.
        if (!outcome.ok || !outcome.record) {
          const available = getAvailableSlots().slice(0, 4);
          return {
            toolName,
            success: false,
            error:
              outcome.failure === 'ALREADY_TAKEN'
                ? `That slot has just been taken. Still open: ${available
                    .map((s) => `${s.date} ${s.time}`)
                    .join(', ')}`
                : `${parsed.date} at ${parsed.time} is not one of our open slots. Currently open: ${available
                    .map((s) => `${s.date} ${s.time}`)
                    .join(', ')}`,
          };
        }

        const record = outcome.record;

        // Email must never decide whether a booking stands — the slot is
        // already held. But the visitor is told what actually happened rather
        // than a blanket "invitation dispatched" that was true only sometimes.
        let clientNotified = false;
        try {
          const clientResult = await sendEmail({
            to: parsed.email,
            template: bookingClientEmail(record),
          });
          clientNotified = clientResult.sent;

          // COMPANY_EMAIL is currently unset in deployment, so the shipped
          // default is what actually carries founder alerts today. Set
          // COMPANY_EMAIL to route them elsewhere.
          if (!env.COMPANY_EMAIL) {
            console.warn(
              '[book_meeting] COMPANY_EMAIL unset — alerting the default address',
            );
          }
          await sendEmail({
            to: env.COMPANY_EMAIL || 'admin@softmato.com',
            template: bookingOwnerEmail(record),
          });
        } catch (emailErr) {
          console.warn('[book_meeting] Email dispatch failed:', emailErr);
        }

        return {
          toolName,
          success: true,
          data: {
            bookingId: record.bookingId,
            status: 'CONFIRMED',
            client: parsed.name,
            email: parsed.email,
            date: parsed.date,
            time: parsed.time,
            clientNotified,
            message: clientNotified
              ? `Meeting booked. Reference ${record.bookingId}. Confirmation sent to ${parsed.email}.`
              : `Meeting booked. Reference ${record.bookingId}. Please note the reference — we could not send the confirmation email.`,
          },
        };
      }

      case 'create_lead': {
        const parsed = createLeadSchema.parse(argsObj);
        const record = recordLead({
          name: parsed.name,
          email: parsed.email,
          requirements: parsed.requirements,
          ...(parsed.phone ? { phone: parsed.phone } : {}),
          ...(parsed.company ? { company: parsed.company } : {}),
        });

        return {
          toolName,
          success: true,
          data: {
            leadId: record.leadId,
            status: 'RECEIVED',
            name: parsed.name,
            email: parsed.email,
            ...(parsed.company ? { company: parsed.company } : {}),
            message: `Lead registered under reference ${record.leadId}. A Softmato solutions engineer will review your project requirements and follow up within 24 hours.`,
          },
        };
      }

      case 'contact_human_team': {
        const parsed = contactHumanSchema.parse(argsObj);
        const record = recordSupportRequest({
          name: parsed.name,
          email: parsed.email,
          message: parsed.message,
          ...(parsed.phone ? { phone: parsed.phone } : {}),
        });

        return {
          toolName,
          success: true,
          data: {
            requestId: record.requestId,
            status: 'HANDED_OFF',
            contactName: parsed.name,
            email: parsed.email,
            message: `Support inquiry ${record.requestId} submitted to Softmato leadership and technical team. We will respond to ${parsed.email} shortly.`,
          },
        };
      }

      default:
        return { toolName, success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Tool execution error';
    return { toolName, success: false, error: errorMsg };
  }
}
