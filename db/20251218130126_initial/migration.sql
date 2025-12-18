CREATE TABLE `arcs` (
	`id` text PRIMARY KEY,
	`timeline_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`order` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT `fk_arcs_timeline_id_timelines_id_fk` FOREIGN KEY (`timeline_id`) REFERENCES `timelines`(`id`)
);
--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` text PRIMARY KEY,
	`episode_id` text NOT NULL,
	`number` integer NOT NULL,
	`part` integer DEFAULT 1 NOT NULL,
	`pov` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`location` text NOT NULL,
	`outfit` text,
	`kink` text,
	`date` text,
	`stats` text,
	`file_path` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT `fk_chapters_episode_id_episodes_id_fk` FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`)
);
--> statement-breakpoint
CREATE TABLE `embeddings` (
	`id` text PRIMARY KEY,
	`chapter_id` text NOT NULL,
	`content` text NOT NULL,
	`embedding` blob NOT NULL,
	`characters` text,
	`metadata` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT `fk_embeddings_chapter_id_chapters_id_fk` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`)
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` text PRIMARY KEY,
	`arc_id` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT `fk_episodes_arc_id_arcs_id_fk` FOREIGN KEY (`arc_id`) REFERENCES `arcs`(`id`)
);
--> statement-breakpoint
CREATE TABLE `timelines` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
