import sql from './connection.js';

async function migrate(): Promise<void> {
  console.log('🔄 Running migrations...');

  try {
    await createPresenceRecordsTable();
    await createPresenceIndex();
    await createLeaderboardView();
    await createGuildSettingsTable();
    await createHolidaysTable();

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function createPresenceRecordsTable(): Promise<void> {
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
}

async function createPresenceIndex(): Promise<void> {
  await sql`
    CREATE INDEX IF NOT EXISTS idx_presence_guild_date
    ON presence_records(guild_id, present_date)
  `;
  console.log('✅ Created index on guild_id and present_date');

  // Index for user-specific queries (streak calculation)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_presence_user_guild
    ON presence_records(user_id, guild_id, present_date DESC)
  `;
  console.log('✅ Created index on user_id, guild_id, present_date');
}

async function createLeaderboardView(): Promise<void> {
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
}

async function createGuildSettingsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS guild_settings (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL UNIQUE,
      fiveam_channel_id VARCHAR(255),
      timezone VARCHAR(100) DEFAULT 'Asia/Jakarta',
      setup_by_user_id VARCHAR(255),
      setup_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  console.log('✅ Created guild_settings table');

  // Add timezone column if it doesn't exist (for existing installations)
  await sql`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guild_settings' AND column_name = 'timezone'
      ) THEN 
        ALTER TABLE guild_settings ADD COLUMN timezone VARCHAR(100) DEFAULT 'Asia/Jakarta';
      END IF;
    END $$;
  `;
  console.log('✅ Ensured timezone column exists');
}

async function createHolidaysTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS guild_holidays (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(255) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'custom',
      source VARCHAR(50) NOT NULL DEFAULT 'manual',
      created_by VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  console.log('✅ Created guild_holidays table');

  // Create index for efficient holiday lookups
  await sql`
    CREATE INDEX IF NOT EXISTS idx_holidays_guild_dates 
    ON guild_holidays(guild_id, start_date, end_date)
  `;
  console.log('✅ Created index on guild_holidays');
}

migrate();
