CREATE TABLE `guild_config` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`starboard_channel_id` text,
	`starboard_threshold` integer DEFAULT 3,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `starboard_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`original_message_id` text NOT NULL,
	`original_channel_id` text NOT NULL,
	`starboard_message_id` text NOT NULL,
	`star_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
