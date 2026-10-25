// Vercel serverless function: stores uploaded datasets in Neon Postgres.
// The connection string lives only in the DATABASE_URL environment variable (never in the browser bundle).
import { neon } from '@neondatabase/serverless';

/* eslint-disable @typescript-eslint/no-explicit-any */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const url = process.env.DATABASE_URL;
    if (!url) return res.status(503).json({ error: 'storage not configured' });
    const sql = neon(url);
    await sql`create table if not exists uploads (
      id uuid primary key default gen_random_uuid(),
      file_name text not null,
      n_applications int not null,
      n_territories int not null,
      dataset jsonb not null,
      created_at timestamptz not null default now()
    )`;

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const ds = body?.dataset;
      if (!ds || !Array.isArray(ds.applications) || !Array.isArray(ds.territories)) return res.status(400).json({ error: 'bad dataset' });
      if (ds.applications.length > 5000 || ds.territories.length > 1000) return res.status(413).json({ error: 'too large' });
      const name = String(body.fileName ?? 'upload.xlsx').slice(0, 200);
      const rows = await sql`insert into uploads (file_name, n_applications, n_territories, dataset)
        values (${name}, ${ds.applications.length}, ${ds.territories.length}, ${JSON.stringify(ds)}::jsonb) returning id`;
      return res.status(200).json({ id: rows[0].id });
    }

    if (req.method === 'GET') {
      const id = String(req.query?.id ?? '');
      if (!UUID.test(id)) return res.status(400).json({ error: 'bad id' });
      const rows = await sql`select file_name, dataset from uploads where id = ${id}::uuid`;
      if (!rows.length) return res.status(404).json({ error: 'not found' });
      return res.status(200).json({ fileName: rows[0].file_name, dataset: rows[0].dataset });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch {
    return res.status(500).json({ error: 'storage unavailable' });
  }
}
