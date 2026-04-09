// MagnetRaffic System Simulator
// Ejecuta escenarios completos del sistema con DB en memoria

// Inject mock DB BEFORE requiring any services
const path = require('path');
const mockDb = require('./mock-db');
const dbPath = path.resolve(__dirname, '../../src/models/db.js');
require.cache[dbPath] = {
    exports: mockDb, loaded: true, id: dbPath, filename: dbPath
};

// ANSI colors
const c = {
    reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', gray: '\x1b[90m'
};

let stats = { scenarios: 0, steps: 0, passed: 0, failed: 0, startTime: 0 };

function log(msg, color = 'reset') { console.log(c[color] + msg + c.reset); }
function step(label) { stats.steps++; process.stdout.write(c.dim + '  → ' + label + c.reset + ' ... '); }
function ok(msg = 'OK') { stats.passed++; console.log(c.green + '✓ ' + msg + c.reset); }
function fail(msg) { stats.failed++; console.log(c.red + '✗ ' + msg + c.reset); }
function info(msg) { console.log(c.dim + '    ' + msg + c.reset); }

function scenario(name, fn) {
    return async () => {
        stats.scenarios++;
        log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
        log('▶ ' + name, 'bold');
        log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
        mockDb.reset();
        try {
            await fn();
        } catch (err) {
            fail(`Scenario error: ${err.message}`);
            if (process.env.VERBOSE) console.error(err.stack);
        }
    };
}

function assert(cond, label) {
    step(label);
    if (cond) ok();
    else fail('Assertion failed');
    return cond;
}

function assertEq(actual, expected, label) {
    step(label);
    if (actual === expected) { ok(`${actual}`); return true; }
    fail(`expected ${expected}, got ${actual}`);
    return false;
}

function assertClose(actual, expected, label, tolerance = 0.01) {
    step(label);
    if (Math.abs(actual - expected) < tolerance) { ok(`$${actual.toFixed(2)}`); return true; }
    fail(`expected ~$${expected.toFixed(2)}, got $${actual.toFixed(2)}`);
    return false;
}

// Summary al final
function printSummary() {
    const elapsed = Date.now() - stats.startTime;
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('SIMULATION SUMMARY', 'bold');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log(`Scenarios:  ${stats.scenarios}`, 'blue');
    log(`Steps:      ${stats.steps}`, 'blue');
    log(`Passed:     ${stats.passed}`, stats.failed === 0 ? 'green' : 'yellow');
    log(`Failed:     ${stats.failed}`, stats.failed === 0 ? 'gray' : 'red');
    log(`Duration:   ${elapsed}ms`, 'gray');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    if (stats.failed === 0) {
        log('✓ ALL SCENARIOS PASSED', 'green');
    } else {
        log(`✗ ${stats.failed} ASSERTION(S) FAILED`, 'red');
    }
    return stats.failed === 0 ? 0 : 1;
}

module.exports = {
    c, log, step, ok, fail, info, scenario, assert, assertEq, assertClose,
    printSummary, mockDb, stats
};
