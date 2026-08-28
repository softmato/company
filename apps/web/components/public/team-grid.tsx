import type { TeamMember } from '@softmato/db';

import { initials } from '@/lib/initials';
import { StaggerIn } from '@/components/motion/stagger-in';
import { CmsImage } from '@/components/public/cms-image';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * **The no-photo state is the one designed first** (docs/UI_BRIEF.md §3.1).
 * `photoUrl` is null for the whole team today, so the initials tile is the
 * normal case and the photograph is the exception. Both occupy the same
 * circle, so a page half-filled with photos still lines up.
 *
 * The tile is deliberately not filled with a stock portrait. A photograph of a
 * stranger under a real colleague's name is a claim about who works here, and
 * it is false. Initials say "no photo yet", which is true and costs the page
 * nothing — and on this palette the tile is a small emerald light of its own,
 * which is a good deal better than a grey silhouette.
 *
 * Two-up at every width above `sm`. The grid has to look right with two people
 * and with ten; a three-column grid holding two founders leaves a hole where
 * the third should be, and a hole reads as someone having left.
 */
export function TeamGrid({ members }: { members: TeamMember[] }) {
  if (members.length === 0) {
    return (
      <EmptyState
        className="mt-12"
        title="Nobody here yet"
        description="Team members appear here once they are added in the panel and published."
      />
    );
  }

  return (
    <StaggerIn as="ul" onScroll className="mt-12 grid gap-4 sm:grid-cols-2">
      {members.map((member) => (
        <li key={member.id}>
          <article className="section-frame flex h-full flex-col p-7">
            <div className="flex items-center gap-5">
              {member.photoUrl ? (
                <CmsImage
                  src={member.photoUrl}
                  alt=""
                  width={88}
                  height={88}
                  sizes="88px"
                  className="size-22 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid size-22 shrink-0 place-items-center rounded-full font-mono text-[22px] text-primary"
                  style={{
                    /*
                     * The same light as everything else on the page, at the
                     * smallest size it appears in: a lit corner falling off to
                     * the haze. A flat 10%-primary fill reads as a disabled
                     * control.
                     *
                     * Both stops are lighter than `--haze`, and that is a
                     * contrast requirement rather than a preference: the
                     * initials are 22px `--primary`, which needs 4.5:1. Over
                     * `--haze` they get 4.9:1; over `--glow-core`, which is
                     * what this gradient used to start from, 4.1:1.
                     */
                    background:
                      'radial-gradient(circle at 32% 28%, color-mix(in oklab, var(--haze) 45%, white), var(--haze) 72%)',
                  }}
                >
                  {initials(member.name)}
                </span>
              )}

              <div className="min-w-0">
                <h2 className="headline text-[19px]">{member.name}</h2>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  {member.role}
                </p>
              </div>
            </div>

            {member.bio ? (
              <p className="mt-6 text-[14.5px] leading-relaxed text-muted-foreground">
                {member.bio}
              </p>
            ) : null}

            {member.linkedinUrl || member.githubUrl || member.email ? (
              <ul className="mt-auto flex flex-wrap items-center gap-2 pt-7">
                {member.linkedinUrl ? (
                  <ProfileLink href={member.linkedinUrl} external>
                    LinkedIn
                  </ProfileLink>
                ) : null}
                {member.githubUrl ? (
                  <ProfileLink href={member.githubUrl} external>
                    GitHub
                  </ProfileLink>
                ) : null}
                {member.email ? (
                  <ProfileLink href={`mailto:${member.email}`}>Email</ProfileLink>
                ) : null}
              </ul>
            ) : null}
          </article>
        </li>
      ))}
    </StaggerIn>
  );
}

/**
 * Chips rather than a row of underlined links: at three-up they read as one
 * set of ways to reach this person, and each is a comfortable tap target on a
 * phone — the brief forbids hover-only affordances, and a 13px inline link is
 * the touch equivalent of one.
 */
function ProfileLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="inline-flex h-8 items-center rounded-full border border-border px-3.5 text-[13px] text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {children}
      </a>
    </li>
  );
}
