CREATE TABLE `lockdown_overwrites` (
	`allow` text NOT NULL,
	`channel_id` text NOT NULL,
	`deny` text NOT NULL,
	`guild_id` text NOT NULL,
	`overwrite_id` text NOT NULL,
	`overwrite_type` integer NOT NULL,
	PRIMARY KEY(`guild_id`, `channel_id`, `overwrite_id`),
	FOREIGN KEY (`guild_id`) REFERENCES `lockdown_sessions`(`guild_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lockdown_sessions` (
	`created_at` integer NOT NULL,
	`excluded_categories` text NOT NULL,
	`excluded_channels` text NOT NULL,
	`excluded_roles` text NOT NULL,
	`guild_id` text PRIMARY KEY NOT NULL,
	`reason` text,
	`type` text NOT NULL,
	`user_id` text NOT NULL
);
