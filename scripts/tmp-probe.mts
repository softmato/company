import { teamMembers, db, closeDb } from '@softmato/db';

const rows = await db.select().from(teamMembers);
for (const r of rows) {
  console.log(`${r.id} | ${r.name} | ${r.status} | ${JSON.stringify(r.photoUrl)}`);
}
await closeDb();
