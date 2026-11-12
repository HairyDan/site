(() => {
  const operators=['>>>=','===','!==','**=','>>>','<<=','>>=','&&=','||=','??=','=>','==','!=','<=','>=','++','--','+=','-=','*=','/=','%=','&&','||','??','?.','**','<<','>>','&=','|=','^=','...'];
  const controls=new Set(['if','while','for','with','switch','catch']);
  const prefix=new Set(['return','throw','case','delete','void','typeof','new','in','of','yield','await','else','do','instanceof']);
  function tokenize(source,start=0,stopAtBrace=false) {
    const tokens=[],groups=[]; let i=start,canEnd=false,lastCode=null,functionExpression=null;
    const add=(type,text,begin,newline=false,extra={})=>{
      const token={type,text,start:begin,end:i,newline,...extra};
      tokens.push(token);if(type!=='comment') lastCode=token;
    };
    while(i<source.length) {
      let newline=false;
      while(/\s/.test(source[i]||'') && i<source.length) {if(source[i]==='\n'||source[i]==='\r') newline=true;i++;}
      if(i>=source.length) break;
      const begin=i,c=source[i],previous=lastCode;
      if(c==='}' && stopAtBrace && !groups.length) return {tokens,end:i+1};
      if(source.startsWith('//',i)) {
        i+=2;while(i<source.length && source[i]!=='\n' && source[i]!=='\r') i++;
        add('comment',source.slice(begin,i),begin,newline);continue;
      }
      if(source.startsWith('/*',i)) {
        const end=source.indexOf('*/',i+2);if(end<0) throw new Error('unfinished block comment.');
        i=end+2;add('comment',source.slice(begin,i),begin,newline);continue;
      }
      if(c==='"'||c==="'") {
        i++;
        while(i<source.length && source[i]!==c) {if(source[i]==='\\') i+=2;else i++;}
        if(i>=source.length) throw new Error('unfinished string.');
        i++;add('string',source.slice(begin,i),begin,newline);canEnd=true;continue;
      }
      if(c==='\x60') {
        i++;
        while(i<source.length) {
          if(source[i]==='\\') {i+=2;continue;}
          if(source[i]==='\x60') {i++;break;}
          if(source.startsWith('${',i)) {i=tokenize(source,i+2,true).end;continue;}
          i++;
        }
        if(source[i-1]!=='\x60') throw new Error('unfinished template literal.');
        add('template',source.slice(begin,i),begin,newline);canEnd=true;continue;
      }
      if(c==='/' && !canEnd) {
        let inClass=false,closed=false;i++;
        while(i<source.length) {
          const ch=source[i++];
          if(ch==='\\') {i++;continue;}
          if(ch==='[') inClass=true;
          if(ch===']') inClass=false;
          if(ch==='/'&&!inClass) {closed=true;break;}
          if(ch==='\n'||ch==='\r') break;
        }
        if(!closed) throw new Error('unfinished regular expression.');
        while(/[a-z]/i.test(source[i]||'') && i<source.length) i++;
        add('regex',source.slice(begin,i),begin,newline);canEnd=true;continue;
      }
      if(/[a-zA-Z_$\u0080-\uffff]/.test(c)) {
        i++;while(/[\w$\u0080-\uffff]/.test(source[i]||'') && i<source.length) i++;
        const text=source.slice(begin,i);
        if(text==='function') functionExpression=!!previous && ['=','(', '[',',',':','return','=>'].includes(previous.text);
        add('identifier',text,begin,newline);
        canEnd=!prefix.has(text)&&!controls.has(text)&&!['var','let','const','function','class','extends','try','finally','default'].includes(text);
        continue;
      }
      if(/\d/.test(c) || (c==='.' && /\d/.test(source[i+1]||''))) {
        const match=/^(?:0[xX][\da-fA-F_]+n?|0[bB][01_]+n?|0[oO][0-7_]+n?|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?[\d_]+)?n?)/.exec(source.slice(i));
        if(!match) throw new Error('unrecognised number.');
        i+=match[0].length;add('number',match[0],begin,newline);canEnd=true;continue;
      }
      let text=operators.find(op=>source.startsWith(op,i));
      if(text==='?.' && /\d/.test(source[i+2]||'')) text='?';
      text ||= c;i+=text.length;
      const extra={};
      if(text==='(') {const control=controls.has(previous?.text);groups.push({text,control,functionExpression});functionExpression=null;extra.control=control;canEnd=false;}
      else if(text==='[') {groups.push({text});canEnd=false;}
      else if(text==='{') {
        const object=!!previous && ['=','(', '[',',',':','return','yield'].includes(previous.text);
        const expression=previous?.text==='=>' || previous?.functionExpression;
        groups.push({text,object,expression});extra.object=object;canEnd=false;
      } else if([')',']','}'].includes(text)) {
        const group=groups.pop();
        const expected={')':'(',']':'[','}':'{'}[text];
        if(!group || group.text!==expected) throw new Error('unbalanced brackets.');
        extra.control=!!group.control;extra.object=!!group.object;
        extra.functionExpression=group.functionExpression;
        canEnd=text===')' ? !group.control:text===']' ? true:!!group.object||!!group.expression;
      } else canEnd=['++','--'].includes(text);
      add('punctuation',text,begin,newline,extra);
    }
    if(groups.length || stopAtBrace) throw new Error('unbalanced brackets.');
    return {tokens,end:i};
  }
  function frameBody(source) {
    const parsed=tokenize(source).tokens,code=parsed.filter(t=>t.type!=='comment');
    if(code[0]?.text==='function' && code[1]?.text==='u' && code[2]?.text==='(' && code[3]?.text==='t' && code[4]?.text===')' && code[5]?.text==='{') {
      const last=code.at(-1)?.text===';' ? code.at(-2):code.at(-1);
      let depth=0,closing;
      for(let i=5;i<code.length;i++) {
        if(code[i].text==='{') depth++;
        if(code[i].text==='}' && --depth===0) {closing=code[i];break;}
      }
      if(closing===last) return source.slice(code[5].end,last.start);
    }
    return source;
  }
  function format(tokens) {
    let output='',indent=0,lineStart=true;
    const stack=[];
    const newline=()=>{output=output.trimEnd();if(!output.endsWith('\n')) output+='\n';lineStart=true;};
    const write=(text,space=false)=>{
      if(lineStart) {output+='  '.repeat(Math.max(0,indent));lineStart=false;}
      else if(space && !/[\s]$/.test(output)) output+=' ';
      output+=text;
    };
    let previous=null;
    for(let i=0;i<tokens.length;i++) {
      const token=tokens[i],text=token.text,next=tokens[i+1];
      if(token.newline && previous) newline();
      if(token.type==='comment') {
        write(text,!!previous);if(text.startsWith('//')) newline();
        previous=token;continue;
      }
      if(text==='{') {
        write(text,!!previous && !['(', '[','.','?.'].includes(previous.text));
        stack.push({kind:'brace',object:token.object});indent++;newline();
      } else if(text==='}') {
        indent--;newline();write('}');stack.pop();
        if(next && ![';',',',')',']','.','?.','(','else','catch','finally'].includes(next.text)) newline();
      } else if(text==='(') {
        write('(',previous && (controls.has(previous.text)||['function','switch'].includes(previous.text)));
        stack.push({kind:'paren'});
      } else if(text==='[') {
        write('[',previous && ['return','throw','yield','=',':','=>'].includes(previous.text));stack.push({kind:'bracket'});
      } else if(text===')'||text===']') {output=output.trimEnd();write(text);stack.pop();}
      else if(text===';') {
        output=output.trimEnd();write(';');
        if(!stack.some(g=>g.kind==='paren')) newline();else write(' ');
      } else if(text===',') {
        output=output.trimEnd();write(',');
        if(!stack.some(g=>g.kind==='paren'||g.kind==='bracket')) newline();else write(' ');
      } else if(text==='.'||text==='?.') {output=output.trimEnd();write(text);}
      else if(text===':') {output=output.trimEnd();write(':');write(' ');}
      else if(text==='++'||text==='--') write(text,false);
      else {
        const operator=token.type==='punctuation';
        const prev=previous?.text;
        const space=!!previous && !['(', '[','.','?.'].includes(prev) && !(text==='?' && prev==='?') && (operator || previous.type==='identifier'||previous.type==='number'||[')',']','}'].includes(prev)||previous.type==='string'||previous.type==='regex'||previous.type==='template'||['else','catch','finally'].includes(text));
        write(text,space);
        if(operator) write(' ');
      }
      previous=token;
    }
    return output.trim();
  }
  function unpack(source) {
    if(source.length>50000) throw new Error('keep the input under 50,000 characters.');
    const body=frameBody(source),tokens=tokenize(body).tokens;
    const identifiers=new Set(tokens.filter(t=>t.type==='identifier').map(t=>t.text));
    const unique=base=>{let name=base,i=2;while(identifiers.has(name)) name=base+i++;identifiers.add(name);return name;};
    const canvas=unique('canvas'),context=unique('context'),time=unique('time'),colour=unique('rgba'),update=unique('update'),tick=unique('animate'),start=unique('startedAt');
    const names={c:canvas,x:context,t:time,S:'Math.sin',C:'Math.cos',T:'Math.tan',R:colour,PI:'Math.PI'};
    const dynamic=tokens.some(t=>['function','=>','class','let','const','var','catch','with','eval','Function','globalThis','window','self','this','arguments','delete','of','in'].includes(t.text) || t.object || (t.type==='template'&&t.text.includes('${')));
    const writes=new Set(),changes=new Set(),codeTokens=tokens.filter(t=>t.type!=='comment');
    const neighbours=new Map(codeTokens.map((token,i)=>[token,[codeTokens[i-1]?.text,codeTokens[i+1]?.text]]));
    for(let i=0;i<codeTokens.length;i++) {
      const token=codeTokens[i],prev=codeTokens[i-1]?.text,next=codeTokens[i+1]?.text;
      if(names[token.text] && !['.','?.'].includes(prev) && (['=','+=','-=','*=','/=','%=','**=','&=','|=','^=','<<=','>>=','>>>=','&&=','||=','??=','++','--'].includes(next)||['++','--'].includes(prev))) writes.add(token.text);
      if(token.text==='Math' && (next==='[' || next==='=' || (next==='.'&&['=','+=','-=','++','--'].includes(codeTokens[i+3]?.text)))) for(const alias of ['S','C','T','PI']) writes.add(alias);
    }
    const rewritten=tokens.map(token=>{
      const [prev,next]=neighbours.get(token)||[];
      if(token.type==='identifier' && !dynamic && names[token.text] && !writes.has(token.text) && !['.','?.','break','continue'].includes(prev) && next!==':') {
        changes.add(token.text);return {...token,text:names[token.text]};
      }
      return token;
    });
    const parameter=changes.has('t') ? time:'t';
    const formatted=format(rewritten),indented=formatted.split('\n').map(line=>'  '+line).join('\n');
    const code=`globalThis.u = function ${update}(${parameter}) {
${changes.has('t') && rewritten.some(token=>token.type==='identifier'&&token.text==='t') ? '  let t = '+time+';\n':''}${indented}
};

const ${canvas} = document.getElementById("canvas");
const ${context} = ${canvas}.getContext("2d");
${canvas}.width = 1920;
${canvas}.height = 1080;

function ${colour}(red = 0, green = 0, blue = 0, alpha = 1) {
  return "rgba(" + (red | 0) + "," + (green | 0) + "," + (blue | 0) + "," + alpha + ")";
}

Object.assign(globalThis, {
  c: ${canvas},
  x: ${context},
  S: Math.sin,
  C: Math.cos,
  T: Math.tan,
  R: ${colour},
  PI: Math.PI
});

let ${start};
function ${tick}(timestamp) {
  if (${start} === undefined) ${start} = timestamp;
  globalThis.u((timestamp - ${start}) / 1000);
  requestAnimationFrame(${tick});
}
requestAnimationFrame(${tick});`;
    const notes=[];
    if(dynamic) notes.push('kept aliases around local scopes, objects or dynamic code; the setup above shows what they mean.');
    if(writes.size) notes.push('kept reassigned aliases: '+[...writes].join(', ')+'.');
    return {body,code,formatted,changes:[...changes],notes};
  }
  self.DweetCore={tokenize,frameBody,format,unpack};
})();
