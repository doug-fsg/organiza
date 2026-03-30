const Database = require('better-sqlite3');
const db = new Database('./prisma/dev.db');

try {
  // Remove a migração problemática do registro
  const result = db.prepare('DELETE FROM _prisma_migrations WHERE migration_name = ?')
    .run('20260130152257_remove_condominium_field');
  
  console.log('✅ Migração problemática removida do registro');
  console.log('   Linhas afetadas:', result.changes);
  
  // Mostra as migrações restantes
  const migrations = db.prepare('SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at').all();
  console.log('\n Migrações registradas no banco:');
  migrations.forEach(m => console.log('  -', m.migration_name));
  
} catch (error) {
  console.error(' Erro:', error.message);
} finally {
  db.close();
}
