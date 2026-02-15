CREATE TABLE IF NOT EXISTS "remediation_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"kc_id" uuid NOT NULL,
	"detection_type" text DEFAULT 'zombie_item' NOT NULL,
	"zombie_score" real DEFAULT 0 NOT NULL,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"remediation_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "remediation_queue" ADD CONSTRAINT "remediation_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "remediation_queue" ADD CONSTRAINT "remediation_queue_item_id_content_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "remediation_queue" ADD CONSTRAINT "remediation_queue_kc_id_knowledge_components_id_fk" FOREIGN KEY ("kc_id") REFERENCES "public"."knowledge_components"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "remediation_queue_user_item_detection_unique" ON "remediation_queue" USING btree ("user_id","item_id","detection_type");