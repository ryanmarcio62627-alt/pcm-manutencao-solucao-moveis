CREATE TABLE `pcm_backup_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storageKey` varchar(255) NOT NULL,
	`storageUrl` varchar(512) NOT NULL,
	`itemCount` int NOT NULL DEFAULT 0,
	`status` enum('Concluído','Falhou') NOT NULL DEFAULT 'Concluído',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pcm_backup_runs_id` PRIMARY KEY(`id`)
);
