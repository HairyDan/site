(function() {
  function esc(s) {
      return s.replace(/[&<>"']/g, m => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
      } [m]));
  }

  function inline(s, refIx) {
      s = s.replace(/`([^`]+)`/g, (_, a) => `<code>${esc(a)}</code>`)
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\*([^*]+)\*/g, '<em>$1</em>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href=\"$2\" target=\"_blank\" rel=\"noopener noreferrer\">$1</a>')
          .replace(/\[\^([^\]]+)\]/g, (_, id) => {
              const n = refIx.get(id) || (refIx.set(id, refIx.size + 1), refIx.get(id));
              return `<a class=\"fn-ref\" href=\"#fn-${id}\">[${n}]</a>`
          });
      return s;
  }

  function parse(md) {
      const lines = md.replace(/\r\n/g, '\n').split('\n');
      const foots = new Map(),
          body = [];
      let i = 0;
      while (i < lines.length) {
          const m = lines[i].match(/^\[\^([^\]]+)\]:\s*(.*)$/);
          if (m) {
              const id = m[1];
              let txt = m[2];
              i++;
              while (i < lines.length && (/^\s{2,}\S/.test(lines[i]) || lines[i] === '')) {
                  txt += '\n' + lines[i].replace(/^\s{2}/, '');
                  i++;
              }
              foots.set(id, txt.trim());
          } else {
              body.push(lines[i]);
              i++;
          }
      }
      const out = [],
          refIx = new Map();
      let buf = [];
      const flush = () => {
          if (buf.length) {
              out.push(`<p>${inline(buf.join(' '), refIx)}</p>`);
              buf.length = 0;
          }
      };
      i = 0;
      while (i < body.length) {
          const line = body[i];
          if (/^#{1,6}\s/.test(line)) {
              flush();
              const m = line.match(/^(#{1,6})\s+(.*)$/);
              const lvl = Math.min(3, m[1].length);
              out.push(`<h${lvl} class=\"section-title\">${inline(m[2], refIx)}</h${lvl}>`);
              i++;
              continue;
          }
          if (/^\s*[-*]\s+/.test(line)) {
              flush();
              const items = [];
              while (i < body.length && /^\s*[-*]\s+/.test(body[i])) {
                  items.push(body[i].replace(/^\s*[-*]\s+/, ''));
                  i++;
              }
              out.push('<ul>' + items.map(it => `<li>${inline(it, refIx)}</li>`).join('') + '</ul>');
              continue;
          }
          if (/^\s*\d+\.\s+/.test(line)) {
              flush();
              const items = [];
              while (i < body.length && /^\s*\d+\.\s+/.test(body[i])) {
                  items.push(body[i].replace(/^\s*\d+\.\s+/, ''));
                  i++;
              }
              out.push('<ol>' + items.map(it => `<li>${inline(it, refIx)}</li>`).join('') + '</ol>');
              continue;
          }
          if (/^\s*$/.test(line)) {
              flush();
              i++;
              continue;
          }
          buf.push(line.trim());
          i++;
      }
      flush();
      if (foots.size) {
          const lis = [...foots.entries()].map(([id, txt]) => `<li id=\"fn-${id}\">${inline(txt, refIx)}</li>`).join('');
          out.push(`<section class=\"footnotes\"><ol>${lis}</ol></section>`);
      }
      return out.join('\n');
  }
  window.microMarkdown = parse;
})();