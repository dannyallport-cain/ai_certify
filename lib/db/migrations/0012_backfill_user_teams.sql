DO $$
DECLARE
  user_record RECORD;
  new_team_id INTEGER;
BEGIN
  FOR user_record IN
    SELECT u.id, u.name, u.email
    FROM "users" u
    LEFT JOIN "team_members" tm ON tm."user_id" = u.id
    WHERE u."deleted_at" IS NULL
      AND tm.id IS NULL
  LOOP
    INSERT INTO "teams" (
      "name",
      "created_at",
      "updated_at"
    )
    VALUES (
      COALESCE(NULLIF(BTRIM(user_record.name), ''), SPLIT_PART(user_record.email, '@', 1), 'Team'),
      NOW(),
      NOW()
    )
    RETURNING id INTO new_team_id;

    INSERT INTO "team_members" (
      "user_id",
      "team_id",
      "role",
      "joined_at"
    )
    VALUES (
      user_record.id,
      new_team_id,
      'owner',
      NOW()
    );

    UPDATE "users"
    SET "team_id" = new_team_id,
        "updated_at" = NOW()
    WHERE id = user_record.id;
  END LOOP;
END $$;
