import sql from './connection.js';

async function migrate(): Promise<void> {
  console.log('🔄 Running migrations...');

  try {
    // Create presence_records table
    await sql`
      CREATE TABLE IF NOT EXISTS presence_records (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        guild_id VARCHAR(255) NOT NULL,
        present_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        present_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, guild_id, present_date)
      )
    `;
    console.log('✅ Created presence_records table');

    // Create index for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_presence_guild_date 
      ON presence_records(guild_id, present_date)
    `;
    console.log('✅ Created index on guild_id and present_date');

    // Create leaderboard_stats view for easy querying
    await sql`
      CREATE OR REPLACE VIEW leaderboard_stats AS
      SELECT 
        user_id,
        username,
        guild_id,
        COUNT(*) as total_presents,
        MAX(present_date) as last_present
      FROM presence_records
      GROUP BY user_id, username, guild_id
    `;
    console.log('✅ Created leaderboard_stats view');

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

