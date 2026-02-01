CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`guild_id` text,
	`message` text NOT NULL,
	`remind_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
