import { scenario, assert, until } from './support.js';
async function guest(p) { await p.open(); await p.click('#btVisitante'); await p.element('#orc'); }
async function plan(p) { await guest(p); await p.element('#orc'); }
scenario('rota protegida exige sessao', async p => {
  await p.open('/index.html#/casa/cesta');
  await p.element('#formEntrar');
  assert.match(await p.driver.getCurrentUrl(),/#\/entrar$/);
});
scenario('login com email invalido informa erro', async p => {
  await p.open(); await p.fill('#eEmail','invalido'); await p.click('#btEntrar');
  await p.waitText('#recEntrar','Digite um e-mail válido.');
});
scenario('cadastro rejeita confirmacao de senha divergente', async p => {
  await p.open(); await p.click('#abaCriar');
  for (const [id,value] of Object.entries({cNome:'Pessoa QA',cEmail:'qa@example.test',cSenha:'Senha123',cSenha2:'Outra123'})) await p.fill('#'+id,value);
  await p.click('#btCriar');
  await p.waitText('#recCriar','As duas senhas não são iguais.');
});
scenario('visitante acessa planejamento sem criar conta', async p => {
  await plan(p); assert.match(await p.driver.getCurrentUrl(),/#\/casa\/plano$/);
  assert.equal(await (await p.element('#btMontar')).isEnabled(),false);
});
scenario('orcamento abaixo do minimo impede montar cesta', async p => {
  await plan(p); await p.fill('#orc','1');
  await p.waitText('#recOrc','Abaixo do mínimo possível');
  assert.equal(await (await p.element('#btMontar')).isEnabled(),false);
});
scenario('montar cesta respeita orcamento e permite recarregar', async p => {
  await plan(p); await p.click('[data-guarda="orcAtalho"] [data-v="1300"]');
  await p.click('#btMontar'); await p.element('#catalogo');
  assert.match(await p.driver.getCurrentUrl(),/#\/casa\/cesta$/);
  const total=Number((await p.text('#bTotal')).replace(/[^0-9,]/g,'').replace(',','.'));
  assert.ok(Number.isFinite(total)&&total>0&&total<=1300,'cesta dentro do orçamento');
  await p.driver.wait(() => p.driver.executeScript(`const saved=JSON.parse(localStorage.getItem('pila.estado.visitante')||'null');return saved?.cesta?.length>0&&saved.orcamento===1300;`),5000,'persistência assíncrona da cesta');
  await p.driver.navigate().refresh(); await p.element('#catalogo');
  const restored=Number((await p.text('#bTotal')).replace(/[^0-9,]/g,'').replace(',','.'));
  assert.equal(restored,total,'recarga preserva o total');
  assert.match(await p.driver.getCurrentUrl(),/#\/casa\/cesta$/);
});
scenario('sair encerra sessao de visitante', async p => {
  await guest(p); await p.click('#sair'); await p.element('#formEntrar');
  assert.match(await p.driver.getCurrentUrl(),/#\/entrar$/);
});

async function registrationForm(p,email='qa@example.test'){
 await p.open();await p.click('#abaCriar');
 for(const [id,value] of Object.entries({
  cNome:'Pessoa QA',cEmail:email,cSenha:'SenhaQA123!',cSenha2:'SenhaQA123!'
 })) await p.fill('#'+id,value);
}
async function register(p){
 await registrationForm(p,'QA@EXAMPLE.TEST');
 await p.click('#cAceite');await p.click('#btCriar');await p.element('#orc');
}
const localAccounts=p=>p.driver.executeScript("return JSON.parse(localStorage.getItem('pila.contas')||'[]')");
const localSession=p=>p.driver.executeScript("return JSON.parse(localStorage.getItem('pila.sessao')||'null')");
scenario('cadastro valido permite sair e autenticar novamente sem duplicar conta',async p=>{
 await register(p);
 const accounts=await localAccounts(p);
 assert.equal(accounts.length,1);
 assert.equal(accounts[0].email,'qa@example.test');
 assert.equal(accounts[0].nome,'Pessoa QA');
 assert.equal(await localSession(p),accounts[0].id);
 await p.click('#sair');await p.element('#abaEntrar');await p.click('#abaEntrar');await p.element('#formEntrar');
 assert.equal(await localSession(p),null);
 await p.fill('#eEmail','QA@EXAMPLE.TEST');await p.fill('#eSenha','Errada123!');
 await p.click('#btEntrar');await p.waitText('#recEntrar','E-mail ou senha não confere.');
 assert.equal(await localSession(p),null,'senha incorreta não deve abrir sessão');
 assert.match(await p.driver.getCurrentUrl(),/#\/entrar$/);
 await p.fill('#eSenha','SenhaQA123!');
 if(!(await (await p.element('#lembrar')).isSelected())) await p.click('#lembrar');
 await p.click('#btEntrar');await p.element('#orc');
 assert.equal(await localSession(p),accounts[0].id);
 assert.deepEqual(await localAccounts(p),accounts,'login não deve modificar o cadastro');
 await p.driver.navigate().refresh();await p.element('#orc');
 assert.equal(await localSession(p),accounts[0].id,'sessão lembrada deve sobreviver à recarga');
});
scenario('cadastro duplicado normaliza maiusculas sem sobrescrever a conta',async p=>{
 await register(p);
 const accounts=await localAccounts(p);
 await p.click('#sair');await p.element('#abaEntrar');await p.click('#abaEntrar');await p.element('#formEntrar');await p.click('#abaCriar');
 for(const [id,value] of Object.entries({
  cNome:'Outra Pessoa QA',cEmail:'Qa@Example.Test',cSenha:'OutraSenha123!',cSenha2:'OutraSenha123!'
 })) await p.fill('#'+id,value);
 await p.click('#cAceite');await p.click('#btCriar');
 await p.waitText('#recCriar','Já existe uma conta com esse e-mail.');
 assert.deepEqual(await localAccounts(p),accounts,'duplicata não deve alterar a conta original');
 assert.equal(await localSession(p),null);
 assert.match(await p.driver.getCurrentUrl(),/#\/entrar$/);
});
scenario('cadastro sem aceite dos termos nao grava conta nem sessao',async p=>{
 await registrationForm(p);
 await p.click('#btCriar');
 await p.waitText('#recCriar','Você precisa aceitar os termos para continuar.');
 assert.deepEqual(await localAccounts(p),[]);
 assert.equal(await localSession(p),null);
 assert.equal(await (await p.element('#formCriar')).isDisplayed(),true);
});

const savedGuestBasket=p=>p.driver.executeScript("return JSON.parse(localStorage.getItem('pila.estado.visitante')||'null')");
const visibleBasket=p=>p.driver.executeScript(`return Array.from(document.querySelectorAll('#catalogo .item.escolhido'),item=>({
 g:item.querySelector('[data-mais]').dataset.mais,
 name:item.querySelector('.nome').textContent,
 price:item.querySelector('.preco').textContent,
 qtd:Number(item.querySelector('.n').textContent)
}))`);
scenario('alterar quantidade preserva todos os itens e valores apos recarregar',async p=>{
 await plan(p);await p.click('[data-guarda="orcAtalho"] [data-v="1300"]');
 await p.click('#btMontar');await p.element('#catalogo');
 await p.driver.wait(async()=>{const saved=await savedGuestBasket(p);return saved?.cesta?.length>0&&saved.orcamento===1300;},
 5000,'persistência inicial da cesta');
 const before=await savedGuestBasket(p),displayed=await visibleBasket(p);
 assert.ok(displayed.length>0,'cesta inicial deve ter produtos visíveis');
 const target=displayed[0],quantity=target.qtd+1;
 assert.equal(before.cesta.find(i=>i.g===target.g).qtd,target.qtd);
 const totalBefore=Number((await p.text('#bTotal')).replace(/[^0-9,]/g,'').replace(',','.'));
 const unitPrice=Number(target.price.replace(/[^0-9,]/g,'').replace(',','.'));
 await p.click('#catalogo [data-mais="'+target.g+'"]');
 await p.driver.wait(async()=>{const saved=await savedGuestBasket(p);return saved?.cesta?.find(i=>i.g===target.g)?.qtd===quantity;},
 5000,'quantidade editada deve ser persistida antes da recarga');
 const edited=await savedGuestBasket(p);
 assert.equal(edited.cesta.length,before.cesta.length,'incrementar não deve duplicar o produto');
 assert.equal(edited.cesta.find(i=>i.g===target.g).qtd,quantity);
 assert.deepEqual(edited.cesta.filter(i=>i.g!==target.g),before.cesta.filter(i=>i.g!==target.g),
  'alterar um produto não deve mudar os demais');
 const expected=displayed.map(i=>i.g===target.g?{...i,qtd:quantity}:i);
 assert.deepEqual(await visibleBasket(p),expected,'catálogo deve refletir a edição');
 const editedTotal=Number((await p.text('#bTotal')).replace(/[^0-9,]/g,'').replace(',','.'));
 assert.equal(Math.round(editedTotal*100),Math.round(totalBefore*100)+Math.round(unitPrice*100),
  'uma unidade adicional deve somar exatamente seu preço');
 await p.driver.navigate().refresh();await p.element('#catalogo');
 assert.deepEqual((await savedGuestBasket(p)).cesta,edited.cesta,'armazenamento mantém todos os atributos dos itens');
 assert.deepEqual(await visibleBasket(p),expected,'recarga deve restaurar itens, nomes, preços e quantidades');
 assert.equal(await p.text('#bTotal'), 'R$ '+editedTotal.toFixed(2).replace('.',','));
 assert.match(await p.driver.getCurrentUrl(),/#\/casa\/cesta$/);
});


async function basket(p){
 await p.element('#orc');await p.click('[data-guarda="orcAtalho"] [data-v="1300"]');await p.click('#btMontar');await p.element('#catalogo');
 await p.driver.wait(async()=>!!(await savedGuestBasket(p))?.cesta?.length,5000);
}
const storedState=(p,id)=>p.driver.executeScript('return JSON.parse(localStorage.getItem(arguments[0])||"null")','pila.estado.'+id);
async function afterDebounce(p){await p.driver.executeAsyncScript('const done=arguments[arguments.length-1];setTimeout(done,250)');}
async function quickEditAndLogout(p,g){
 // Two real DOM click handlers in the same task: deterministically before the 120 ms debounce.
 await p.driver.executeScript('document.querySelector("[data-mais="+JSON.stringify(arguments[0])+"]").click();document.getElementById("sair").click()',g);
 await p.element('#abaEntrar');await p.click('#abaEntrar');await p.element('#formEntrar');await afterDebounce(p);
}
scenario('edicao seguida de saida preserva cesta do visitante sem criar estado anonimo',async p=>{
 await guest(p);await basket(p);const before=await savedGuestBasket(p),displayed=await visibleBasket(p),target=before.cesta[0];
 await quickEditAndLogout(p,target.g);
 const expected=before.cesta.map(i=>i.g===target.g?{...i,qtd:i.qtd+1,qtdPlena:i.qtd+1}:i),saved=await savedGuestBasket(p);
 assert.deepEqual(saved.cesta,expected);assert.equal(saved.orcamento,before.orcamento);assert.equal(await localSession(p),null);
 assert.equal(await p.driver.executeScript('return localStorage.getItem("pila.estado")'),null);
 await p.click('#btVisitante');await p.element('[data-vai="casa"]');await p.click('[data-vai="casa"]');await p.element('#catalogo');
 assert.deepEqual(await visibleBasket(p),displayed.map(i=>i.g===target.g?{...i,qtd:i.qtd+1}:i));
 assert.deepEqual((await savedGuestBasket(p)).cesta,expected);
});
scenario('sair com edicao pendente grava somente estado da conta e preserva visitante',async p=>{
 await guest(p);await basket(p);const visitor=await savedGuestBasket(p);
 await p.click('#sair');await p.element('#formEntrar');await register(p);
 const account=(await localAccounts(p))[0];await p.click('[data-guarda="orcAtalho"] [data-v="1300"]');await p.click('#btMontar');await p.element('#catalogo');
 await p.driver.wait(async()=>!!(await storedState(p,account.id))?.cesta?.length,5000);
 const before=await storedState(p,account.id),target=before.cesta[0];
 await quickEditAndLogout(p,target.g);
 const expected=before.cesta.map(i=>i.g===target.g?{...i,qtd:i.qtd+1,qtdPlena:i.qtd+1}:i);
 assert.deepEqual((await storedState(p,account.id)).cesta,expected);assert.deepEqual(await savedGuestBasket(p),visitor);
 assert.equal(await localSession(p),null);assert.equal(await p.driver.executeScript('return localStorage.getItem("pila.estado")'),null);
 await p.fill('#eEmail','qa@example.test');await p.fill('#eSenha','SenhaQA123!');await p.click('#btEntrar');await p.element('[data-vai="casa"]');await p.click('[data-vai="casa"]');await p.element('#catalogo');
 assert.deepEqual((await storedState(p,account.id)).cesta,expected);assert.equal((await visibleBasket(p)).find(i=>i.g===target.g).qtd,target.qtd+1);
});
scenario('recarga imediata depois de editar confirma pendencia antes de trocar documento',async p=>{
 await guest(p);await basket(p);const before=await savedGuestBasket(p),displayed=await visibleBasket(p),target=before.cesta[0],old=await p.element('#catalogo');
 await p.driver.executeScript('document.querySelector("[data-mais="+JSON.stringify(arguments[0])+"]").click();location.reload()',target.g);
 await p.driver.wait(until.stalenessOf(old),10000);await p.element('#catalogo');
 const expected=before.cesta.map(i=>i.g===target.g?{...i,qtd:i.qtd+1,qtdPlena:i.qtd+1}:i);
 assert.deepEqual((await savedGuestBasket(p)).cesta,expected);assert.deepEqual(await visibleBasket(p),displayed.map(i=>i.g===target.g?{...i,qtd:i.qtd+1}:i));
 assert.equal(await p.driver.executeScript('return localStorage.getItem("pila.estado")'),null);
});
