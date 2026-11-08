'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { validateEntry, summarize } from '../lib/finance.mjs';
import { validateFeedback } from '../lib/feedback.mjs';

const demo = [
  {
    id: 'd1',
    kind: 'income',
    amount: 850,
    note: 'Venta de comida',
    date: '2026-10-28'
  },
  {
    id: 'd2',
    kind: 'expense',
    amount: 240,
    note: 'Compra de insumos',
    date: '2026-10-28'
  },
  {
    id: 'd3',
    kind: 'income',
    amount: 1100,
    note: 'Ventas del día',
    date: '2026-10-29'
  }
];

const money = (n) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(n);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export default function Home() {
  const [session, setSession] = useState(null);
  const [rows, setRows] = useState(demo);

  const [kind, setKind] = useState('income');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // WEEK 13 — FEEDBACK
  const [feedbackType, setFeedbackType] = useState('confusion');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  // WEEK 13 — SESSION ANALYTICS
  const [events, setEvents] = useState([]);

  const live = !!session;

  const totals = useMemo(() => summarize(rows), [rows]);

  function trackEvent(eventName) {
    setEvents((previous) => [
      ...previous.slice(-49),
      {
        event: eventName,
        timestamp: new Date().toISOString()
      }
    ]);
  }

  // AUTHENTICATION
  useEffect(() => {
    if (!client) return;

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // LOAD FINANCIAL ENTRIES
  useEffect(() => {
    if (!live || !client) return;

    let active = true;

    client
      .from('entries')
      .select('id,kind,amount,note,date')
      .order('date', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          setError(error.message);
        } else {
          setRows(data || []);
        }
      });

    return () => {
      active = false;
    };
  }, [live]);

  // ADD FINANCIAL ENTRY
  async function add(e) {
    e.preventDefault();
    setError('');

    try {
      const entry = validateEntry({
        kind,
        amount,
        note,
        date
      });

      setBusy(true);

      if (live && client) {
        const { data, error } = await client
          .from('entries')
          .insert({
            ...entry,
            user_id: session.user.id
          })
          .select('id,kind,amount,note,date')
          .single();

        if (error) throw error;

        setRows((previous) => [data, ...previous]);
      } else {
        setRows((previous) => [
          {
            ...entry,
            id: crypto.randomUUID()
          },
          ...previous
        ]);
      }

      setAmount('');
      setNote('');

      trackEvent('financial_entry_created');
    } catch (err) {
      setError(err.message);
      trackEvent('financial_entry_error');
    } finally {
      setBusy(false);
    }
  }

  // EXPORT CSV
  function exportCsv() {
    const content = [
      ['fecha', 'tipo', 'monto_mxn', 'descripcion'],
      ...rows.map((r) => [
        r.date,
        r.kind,
        r.amount,
        r.note
      ])
    ]
      .map((row) =>
        row
          .map((value) => {
            let text = String(value);

            // Prevent spreadsheet formula injection.
            if (/^[\s]*[=+\-@]/.test(text)) {
              text = "'" + text;
            }

            return '"' + text.replaceAll('"', '""') + '"';
          })
          .join(',')
      )
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + content], {
      type: 'text/csv;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'pasaporte-financiero.csv';
    a.click();

    URL.revokeObjectURL(url);

    trackEvent('csv_downloaded');
  }

  // WEEK 13 — SUBMIT FEEDBACK
  async function submitFeedback(e) {
    e.preventDefault();

    setFeedbackStatus('');

    try {
      const validated = validateFeedback({
        type: feedbackType,
        message: feedbackMessage
      });

      setFeedbackBusy(true);

      if (live && client) {
        const { error } = await client
          .from('feedback')
          .insert({
            user_id: session.user.id,
            type: validated.type,
            message: validated.message
          });

        if (error) throw error;

        setFeedbackStatus(
          '¡Gracias! Tu comentario fue guardado correctamente.'
        );
      } else {
        setFeedbackStatus(
          'Prueba completada en modo demostración. ' +
          'El comentario no se guardó en el servidor.'
        );
      }

      setFeedbackMessage('');
      trackEvent('feedback_submitted');
    } catch (err) {
      setFeedbackStatus('Error: ' + err.message);
      trackEvent('feedback_error');
    } finally {
      setFeedbackBusy(false);
    }
  }

  return (
    <main className="max-w-6xl mx-auto p-5 md:p-10">

      {/* HEADER */}
      <header className="flex flex-wrap justify-between gap-4 items-center mb-9">
        <div>
          <div className="text-sm font-bold tracking-widest text-teal-700">
            EVIDENCIA · MÉXICO
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">
            Tu trabajo merece pruebas.
          </h1>

          <p className="muted mt-2">
            Convierte movimientos cotidianos en un resumen
            financiero comprensible.
          </p>
        </div>

        <div>
          {client ? (
            live ? (
              <button
                className="btn"
                onClick={() => client.auth.signOut()}
              >
                Cerrar sesión
              </button>
            ) : (
              <button
                className="btn"
                onClick={() =>
                  client.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: window.location.origin
                    }
                  })
                }
              >
                Entrar con Google
              </button>
            )
          ) : (
            <span className="text-sm bg-amber-100 px-3 py-2 rounded-lg">
              Modo demostración
            </span>
          )}
        </div>
      </header>

      {/* SECURITY NOTICE */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6 text-sm">
        <strong>
          {live
            ? 'Cuenta privada'
            : 'DATOS FICTICIOS · DEMOSTRACIÓN'}
        </strong>

        {' — '}

        {live
          ? 'Tus movimientos se guardan en tu cuenta.'
          : 'No ingreses datos personales. Los movimientos no se guardan en el servidor.'}

        {' '}

        Este resumen no es una constancia bancaria
        ni garantiza crédito.
      </div>

      {/* FINANCIAL SUMMARY */}
      <section className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          ['Ingresos', totals.income],
          ['Gastos', totals.expense],
          ['Balance', totals.net]
        ].map(([label, value]) => (
          <div className="card" key={label}>
            <div className="muted text-sm">
              {label}
            </div>

            <div className="text-3xl font-bold mt-2">
              {money(value)}
            </div>
          </div>
        ))}
      </section>

      {/* FINANCIAL FORM AND TABLE */}
      <div className="grid md:grid-cols-5 gap-6">

        <section className="card md:col-span-2">
          <h2 className="text-xl font-bold mb-1">
            Registrar movimiento
          </h2>

          <p className="muted text-sm mb-5">
            Solo cuatro datos. Sin subir documentos.
          </p>

          <form onSubmit={add} className="space-y-4">

            <label className="block text-sm font-bold">
              Tipo
              <select
                className="field mt-1"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
              </select>
            </label>

            <label className="block text-sm font-bold">
              Monto (MXN)
              <input
                className="field mt-1"
                type="number"
                min="0.01"
                max="100000000"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="850.00"
              />
            </label>

            <label className="block text-sm font-bold">
              Descripción
              <input
                className="field mt-1"
                maxLength="100"
                minLength="2"
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Venta de comida"
              />
            </label>

            <label className="block text-sm font-bold">
              Fecha
              <input
                className="field mt-1"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            {error && (
              <p role="alert" className="text-red-700 text-sm">
                {error}
              </p>
            )}

            <button disabled={busy} className="btn w-full">
              {busy ? 'Guardando…' : 'Agregar movimiento'}
            </button>
          </form>
        </section>

        <section className="card md:col-span-3">
          <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold">
                Mi evidencia
              </h2>

              <p className="muted text-sm">
                {totals.count} movimientos registrados
              </p>
            </div>

            <button
              className="btn"
              onClick={exportCsv}
            >
              Descargar CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="py-3">Fecha</th>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th className="text-right">Monto</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr className="border-b" key={r.id}>
                    <td className="py-4">{r.date}</td>
                    <td>{r.note}</td>
                    <td>
                      {r.kind === 'income'
                        ? 'Ingreso'
                        : 'Gasto'}
                    </td>
                    <td className="text-right font-bold">
                      {money(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!rows.length && (
            <p className="muted mt-8">
              Todavía no hay movimientos.
              Agrega el primero.
            </p>
          )}

          <p className="muted text-xs mt-8">
            El CSV refleja datos proporcionados por el usuario.
            No verifica su autenticidad.
          </p>
        </section>
      </div>

      {/* WEEK 13 — FEEDBACK */}
      <section className="card mt-8">
        <div className="mb-5">
          <div className="text-sm font-bold text-teal-700">
            WEEK 13 · ADVERSARY
          </div>

          <h2 className="text-2xl font-bold mt-2">
            Ayúdanos a mejorar
          </h2>

          <p className="muted text-sm mt-2">
            ¿Encontraste un error?
            ¿Algo no quedó claro?
            Queremos conocer tu experiencia.
          </p>
        </div>

        <form
          onSubmit={submitFeedback}
          className="space-y-4"
        >
          <label className="block text-sm font-bold">
            ¿Qué quieres reportar?

            <select
              className="field mt-1"
              value={feedbackType}
              onChange={(e) =>
                setFeedbackType(e.target.value)
              }
            >
              <option value="confusion">
                Algo que no entendí
              </option>

              <option value="bug">
                Un error de la aplicación
              </option>

              <option value="suggestion">
                Una sugerencia
              </option>
            </select>
          </label>

          <label className="block text-sm font-bold">
            Cuéntanos qué pasó

            <textarea
              className="field mt-1"
              rows="4"
              minLength="5"
              maxLength="500"
              required
              value={feedbackMessage}
              onChange={(e) =>
                setFeedbackMessage(e.target.value)
              }
              placeholder="Por ejemplo: No entendí cómo descargar mi resumen..."
            />
          </label>

          <p className="muted text-xs">
            No escribas contraseñas, datos bancarios
            ni información personal sensible.
          </p>

          {feedbackStatus && (
            <p role="status" className="text-sm">
              {feedbackStatus}
            </p>
          )}

          <button
            type="submit"
            className="btn"
            disabled={feedbackBusy}
          >
            {feedbackBusy
              ? 'Enviando…'
              : 'Enviar comentario'}
          </button>
        </form>
      </section>

      {/* WEEK 13 — SESSION ANALYTICS */}
      <section className="card mt-8">
        <div className="text-sm font-bold text-teal-700">
          ANALYTICS · WEEK 13
        </div>

        <h2 className="text-xl font-bold mt-2">
          Actividad de esta sesión
        </h2>

        <p className="muted text-sm mt-2">
          Registro temporal de acciones.
          No incluye información financiera personal.
          Se reinicia al recargar la página.
        </p>

        <div className="mt-5 grid md:grid-cols-3 gap-4">
          <div className="bg-teal-50 rounded-xl p-4">
            <div className="text-sm">
              Eventos registrados
            </div>

            <div className="text-2xl font-bold">
              {events.length}
            </div>
          </div>

          <div className="bg-teal-50 rounded-xl p-4">
            <div className="text-sm">
              Movimientos agregados
            </div>

            <div className="text-2xl font-bold">
              {
                events.filter(
                  (e) =>
                    e.event === 'financial_entry_created'
                ).length
              }
            </div>
          </div>

          <div className="bg-teal-50 rounded-xl p-4">
            <div className="text-sm">
              Comentarios enviados
            </div>

            <div className="text-2xl font-bold">
              {
                events.filter(
                  (e) =>
                    e.event === 'feedback_submitted'
                ).length
              }
            </div>
          </div>
        </div>

        <h3 className="font-bold mt-6 mb-3">
          Registro de eventos
        </h3>

        {events.length === 0 ? (
          <p className="muted text-sm">
            Todavía no hay actividad registrada.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {events.map((event, index) => (
              <li
                key={index}
                className="border-b pb-2"
              >
                <strong>{event.event}</strong>
                {' — '}
                {new Date(
                  event.timestamp
                ).toLocaleTimeString('es-MX')}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* FOOTER */}
      <footer className="text-center text-sm muted mt-10">
        Financial Evidence Passport · México
        <br />
        Week 13 — Real Humans · Adversary
        <br />
        Los registros son autodeclarados y no constituyen
        evidencia bancaria verificada.
      </footer>

    </main>
  );
}
