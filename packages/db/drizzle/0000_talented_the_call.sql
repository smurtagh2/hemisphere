CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"role" text DEFAULT 'learner' NOT NULL,
	"timezone" text DEFAULT 'UTC',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kc_prerequisites" (
	"kc_id" uuid NOT NULL,
	"prerequisite_id" uuid NOT NULL,
	CONSTRAINT "kc_prerequisites_kc_id_prerequisite_id_pk" PRIMARY KEY("kc_id","prerequisite_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_components_topic_id_slug_unique" UNIQUE("topic_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"topic_path" text[] NOT NULL,
	"parent_topic_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_item_kcs" (
	"content_item_id" uuid NOT NULL,
	"kc_id" uuid NOT NULL,
	CONSTRAINT "content_item_kcs_content_item_id_kc_id_pk" PRIMARY KEY("content_item_id","kc_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"item_type" text NOT NULL,
	"stage" text NOT NULL,
	"hemisphere_mode" text NOT NULL,
	"difficulty_level" integer NOT NULL,
	"bloom_level" text NOT NULL,
	"novice_suitable" boolean DEFAULT true NOT NULL,
	"advanced_suitable" boolean DEFAULT false NOT NULL,
	"topic_id" uuid NOT NULL,
	"body" jsonb NOT NULL,
	"media_types" text[] DEFAULT '{}' NOT NULL,
	"estimated_duration_s" integer DEFAULT 30 NOT NULL,
	"file_size_bytes" integer DEFAULT 0 NOT NULL,
	"is_reviewable" boolean DEFAULT false NOT NULL,
	"review_format" text,
	"similarity_tags" text[] DEFAULT '{}' NOT NULL,
	"interleave_eligible" boolean DEFAULT false NOT NULL,
	"assessment_type" text,
	"auto_scorable" boolean DEFAULT true NOT NULL,
	"rubric_id" uuid,
	"alt_text" text,
	"transcript" text,
	"language" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"kc_id" uuid,
	"response_type" text NOT NULL,
	"learner_response" jsonb NOT NULL,
	"is_correct" boolean,
	"score" real,
	"raw_score" real,
	"scoring_method" text DEFAULT 'pending' NOT NULL,
	"llm_justification" text,
	"presented_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone NOT NULL,
	"latency_ms" integer NOT NULL,
	"stage" text NOT NULL,
	"difficulty_level" smallint NOT NULL,
	"help_requested" boolean DEFAULT false NOT NULL,
	"help_type" text,
	"self_rating" text,
	"confidence_rating" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"session_type" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_s" integer,
	"encounter_duration_s" integer,
	"analysis_duration_s" integer,
	"return_duration_s" integer,
	"planned_balance" jsonb NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"new_item_count" integer DEFAULT 0 NOT NULL,
	"review_item_count" integer DEFAULT 0 NOT NULL,
	"interleaved_count" integer DEFAULT 0 NOT NULL,
	"accuracy" real,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"abandoned_at_stage" text,
	"adaptive_decisions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learner_kc_state" (
	"user_id" uuid NOT NULL,
	"kc_id" uuid NOT NULL,
	"mastery_level" real DEFAULT 0 NOT NULL,
	"difficulty_tier" smallint DEFAULT 1 NOT NULL,
	"lh_accuracy" real DEFAULT 0 NOT NULL,
	"lh_attempts" integer DEFAULT 0 NOT NULL,
	"lh_last_accuracy" real DEFAULT 0 NOT NULL,
	"rh_score" real DEFAULT 0 NOT NULL,
	"rh_attempts" integer DEFAULT 0 NOT NULL,
	"rh_last_score" real DEFAULT 0 NOT NULL,
	"integrated_score" real DEFAULT 0 NOT NULL,
	"first_encountered" timestamp with time zone,
	"last_practiced" timestamp with time zone,
	"last_assessed_lh" timestamp with time zone,
	"last_assessed_rh" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_kc_state_user_id_kc_id_pk" PRIMARY KEY("user_id","kc_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learner_topic_proficiency" (
	"user_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"overall_proficiency" real DEFAULT 0 NOT NULL,
	"kc_count" integer DEFAULT 0 NOT NULL,
	"kc_mastered" integer DEFAULT 0 NOT NULL,
	"kc_in_progress" integer DEFAULT 0 NOT NULL,
	"kc_not_started" integer DEFAULT 0 NOT NULL,
	"encounter_engagement" real DEFAULT 0 NOT NULL,
	"analysis_accuracy" real DEFAULT 0 NOT NULL,
	"return_quality" real DEFAULT 0 NOT NULL,
	"last_session" timestamp with time zone,
	"sessions_completed" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learner_topic_proficiency_user_id_topic_id_pk" PRIMARY KEY("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fsrs_memory_state" (
	"user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"kc_id" uuid NOT NULL,
	"stability" real DEFAULT 1 NOT NULL,
	"difficulty" real DEFAULT 0.5 NOT NULL,
	"retrievability" real DEFAULT 1 NOT NULL,
	"stage_type" text NOT NULL,
	"last_review" timestamp with time zone,
	"next_review" timestamp with time zone,
	"review_count" integer DEFAULT 0 NOT NULL,
	"lapse_count" integer DEFAULT 0 NOT NULL,
	"state" text DEFAULT 'new' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fsrs_memory_state_user_id_item_id_pk" PRIMARY KEY("user_id","item_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fsrs_parameters" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"weights" real[] DEFAULT ARRAY[
        0.4072, 1.1829, 3.1262, 15.4722,
        7.2102, 0.5316, 1.0651, 0.0,
        1.5546, 0.1192, 1.0100, 1.9395,
        0.1100, 0.2939, 2.0091, 0.2415,
        2.9898, 0.5100, 0.6000
      ]::real[] NOT NULL,
	"target_retention" real DEFAULT 0.9 NOT NULL,
	"optimized_at" timestamp with time zone,
	"review_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kc_prerequisites" ADD CONSTRAINT "kc_prerequisites_kc_id_knowledge_components_id_fk" FOREIGN KEY ("kc_id") REFERENCES "public"."knowledge_components"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kc_prerequisites" ADD CONSTRAINT "kc_prerequisites_prerequisite_id_knowledge_components_id_fk" FOREIGN KEY ("prerequisite_id") REFERENCES "public"."knowledge_components"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_components" ADD CONSTRAINT "knowledge_components_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "topics" ADD CONSTRAINT "topics_parent_topic_id_topics_id_fk" FOREIGN KEY ("parent_topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_item_kcs" ADD CONSTRAINT "content_item_kcs_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_item_kcs" ADD CONSTRAINT "content_item_kcs_kc_id_knowledge_components_id_fk" FOREIGN KEY ("kc_id") REFERENCES "public"."knowledge_components"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_items" ADD CONSTRAINT "content_items_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_kc_id_knowledge_components_id_fk" FOREIGN KEY ("kc_id") REFERENCES "public"."knowledge_components"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learner_kc_state" ADD CONSTRAINT "learner_kc_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learner_kc_state" ADD CONSTRAINT "learner_kc_state_kc_id_knowledge_components_id_fk" FOREIGN KEY ("kc_id") REFERENCES "public"."knowledge_components"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learner_topic_proficiency" ADD CONSTRAINT "learner_topic_proficiency_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learner_topic_proficiency" ADD CONSTRAINT "learner_topic_proficiency_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fsrs_memory_state" ADD CONSTRAINT "fsrs_memory_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fsrs_memory_state" ADD CONSTRAINT "fsrs_memory_state_item_id_content_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fsrs_memory_state" ADD CONSTRAINT "fsrs_memory_state_kc_id_knowledge_components_id_fk" FOREIGN KEY ("kc_id") REFERENCES "public"."knowledge_components"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fsrs_parameters" ADD CONSTRAINT "fsrs_parameters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fsrs_next_review" ON "fsrs_memory_state" USING btree ("user_id","next_review");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fsrs_state" ON "fsrs_memory_state" USING btree ("user_id","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fsrs_kc" ON "fsrs_memory_state" USING btree ("kc_id");