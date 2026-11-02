import test from 'node:test';import assert from 'node:assert/strict';import {validateEntry,summarize} from '../lib/finance.mjs';
test('totals',()=>assert.deepEqual(summarize([{kind:'income',amount:100},{kind:'expense',amount:40}]),{income:100,expense:40,net:60,count:2}));
test('reject negative',()=>assert.throws(()=>validateEntry({kind:'income',amount:-1,note:'Venta',date:'2026-10-28'})));
test('reject long note',()=>assert.throws(()=>validateEntry({kind:'income',amount:10,note:'x'.repeat(101),date:'2026-10-28'})));
