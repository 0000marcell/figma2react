#!/usr/bin/env node
const fetch = require('node-fetch');
const headers = new fetch.Headers();
const figma = require('./lib/figma');
const program = require('commander');
const fs = require('fs');
const Path = require('path');

const baseUrl = 'https://api.figma.com';



const vectorMap = {};
const vectorList = [];
const vectorTypes = ['VECTOR', 'LINE', 'REGULAR_POLYGON', 'ELLIPSE', 'STAR'];

function preprocessTree(node) {
  let vectorsOnly = node.name.charAt(0) !== '#';
  let vectorVConstraint = null;
  let vectorHConstraint = null;

  function paintsRequireRender(paints) {
    if (!paints) return false;

    let numPaints = 0;
    for (const paint of paints) {
      if (paint.visible === false) continue;

      numPaints++;
      if (paint.type === 'EMOJI') return true;
    }

    return numPaints > 1;
  }

  if (paintsRequireRender(node.fills) ||
      paintsRequireRender(node.strokes) ||
      (node.blendMode != null && ['PASS_THROUGH', 'NORMAL'].indexOf(node.blendMode) < 0)) {
    node.type = 'VECTOR';
  }

  const children = node.children && node.children.filter((child) => child.visible !== false);
  if (children) {
    for (let j=0; j<children.length; j++) {
      if (vectorTypes.indexOf(children[j].type) < 0) vectorsOnly = false;
      else {
        if (vectorVConstraint != null && children[j].constraints.vertical != vectorVConstraint) vectorsOnly = false;
        if (vectorHConstraint != null && children[j].constraints.horizontal != vectorHConstraint) vectorsOnly = false;
        vectorVConstraint = children[j].constraints.vertical;
        vectorHConstraint = children[j].constraints.horizontal;
      }
    }
  }
  node.children = children;

  if (children && children.length > 0 && vectorsOnly) {
    node.type = 'VECTOR';
    node.constraints = {
      vertical: vectorVConstraint,
      horizontal: vectorHConstraint,
    };
  }

  if (vectorTypes.indexOf(node.type) >= 0) {
    node.type = 'VECTOR';
    vectorMap[node.id] = node;
    vectorList.push(node.id);
    node.children = [];
  }

  if (node.children) {
    for (const child of node.children) {
      preprocessTree(child);
    }
  }
}

async function generateComponents(data) {
  const doc = data.document;
  const canvas = doc.children[0];
  const config = data.config;
  const headers = data.headers;
  const componentsDir = `./${config.directory || 'src/components'}`;

  try {
    fs.accessSync(componentsDir);
  } catch (e) {
    fs.mkdirSync(componentsDir, { recursive: true });
  }

  let html = '';

  for (let i=0; i<canvas.children.length; i++) {
    const child = canvas.children[i]
    if (child.name.charAt(0) === '#'  && child.visible !== false) {
      const child = canvas.children[i];
      preprocessTree(child);
    }
  }

  let guids = vectorList.join(',');
  data = await fetch(`${baseUrl}/v1/images/${config.projectId}?ids=${guids}&format=svg`, {headers});
  const imageJSON = await data.json();

  const images = imageJSON.images || {};
  if (images) {
    let promises = [];
    let guids = [];
    for (const guid in images) {
      if (images[guid] == null) continue;
      guids.push(guid);
      promises.push(fetch(images[guid]));
    }

    let responses = await Promise.all(promises);
    promises = [];
    for (const resp of responses) {
      promises.push(resp.text());
    }

    responses = await Promise.all(promises);
    for (let i=0; i<responses.length; i++) {
      images[guids[i]] = responses[i].replace('<svg ', '<svg preserveAspectRatio="none" ');
    }
  }

  const componentMap = {};
  
  for (let i=0; i<canvas.children.length; i++) {
    const child = canvas.children[i]
    if (child.name.charAt(0) === '#' && child.visible !== false) {
      const child = canvas.children[i];
      figma.createComponent(child, images, componentMap);
    }
  }

  for (const key in componentMap) {
    let component = componentMap[key];
    let contents = "import React, { Component} from 'react'\n";
    contents+="\n";
    contents += component.doc + "\n";
    const path = Path.join(componentsDir, `${component.name}.js`);
    fs.writeFile(path, contents, function(err) {
      if (err) console.log(err);
      console.log(`wrote ${path}`);
    });
  }
}

async function fetchProject() {
  let config = JSON.parse(fs.readFileSync('./.figma2react'));
  headers.set('X-Figma-Token', config.token);
  let resp = await fetch(`${baseUrl}/v1/files/${config.projectId}`, 
    {headers});
  let data = await resp.json();
  data['config'] = config;
  data['headers'] = headers;
  return data;
}

program
  .version('0.1.3')
  .description('Generates react components from figmas designs');

program
  .command('generate')
  .alias('g')
  .description('generate react component')
  .option("-c, --component [name]", "component name")
  .action(async () => {
    let data = await fetchProject();
    generateComponents(data);
  });

program
  .command('watch')
  .alias('w')
  .description('watch for changes in the figma projects and generate the components')
  .action(async () => {
    let data = await fetchProject(),
      currentDate = data.lastModified;
    setInterval(async () => {
      data = await fetchProject();
      if(data.lastModified > currentDate) {
        generateComponents(data);
        currentDate = data.lastModified;
        console.log(`project changed, making modifications!`);
      }
    }, 1000);
    console.log(`watching figma project ${data.config.projectId}`);
    console.log(`last modified ${currentDate}`);
  });

program.parse(process.argv);
