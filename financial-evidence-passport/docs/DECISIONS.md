# Decisions log
2026-11-01: Select Financial Evidence Passport from Week 2; restrict core to record/summarize/export.
2026-11-01: Demo data stays in browser memory; authenticated records use Supabase RLS.
2026-11-01: No AI model needed for the core; do not claim AI output.
Next move: verify Crystal Ball Brief, configure Supabase Google OAuth and Vercel project, run full test and deploy.
## Validación del primer despliegue

Fecha: 2026-11-01

Se publicó Financial Evidence Passport en Vercel.

Pruebas realizadas:
- Registro de ingresos: correcto.
- Registro de gastos: correcto.
- Actualización automática del balance: correcto.
- Visualización del historial: correcto.
- Descarga de CSV: correcto.

Resultado: las funciones principales respondieron correctamente.

Limitación: en modo demostración, los datos no se conservan
al recargar la página.

Próximo paso: mejorar la experiencia del usuario y realizar
un segundo despliegue.
