#!/usr/bin/env node
'use strict';

import { readFileSync as fread, writeFileSync as fwrite, readdirSync as readdir, mkdirSync as mkdir, watch } from 'fs';
import { join } from 'path';
import { compileFile as compile, renderFile as render } from 'pug';
import CCSS from 'clean-css';

const readPoem = fileName => {
  const content = fread(fileName, 'utf-8');
  const [header, text] = splitHeader(content);
  const [title, author] = splitAuthor(header);
  return { url: header.replace(/(\s|\.|\,)+/g, '-') + '/', title, author, text };
}

const splitHeader = s => {
  const i = s.indexOf("\n\n");
  return [s.slice(0, i), s.slice(i + 2)];
}

const splitAuthor = s => {
  const i = s.lastIndexOf("\nby");
  return i > 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, undefined];
}

const writePoems = poems => {
  const poemToHTML = compile('poem.pug');
  for (let i = 0, l = poems.length; i < l; i++) {
    const poem = poems[i];
    poem.prev = poems.at(i - 1).url;
    poem.next = poems.at((i + 1) % l).url;
    mkdir(poem.url, { recursive: true });
    fwrite(join(poem.url, 'index.html'), poemToHTML(poem));
  }
}


const writeIndex = poems => fwrite('index.html', render('index.pug', { poems }));

const minifyCSS = () => fwrite('./styles.min.css', (new CCSS()).minify(fread('./styles.css')).styles);

minifyCSS();

const poems = readdir('poems').map(p => join('poems', p)).map(readPoem);
writeIndex(poems);
writePoems(poems);
console.log('Rebuild');

console.log('Waiting for changes...')
watch('./', (event, filename) => {
  console.log((new Date).toLocaleTimeString(), event, filename);
  if (event == 'change') {
    try {
      switch (filename) {
        case 'styles.css':
          minifyCSS();
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
    } catch (error) {
      console.error(error);
    }
  }
});
