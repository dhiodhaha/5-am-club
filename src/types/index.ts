import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder 
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface PresenceRecord {
  id: number;
  user_id: string;
  username: string;
  guild_id: string;
  present_at: Date;
  present_date: string;
  created_at: Date;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  week_presents?: string;
  total_presents?: string;
}

export interface StreakEntry {
  user_id: string;
  username: string;
  current_streak: number;
}

export interface TodayPresenceEntry {
  user_id: string;
  username: string;
  present_at: Date;
}

export interface UserStats {
  total_presents: string;
  last_present: string;
  first_present: string;
}

export interface TimeCheckResult {
  isValid: boolean;
  reason?: string;
  hint?: string;
}

