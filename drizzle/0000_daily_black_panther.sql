CREATE TABLE `deploy_observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`environment` text NOT NULL,
	`version` text NOT NULL,
	`train` integer NOT NULL,
	`patch` integer NOT NULL,
	`tag` text NOT NULL,
	`commit_sha` text NOT NULL,
	`source_updated_at` text NOT NULL,
	`observed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `deploy_observations_environment_id_idx` ON `deploy_observations` (`environment`,`id`);