#!/usr/bin/env node
'use strict';

let fs = require('fs');
let path = require('path');
let pug = require('pug');
let cleanCSS = require('clean-css');

const poems = fs.readdirSync('poems').map(fn => path.join('poems', fn)).map(readPoem);

minifyCss();
writePoems(poems);
writeIndex(poems);

function readPoem(fileName) {
  const content = fs.readFileSync(fileName, 'utf-8');
  const [header, text] = splitHeader(content);
  const [title, author] = splitAuthor(header);
  return { id: header.replace(/(\s|\.|\,)+/g, '-'), title, author, text};
}

function splitHeader(s) {
  const i = s.indexOf("\n\n");
  return [s.slice(0, i), s.slice(i + 2)];
}

function splitAuthor(s) {
  const i = s.lastIndexOf("\nby");
  return i > 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, undefined];
}

function writePoems(poems) {
  const poemToHTML = pug.compileFile('poem.pug');
  for (let i = 0, l = poems.length; i < l; i++) {
    const poem = poems[i];
    poem.prev = poems.at(i - 1).id;
    poem.next = poems.at((i + 1) % l).id;
    fs.mkdirSync(poem.id, { recursive: true });
    fs.writeFileSync(path.join(poem.id, 'index.html'), poemToHTML(poem));
  }
}

function writeIndex(poems) {
  fs.writeFileSync('index.html', pug.renderFile('index.pug', { poems }));
}

function minifyCss() {
  let styles = fs.readFileSync('./styles.css');
  fs.writeFileSync('./styles.min.css', (new cleanCSS()).minify(styles).styles);
}

fs.watch('./', (event, filename) => {
  console.log((new Date).toLocaleTimeString(), event, filename);
  if (event == 'change') {
    try {
      switch (filename) {
        case 'styles.css':
          minifyCss();
          writePoems(poems);
          writeIndex(poems);
          break;
        case 'index.pug':
          writeIndex(poems);
          break;
        case 'poem.pug':
          writePoems(poems);
          break;
      }
    } catch(error) {
      console.error(error);
    }
  }
});
