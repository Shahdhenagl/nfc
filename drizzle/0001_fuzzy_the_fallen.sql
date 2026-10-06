CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` varchar(120) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(80),
	`metadata` json,
	`ipAddress` varchar(128),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`contentType` varchar(32) NOT NULL,
	`titleEn` varchar(240) NOT NULL,
	`titleAr` varchar(240),
	`subtitle` varchar(240),
	`description` text,
	`artistOrReciter` varchar(180),
	`albumOrCategory` varchar(180),
	`durationSeconds` int,
	`mediaUrl` varchar(1000),
	`coverImage` varchar(1000),
	`metadata` json,
	`sortOrder` int NOT NULL DEFAULT 0,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'published',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int NOT NULL,
	`deviceTokenHash` varchar(128) NOT NULL,
	`fingerprint` varchar(128),
	`browser` varchar(120),
	`operatingSystem` varchar(120),
	`userAgent` text,
	`firstIp` varchar(128),
	`lastIp` varchar(128),
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`revokedAt` timestamp,
	CONSTRAINT `device_registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_registrations_deviceTokenHash_unique` UNIQUE(`deviceTokenHash`)
);
--> statement-breakpoint
CREATE TABLE `device_reset_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int NOT NULL,
	`cardId` int NOT NULL,
	`deviceId` int,
	`reason` text,
	`status` enum('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
	`requestedBy` varchar(160),
	`reviewedBy` int,
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `device_reset_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int NOT NULL,
	`contentId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `favorite_license_content_idx` UNIQUE(`licenseId`,`contentId`)
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`customerId` int,
	`licenseKey` varchar(80) NOT NULL,
	`passwordHash` varchar(220) NOT NULL,
	`status` enum('pending','active','suspended','expired','revoked') NOT NULL DEFAULT 'pending',
	`activatedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `licenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `licenses_licenseKey_unique` UNIQUE(`licenseKey`)
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int,
	`accessToken` varchar(128),
	`ipAddress` varchar(128),
	`userAgent` text,
	`deviceId` int,
	`success` boolean NOT NULL DEFAULT false,
	`failureReason` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nfc_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`licenseId` int NOT NULL,
	`nfcCode` varchar(80) NOT NULL,
	`accessToken` varchar(128) NOT NULL,
	`status` enum('available','assigned','active','suspended','disabled') NOT NULL DEFAULT 'available',
	`activatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nfc_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `nfc_cards_nfcCode_unique` UNIQUE(`nfcCode`),
	CONSTRAINT `nfc_cards_accessToken_unique` UNIQUE(`accessToken`),
	CONSTRAINT `nfc_access_token_idx` UNIQUE(`accessToken`)
);
--> statement-breakpoint
CREATE TABLE `playlist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playlistId` int NOT NULL,
	`contentId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `playlist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`nameEn` varchar(180) NOT NULL,
	`nameAr` varchar(180),
	`description` text,
	`coverImage` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `playlists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(48) NOT NULL,
	`type` enum('music','quran') NOT NULL,
	`description` text,
	`logo` varchar(500),
	`coverImage` varchar(500),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `products_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `recently_played` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseId` int NOT NULL,
	`contentId` int NOT NULL,
	`playedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recently_played_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` varchar(160);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','admin','customer') NOT NULL DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(40);--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','suspended') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_items` ADD CONSTRAINT `content_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_registrations` ADD CONSTRAINT `device_registrations_licenseId_licenses_id_fk` FOREIGN KEY (`licenseId`) REFERENCES `licenses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_reset_requests` ADD CONSTRAINT `device_reset_requests_licenseId_licenses_id_fk` FOREIGN KEY (`licenseId`) REFERENCES `licenses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_reset_requests` ADD CONSTRAINT `device_reset_requests_cardId_nfc_cards_id_fk` FOREIGN KEY (`cardId`) REFERENCES `nfc_cards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_reset_requests` ADD CONSTRAINT `device_reset_requests_deviceId_device_registrations_id_fk` FOREIGN KEY (`deviceId`) REFERENCES `device_registrations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_reset_requests` ADD CONSTRAINT `device_reset_requests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_licenseId_licenses_id_fk` FOREIGN KEY (`licenseId`) REFERENCES `licenses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_contentId_content_items_id_fk` FOREIGN KEY (`contentId`) REFERENCES `content_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `login_attempts` ADD CONSTRAINT `login_attempts_licenseId_licenses_id_fk` FOREIGN KEY (`licenseId`) REFERENCES `licenses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `login_attempts` ADD CONSTRAINT `login_attempts_deviceId_device_registrations_id_fk` FOREIGN KEY (`deviceId`) REFERENCES `device_registrations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nfc_cards` ADD CONSTRAINT `nfc_cards_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nfc_cards` ADD CONSTRAINT `nfc_cards_licenseId_licenses_id_fk` FOREIGN KEY (`licenseId`) REFERENCES `licenses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playlist_items` ADD CONSTRAINT `playlist_items_playlistId_playlists_id_fk` FOREIGN KEY (`playlistId`) REFERENCES `playlists`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playlist_items` ADD CONSTRAINT `playlist_items_contentId_content_items_id_fk` FOREIGN KEY (`contentId`) REFERENCES `content_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `playlists` ADD CONSTRAINT `playlists_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recently_played` ADD CONSTRAINT `recently_played_licenseId_licenses_id_fk` FOREIGN KEY (`licenseId`) REFERENCES `licenses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recently_played` ADD CONSTRAINT `recently_played_contentId_content_items_id_fk` FOREIGN KEY (`contentId`) REFERENCES `content_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `content_product_type_idx` ON `content_items` (`productId`,`contentType`);--> statement-breakpoint
CREATE INDEX `devices_license_idx` ON `device_registrations` (`licenseId`);--> statement-breakpoint
CREATE INDEX `reset_status_idx` ON `device_reset_requests` (`status`);--> statement-breakpoint
CREATE INDEX `reset_license_idx` ON `device_reset_requests` (`licenseId`);--> statement-breakpoint
CREATE INDEX `licenses_product_idx` ON `licenses` (`productId`);--> statement-breakpoint
CREATE INDEX `licenses_customer_idx` ON `licenses` (`customerId`);--> statement-breakpoint
CREATE INDEX `login_attempts_rate_idx` ON `login_attempts` (`accessToken`,`ipAddress`,`createdAt`);--> statement-breakpoint
CREATE INDEX `nfc_product_idx` ON `nfc_cards` (`productId`);--> statement-breakpoint
CREATE INDEX `recent_license_idx` ON `recently_played` (`licenseId`,`playedAt`);