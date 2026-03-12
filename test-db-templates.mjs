#!/usr/bin/env node
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { report_disseminator_templates } from './lib/db/schema.ts';
import { desc } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const client = postgres(process.env.POSTGRES_URL);
const db = drizzle(client, { schema: { report_disseminator_templates } });

try {
  const templates = await db.select().from(report_disseminator_templates).orderBy(desc(report_disseminator_templates.id)).limit(3);
  
  console.log('\n📊 Last 3 Templates in Database:\n');
  
  if (templates.length === 0) {
    console.log('❌ No templates found in database');
  } else {
    templates.forEach(t => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📄 Template ID: ${t.id}`);
      console.log(`   Name: ${t.name}`);
      console.log(`   Status: ${t.status}`);
      console.log(`   Source File: ${t.sourceFileName}`);
      console.log(`   Created: ${t.createdAt}`);
      
      const fields = t.fields || [];
      console.log(`   \n   📋 Fields: ${fields.length} total`);
      
      if (fields.length > 0) {
        console.log('   ├─ Field List:');
        fields.slice(0, 10).forEach((f, i) => {
          const prefix = i === Math.min(9, fields.length - 1) ? '   └─' : '   ├─';
          console.log(`${prefix} [${f.fieldType}] ${f.label} (page ${f.page})`);
        });
        if (fields.length > 10) {
          console.log(`   └─ ... and ${fields.length - 10} more fields`);
        }
      } else {
        console.log('   └─ ⚠️  NO FIELDS - Template is empty!');
      }
    });
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await client.end();
} catch (error) {
  console.error('❌ Database Error:', error.message);
  console.error(error.stack);
  await client.end();
  process.exit(1);
}
