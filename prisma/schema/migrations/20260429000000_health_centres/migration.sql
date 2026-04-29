-- CreateTable: health_centres

CREATE TABLE "health_centres" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"           VARCHAR(255) NOT NULL,
    "logo_s3_key"    VARCHAR(500),
    "phone"          VARCHAR(20),
    "email"          VARCHAR(255),
    "website"        VARCHAR(500),
    "address_line1"  VARCHAR(255) NOT NULL,
    "address_line2"  VARCHAR(255),
    "city"           VARCHAR(100) NOT NULL,
    "state"          VARCHAR(100) NOT NULL,
    "pincode"        VARCHAR(10)  NOT NULL,
    "latitude"       DOUBLE PRECISION,
    "longitude"      DOUBLE PRECISION,
    "centre_type"    VARCHAR(50)  NOT NULL,
    "specialities"   TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "is_free"        BOOLEAN      NOT NULL DEFAULT false,
    "min_fee"        DOUBLE PRECISION,
    "max_fee"        DOUBLE PRECISION,
    "services"       JSONB        NOT NULL DEFAULT '[]',
    "rating"         DOUBLE PRECISION,
    "review_count"   INTEGER      NOT NULL DEFAULT 0,
    "is_verified"    BOOLEAN      NOT NULL DEFAULT false,
    "opening_hours"  JSONB,
    "is_active"      BOOLEAN      NOT NULL DEFAULT true,
    "added_by_admin" UUID         NOT NULL,
    "notes"          VARCHAR(1000),
    "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "deleted_at"     TIMESTAMPTZ,

    CONSTRAINT "health_centres_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "health_centres_added_by_admin_fkey"
        FOREIGN KEY ("added_by_admin") REFERENCES "admin_users"("id")
);

CREATE INDEX "health_centres_is_active_idx"   ON "health_centres"("is_active");
CREATE INDEX "health_centres_city_idx"         ON "health_centres"("city");
CREATE INDEX "health_centres_state_idx"        ON "health_centres"("state");
CREATE INDEX "health_centres_pincode_idx"      ON "health_centres"("pincode");
CREATE INDEX "health_centres_centre_type_idx"  ON "health_centres"("centre_type");
CREATE INDEX "health_centres_is_free_idx"      ON "health_centres"("is_free");
CREATE INDEX "health_centres_is_verified_idx"  ON "health_centres"("is_verified");
CREATE INDEX "health_centres_created_at_idx"   ON "health_centres"("created_at");
