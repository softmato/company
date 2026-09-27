/**
 * The sample project on the public portal demo (`/client-portal`).
 *
 * Invented and labelled as a sample on the page: the shop is the in-app
 * preview `himalayan-tea`, the people are first names only, and every date is
 * counted from today so the demo never goes stale or "late".
 */
import type { ProjectBundle } from '@/lib/projects/bundle';

export const DEMO_PREVIEW_SLUG = 'himalayan-tea';

/** The one sample file, served by `client-portal/sample-brief.pdf/route.ts`. */
export const DEMO_BRIEF_HREF = '/client-portal/sample-brief.pdf';

export function demoBundle(now = new Date()): ProjectBundle {
  const at = (days: number, hours = 0) =>
    new Date(now.getTime() + days * 86_400_000 + hours * 3_600_000);
  const day = (days: number) => at(days).toISOString().slice(0, 10);

  return {
    project: {
      id: 0,
      clientId: 0,
      name: 'Online shop and wholesale ordering',
      summary:
        'A storefront for retail customers, and a private ordering page for wholesale buyers with their own price list.',
      status: 'active',
      startsOn: day(-40),
      dueOn: day(49),
      previewSlug: DEMO_PREVIEW_SLUG,
      vercelProjectId: null,
      createdAt: at(-40),
      updatedAt: at(0, -1),
    },
    stages: [
      ['Discovery', 'Workshops, product catalogue and pricing rules.', 'done'],
      [
        'Design',
        'Page layouts and the ordering flow, reviewed with you.',
        'done',
      ],
      [
        'Build',
        'Storefront, wholesale portal and payment integration.',
        'in_progress',
      ],
      [
        'Testing',
        'Your team tries every flow on phones and desktops.',
        'upcoming',
      ],
      ['Launch', 'Go live, then two weeks of close support.', 'upcoming'],
    ].map(([name, description, status], position) => ({
      id: position + 1,
      position,
      name: name!,
      description: description!,
      status: status as 'done' | 'in_progress' | 'upcoming',
      completedAt: status === 'done' ? at(-20 + position * 10) : null,
    })),
    milestones: [
      {
        id: 1,
        title: 'Designs signed off',
        dueOn: day(-12),
        completedAt: at(-12),
      },
      {
        id: 2,
        title: 'Staging site ready for testing',
        dueOn: day(8),
        completedAt: null,
      },
      { id: 3, title: 'Go live', dueOn: day(49), completedAt: null },
    ],
    deliverables: [
      {
        id: 1,
        title: 'Wholesale ordering flow — clickable prototype',
        description:
          'Log in as a wholesale buyer, build an order from the price list, and submit it.',
        linkUrl: null,
        status: 'in_review',
        reviewedAt: null,
        reviewerName: null,
      },
      {
        id: 2,
        title: 'Payment integration',
        description: '',
        linkUrl: null,
        status: 'in_progress',
        reviewedAt: null,
        reviewerName: null,
      },
      {
        id: 3,
        title: 'Homepage and product page designs',
        description: '',
        linkUrl: null,
        status: 'approved',
        reviewedAt: at(-12),
        reviewerName: 'Asha',
      },
    ],
    documents: [
      {
        id: 1,
        fileName: 'sample-brief.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2_053,
        uploadedBy: 'client',
        uploaderName: 'Asha',
        createdAt: at(-38),
      },
    ],
    messages: [
      {
        author: 'admin',
        authorName: 'Engineer',
        body: 'Welcome aboard! This thread is where we will share progress and questions.',
        createdAt: at(-40),
      },
      {
        author: 'client',
        authorName: 'Asha',
        body: 'Thanks — the designs look great. Can wholesale buyers see stock levels?',
        createdAt: at(-13),
      },
      {
        author: 'admin',
        authorName: 'Engineer',
        body: 'Yes. The prototype is ready for your review above — stock shows on each product row.',
        createdAt: at(-1, -3),
      },
    ].map((m, i) => ({
      id: i + 1,
      ...m,
      author: m.author as 'admin' | 'client',
    })),
    deploys: [
      {
        id: 3,
        summary: 'Basket keeps its items across pages',
        deployedAt: at(0, -1),
      },
      {
        id: 2,
        summary: 'Add the wholesale ordering page',
        deployedAt: at(-1, -2),
      },
      {
        id: 1,
        summary: 'Product pages with photos and prices',
        deployedAt: at(-4),
      },
    ],
  };
}
