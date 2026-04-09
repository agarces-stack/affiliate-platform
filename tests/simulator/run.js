#!/usr/bin/env node
// MagnetRaffic System Simulator - Main Runner
// Usage: node tests/simulator/run.js [scenario-name]

const fs = require('fs');
const path = require('path');
const { log, c, printSummary, stats } = require('./simulator');

async function main() {
    stats.startTime = Date.now();

    log('', 'reset');
    log('╔══════════════════════════════════════════════════╗', 'cyan');
    log('║                                                  ║', 'cyan');
    log('║         MagnetRaffic System Simulator            ║', 'cyan');
    log('║              End-to-End Testing                   ║', 'cyan');
    log('║                                                  ║', 'cyan');
    log('╚══════════════════════════════════════════════════╝', 'cyan');

    const scenariosDir = path.join(__dirname, 'scenarios');
    const allScenarios = fs.readdirSync(scenariosDir)
        .filter(f => f.endsWith('.js'))
        .map(f => f.replace('.js', ''));

    // CLI arg: run specific scenario
    const arg = process.argv[2];
    const toRun = arg ? allScenarios.filter(s => s.includes(arg)) : allScenarios;

    if (toRun.length === 0) {
        log(`\nNo scenarios found${arg ? ` matching "${arg}"` : ''}`, 'red');
        log(`Available: ${allScenarios.join(', ')}`, 'gray');
        process.exit(1);
    }

    log(`\nRunning ${toRun.length} scenario(s)...`, 'blue');

    for (const name of toRun) {
        try {
            const scenario = require(path.join(scenariosDir, name));
            await scenario();
        } catch (err) {
            log(`\nError in scenario ${name}:`, 'red');
            console.error(err);
        }
    }

    const exitCode = printSummary();
    process.exit(exitCode);
}

main().catch(err => {
    console.error('Simulator crashed:', err);
    process.exit(1);
});
