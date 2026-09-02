CREATE TABLE `pcm_preventive_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`preventiveId` int NOT NULL,
	`action` enum('Edição','Cancelamento') NOT NULL,
	`actorUsername` varchar(80) NOT NULL,
	`actorRole` varchar(32) NOT NULL,
	`reason` text,
	`changes` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pcm_preventive_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pcm_preventives` MODIFY COLUMN `status` enum('Programada','Em execução','Concluída','Atrasada','Aguardando peça','Cancelada') NOT NULL DEFAULT 'Programada';