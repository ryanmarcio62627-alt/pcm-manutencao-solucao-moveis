CREATE TABLE `pcm_machines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`sector` varchar(120) NOT NULL,
	`code` varchar(80) NOT NULL,
	`criticality` enum('Baixa','Média','Alta','Crítica') NOT NULL DEFAULT 'Média',
	`situation` enum('Operando','Parada','Em manutenção','Desativada') NOT NULL DEFAULT 'Operando',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pcm_machines_id` PRIMARY KEY(`id`),
	CONSTRAINT `pcm_machines_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `pcm_preventive_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`preventiveId` int NOT NULL,
	`executedAt` timestamp NOT NULL,
	`responsible` varchar(160) NOT NULL,
	`observation` text,
	`downtimeMinutes` int NOT NULL DEFAULT 0,
	`pending` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pcm_preventive_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pcm_preventives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`machineId` int NOT NULL,
	`machineName` varchar(160) NOT NULL,
	`sector` varchar(120) NOT NULL,
	`task` text NOT NULL,
	`scheduledDate` timestamp NOT NULL,
	`frequency` varchar(80) NOT NULL,
	`responsible` varchar(160) NOT NULL,
	`status` enum('Programada','Em execução','Concluída','Atrasada','Aguardando peça') NOT NULL DEFAULT 'Programada',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pcm_preventives_id` PRIMARY KEY(`id`)
);
