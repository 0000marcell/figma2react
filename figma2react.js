#!/usr/bin/env node
const program = require('commander');
const fs = require('fs');

program
  .version('0.0.1')
  .description('Generates react components from figmas designs');

program
  .command('generate [projectId]')
  .alias('g')
  .description('generate react component')
  .option("-t, --token [token]", "pass your user token")
  .option("-c, --component [name]", "component name")
  .action((projectId) => {
    let config = JSON.parse(fs.readFileSync('./.figma2react'));
    console.log(config.projectId);
    console.log(config.token);
  });

program.parse(process.argv);
