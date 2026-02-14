CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by" text,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learner_behavioral_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"sessions_last_7_days" integer DEFAULT 0 NOT NULL,
	"sessions_last_30_days" integer DEFAULT 0 NOT NULL,
	"average_session_duration_s" real DEFAULT 0 NOT NULL,
	"session_duration_trend" real DEFAULT 0 NOT NULL,
	"preferred_session_time" text DEFAULT 'evening' NOT NULL,
	"session_completion_rate" real DEFAULT 1 NOT NULL,
	"average_latency_ms" real DEFAULT 0 NOT NULL,
	"latency_by_type" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"latency_trend" real DEFAULT 0 NOT NULL,
	"help_request_rate" real DEFAULT 0 NOT NULL,
	"help_type_distribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"help_request_trend" real DEFAULT 0 NOT NULL,
	"encounter_time_ratio" real DEFAULT 0.25 NOT NULL,
	"analysis_time_ratio" real DEFAULT 0.5 NOT NULL,
	"return_time_ratio" real DEFAULT 0.25 NOT NULL,
	"encounter_engagement_score" real DEFAULT 0 NOT NULL,
	"return_engagement_score" real DEFAULT 0 NOT NULL,
	"confidence_accuracy_corr" real DEFAULT 0 NOT NULL,
	"calibration_gap" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learner_cognitive_profile" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"hemisphere_balance_score" real DEFAULT 0 NOT NULL,
	"hbs_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hbs_trend" real DEFAULT 0 NOT NULL,
	"modality_preferences" jsonb DEFAULT '{"visual":0.25,"auditory":0.25,"textual":0.25,"kinesthetic":0.25}'::jsonb NOT NULL,
	"metacognitive_accuracy" real DEFAULT 0.5 NOT NULL,
	"metacognitive_trend" real DEFAULT 0 NOT NULL,
	"learning_velocity" real DEFAULT 0 NOT NULL,
	"velocity_by_difficulty" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"velocity_trend" real DEFAULT 0 NOT NULL,
	"strongest_assessment_types" text[] DEFAULT '{}' NOT NULL,
	"weakest_assessment_types" text[] DEFAULT '{}' NOT NULL,
	"strongest_topics" text[] DEFAULT '{}' NOT NULL,
	"weakest_topics" text[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learner_motivational_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"engagement_trend" text DEFAULT 'stable' NOT NULL,
	"engagement_score" real DEFAULT 0.5 NOT NULL,
	"engagement_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"topic_choice_rate" real DEFAULT 0 NOT NULL,
	"exploration_rate" real DEFAULT 0 NOT NULL,
	"preferred_session_type" text DEFAULT 'standard' NOT NULL,
	"challenge_tolerance" real DEFAULT 0.5 NOT NULL,
	"session_abandonment_rate" real DEFAULT 0 NOT NULL,
	"abandonment_stage" jsonb DEFAULT '{"encounter":0,"analysis":0,"return":0}'::jsonb NOT NULL,
	"last_active" timestamp with time zone,
	"days_since_last_session" integer DEFAULT 0 NOT NULL,
	"dropout_risk" text DEFAULT 'low' NOT NULL,
	"burnout_risk" text DEFAULT 'low' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learner_behavioral_state" ADD CONSTRAINT "learner_behavioral_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learner_cognitive_profile" ADD CONSTRAINT "learner_cognitive_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learner_motivational_state" ADD CONSTRAINT "learner_motivational_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
