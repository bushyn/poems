#!/usr/bin/env node
'use strict';

let fs = require('fs');
let path = require('path');
let jade = require('jade');
let CleanCSS = require('clean-css');
let pretty = false;

function partition(str, sep) {
    let index = str.indexOf(sep);
    if (index == -1) {
      return  {left: str, right: ''}
    } else {
      return  {left: str.slice(0, index),
              right: str.slice(index + sep.length)}
    }
}


function readPoems(files) {
  function readPoem(file) {
    let content = fs.readFileSync(file, 'utf-8');
    let parts = partition(content, '\n\n');
    let header = parts.left,
        text = parts.right;
    parts = partition(header, '\n');
    let title = parts.left,
        author = parts.right;
    return {id: (header).replace(/(\s|\.|\,)+/g, '-'),
              title: title, author: author.trim(), text: text};
  }
  return files.map(readPoem);
}

function writePoems(poems) {
  let poemHTML = jade.compileFile('./poem.jade', {pretty: pretty});

  function writePoem(poem) {
    try {
      fs.mkdirSync(poem.id);
    } catch (err) {
      if (err.code != 'EEXIST') throw err;
    }
    fs.writeFileSync(poem.id + '/index.html', poemHTML(poem));
  }

  for(let i = 0, l = poems.length; i < l; i++) {
    let poem = poems[i];
    poem.prev = i? poems[i-1].id : poems[l-1].id;
    poem.next = (i==l-1)? poems[0].id : poems[i+1].id;
    writePoem(poem);
  }
}

function writeIndex(poems) {
  let indexHTML = jade.compileFile('./index.jade', {pretty: pretty});
  fs.writeFileSync('./index.html', indexHTML({poems:poems}));
}

function minifyCss() {
  let styles = fs.readFileSync('./styles.css');
  fs.writeFileSync('./styles.min.css', (new CleanCSS()).minify(styles).styles);
}

if (!pretty) minifyCss();

let files = fs.readdirSync('./poems').map(f => path.join('./poems', f));
let poems = readPoems(files);
writePoems(poems);
writeIndex(poems);

fs.watch('./', (event, filename) => {
  console.log((new Date).toLocaleTimeString(), event, filename);
  if (event == 'change') {
    try {
      switch (filename) {
        case 'styles.css':
          if (!pretty) minifyCss();
          writePoems(poems);
          writeIndex(poems);
          break;
        case 'index.jade':
          writeIndex(poems);
          break;
        case 'poem.jade':
          writePoems(poems);
          break;
      }
    } catch(error) {
      console.error(error);
    }
  }
});
