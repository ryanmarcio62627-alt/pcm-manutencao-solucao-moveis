CREATE TABLE `pcm_local_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(80) NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`passwordHash` text NOT NULL,
	`role` enum('pcm','campo') NOT NULL DEFAULT 'campo',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pcm_local_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `pcm_local_accounts_username_unique` UNIQUE(`username`)
);
