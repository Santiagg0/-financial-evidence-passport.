-- WEEK 13: ADVERSARY
-- Feedback seguro para Financial Evidence Passport

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    type TEXT NOT NULL
        CHECK (
            type IN ('confusion', 'bug', 'suggestion')
        ),

    message TEXT NOT NULL
        CHECK (
            char_length(trim(message)) BETWEEN 5 AND 500
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activar Row Level Security

ALTER TABLE public.feedback
ENABLE ROW LEVEL SECURITY;

-- Cada usuario puede consultar sus comentarios

CREATE POLICY "feedback_read_own"
ON public.feedback
FOR SELECT
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
);

-- Cada usuario puede guardar sus comentarios

CREATE POLICY "feedback_insert_own"
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = user_id
);

-- Cada usuario puede eliminar sus comentarios

CREATE POLICY "feedback_delete_own"
ON public.feedback
FOR DELETE
TO authenticated
USING (
    (SELECT auth.uid()) = user_id
);
