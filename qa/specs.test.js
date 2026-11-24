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

async function centeredClick(p,selector){
 const element=await p.element(selector);
 await p.driver.executeScript('arguments[0].scrollIntoView({block:"center",behavior:"instant"})',element);
 await element.click();
}
async function shoppingForReuse(p){
 await guest(p);await p.click('#dobraPerfil summary');
 await p.click('#v-plano [data-guarda="pessoas"] [data-v="3"]');await p.click('#v-plano [data-guarda="dias"] [data-v="7"]');await p.click('#v-plano [data-guarda="restricoes"] [data-v="gluten"]');
 await basket(p);const bananaBefore=(await savedGuestBasket(p)).cesta.find(i=>i.g==='banana').qtd;await p.click('#catalogo [data-mais="banana"]');await p.click('#v-cesta [data-guarda="filtro"] [data-v="barato"]');
 await p.driver.wait(async()=>{const s=await savedGuestBasket(p);return s?.filtro==='barato'&&s.cesta.find(i=>i.g==='banana')?.qtd===bananaBefore+1;},5000);
 const displayed=await visibleBasket(p),plannedTotal=await p.text('#bTotal');
 await p.click('#troca [data-modo="mercado"]');await p.element('#rotaCorpo');
 await p.click('.corredor-atual [data-pega="banana"]');await p.click('.corredor-atual [data-faltou="tomate"]');
 await centeredClick(p,'#dobraBusca summary');await p.fill('#buscaMerc','cafe');await centeredClick(p,'#dobraLista summary');
 await p.click('#bSeguir');await p.element('#bilhete .cod');await p.click('#v-pagar [data-guarda="canal"] [data-v="totem"]');
 await p.driver.wait(async()=>{const s=await savedGuestBasket(p);return !!s?.codigo&&s.canal==='totem'&&s.abreBusca&&s.abreLista&&s.buscaMerc==='cafe';},5000);
 return {before:await savedGuestBasket(p),displayed,plannedTotal};
}
const reusedState=before=>({...before,cesta:before.cesta.map(i=>({...i,pego:false,faltou:false})),codigo:null,corredorAtual:null,abreBusca:false,abreLista:false,buscaMerc:'',aba:'carrinho',modo:'casa'});
scenario('reutiliza lista editada preservando itens perfil valores e liberando nova compra',async p=>{
 const {before,displayed,plannedTotal}=await shoppingForReuse(p),expected=reusedState(before);
 assert.ok(before.cesta.some(i=>i.pego));assert.ok(before.cesta.some(i=>i.faltou));
 await p.click('#reutilizarLista');await p.alert(/produtos, quantidades e orçamento serão mantidos/);await p.element('#catalogo');
 assert.match(await p.driver.getCurrentUrl(),/#\/casa\/cesta$/);assert.deepEqual(await savedGuestBasket(p),expected);assert.deepEqual(await visibleBasket(p),displayed);assert.equal(await p.text('#bTotal'),plannedTotal);
 await p.driver.navigate().refresh();await p.element('#catalogo');assert.deepEqual(await savedGuestBasket(p),expected);assert.deepEqual(await visibleBasket(p),displayed);
 await p.click('#troca [data-modo="mercado"]');await p.waitText('#mercPegos','0 de '+before.cesta.length+' itens');await p.waitText('#mercValor','R$ 0,00');
 assert.equal((await savedGuestBasket(p)).cesta.filter(i=>i.pego||i.faltou).length,0);
 await p.click('#bSeguir');await p.waitText('#bilhete','Você ainda não marcou nenhum item');assert.equal((await savedGuestBasket(p)).codigo,null);
 await p.click('#v-pagar [data-rota="#/mercado/rota"]');await p.click('.corredor-atual [data-pega="banana"]');await p.click('#bSeguir');await p.element('#bilhete .cod');
 await p.driver.wait(async()=>!!(await savedGuestBasket(p))?.codigo,5000);assert.match((await savedGuestBasket(p)).codigo,/^PLA-[A-Z2-9]{4}-\d{4}$/);assert.equal((await savedGuestBasket(p)).cesta.filter(i=>i.pego).length,1);
});
scenario('cancelar reutilizacao preserva codigo marcacoes e todos os dados da compra',async p=>{
 const {before}=await shoppingForReuse(p),code=await p.text('#bilhete .cod');
 await p.click('#reutilizarLista');const dialog=await p.driver.wait(until.alertIsPresent(),10000);assert.match(await dialog.getText(),/código anterior serão limpos/);await dialog.dismiss();await afterDebounce(p);
 assert.match(await p.driver.getCurrentUrl(),/#\/mercado\/pagar$/);assert.deepEqual(await savedGuestBasket(p),before);assert.equal(await p.text('#bilhete .cod'),code);
});
scenario('comecar nova compra continua limpando cesta depois da confirmacao',async p=>{
 const {before}=await shoppingForReuse(p);await p.click('#novaCompra');await p.alert(/lista atual será apagada/);await p.element('#orc');
 await p.driver.wait(async()=>{const s=await savedGuestBasket(p);return s?.cesta?.length===0&&s.codigo===null;},5000);
 const after=await savedGuestBasket(p);for(const key of ['pessoas','dias','restricoes','extras','filtro','orcamento'])assert.deepEqual(after[key],before[key]);
 assert.deepEqual(after.cesta,[]);assert.equal(after.montada,false);assert.match(await p.driver.getCurrentUrl(),/#\/casa\/plano$/);
});
scenario('conta reutiliza lista sem marcacoes e sem alterar cesta do visitante',async p=>{
 await guest(p);await basket(p);const visitor=await savedGuestBasket(p);await p.click('#sair');await p.element('#formEntrar');await register(p);const id=(await localAccounts(p))[0].id;
 await p.click('[data-guarda="orcAtalho"] [data-v="1300"]');await p.click('#btMontar');await p.element('#catalogo');await p.driver.wait(async()=>!!(await storedState(p,id))?.cesta?.length,5000);
 await p.click('#troca [data-modo="mercado"]');await p.click('#bSeguir');await p.waitText('#bilhete','Você ainda não marcou nenhum item');
 await p.driver.wait(async()=>(await storedState(p,id))?.modo==='mercado',5000);const before=await storedState(p,id);
 await p.click('#reutilizarLista');await p.alert(/Reutilizar esta lista/);await p.element('#catalogo');assert.deepEqual(await storedState(p,id),reusedState(before));assert.deepEqual(await savedGuestBasket(p),visitor);assert.equal(await localSession(p),id);
 await p.driver.navigate().refresh();await p.element('#catalogo');assert.deepEqual(await storedState(p,id),reusedState(before));assert.deepEqual(await savedGuestBasket(p),visitor);
});

async function failStateWrites(p,id='visitante'){
 await p.driver.executeScript('const blocked=arguments[0],original=Storage.prototype.setItem;window.__qaStateSetItem=original;Storage.prototype.setItem=function(key,value){if(key===blocked)throw new DOMException("QA quota","QuotaExceededError");return original.call(this,key,value)}','pila.estado.'+id);
}
const restoreStateWrites=p=>p.driver.executeScript('Storage.prototype.setItem=window.__qaStateSetItem');
const savedNoticeHidden=p=>p.driver.wait(()=>p.driver.executeScript('return document.getElementById("salvamentoAviso").hidden'),5000);
const incrementedBasket=(before,g)=>before.cesta.map(i=>i.g===g?{...i,qtd:i.qtd+1,qtdPlena:i.qtd+1}:i);
scenario('falha ao gravar lista avisa preserva memoria e permite tentar salvar novamente',async p=>{
 await guest(p);await basket(p);const before=await savedGuestBasket(p),displayed=await visibleBasket(p),target=before.cesta[0];
 await failStateWrites(p);await p.click('#catalogo [data-mais="'+target.g+'"]');await p.waitText('#salvamentoAviso','só na memória desta aba');
 assert.deepEqual(await savedGuestBasket(p),before);assert.deepEqual(await visibleBasket(p),displayed.map(i=>i.g===target.g?{...i,qtd:i.qtd+1}:i));
 await p.click('#salvarNovamente');await p.waitText('#salvamentoAviso','Não foi possível salvar');assert.deepEqual(await savedGuestBasket(p),before);
 await restoreStateWrites(p);await p.click('#salvarNovamente');await savedNoticeHidden(p);
 const expected=incrementedBasket(before,target.g);assert.deepEqual((await savedGuestBasket(p)).cesta,expected);
 await p.driver.navigate().refresh();await p.element('#catalogo');assert.deepEqual((await savedGuestBasket(p)).cesta,expected);assert.deepEqual(await visibleBasket(p),displayed.map(i=>i.g===target.g?{...i,qtd:i.qtd+1}:i));
});
scenario('sair nao descarta edicao nem sessao enquanto lista nao pode ser gravada',async p=>{
 await guest(p);await basket(p);const before=await savedGuestBasket(p),target=before.cesta[0];await failStateWrites(p);
 await p.driver.executeScript('document.querySelector("[data-mais="+JSON.stringify(arguments[0])+"]").click();document.getElementById("sair").click()',target.g);
 await p.waitText('#salvamentoAviso','Não foi possível salvar');await afterDebounce(p);
 assert.match(await p.driver.getCurrentUrl(),/#\/casa\/cesta$/);assert.equal(await localSession(p),'visitante');assert.deepEqual(await savedGuestBasket(p),before);assert.equal((await visibleBasket(p)).find(i=>i.g===target.g).qtd,target.qtd+1);
 await restoreStateWrites(p);await p.click('#salvarNovamente');await savedNoticeHidden(p);await p.click('#sair');await p.element('#formEntrar');
 assert.equal(await localSession(p),null);assert.deepEqual((await savedGuestBasket(p)).cesta,incrementedBasket(before,target.g));assert.equal(await p.driver.executeScript('return localStorage.getItem("pila.estado")'),null);
});
scenario('retry grava somente lista da conta sem modificar visitante ou cadastro',async p=>{
 await guest(p);await basket(p);const visitor=await savedGuestBasket(p);await p.click('#sair');await p.element('#formEntrar');await register(p);const account=(await localAccounts(p))[0],accounts=await localAccounts(p);
 await p.click('[data-guarda="orcAtalho"] [data-v="1300"]');await p.click('#btMontar');await p.element('#catalogo');await p.driver.wait(async()=>!!(await storedState(p,account.id))?.cesta?.length,5000);
 const before=await storedState(p,account.id),target=before.cesta[0];await failStateWrites(p,account.id);await p.click('#catalogo [data-mais="'+target.g+'"]');await p.waitText('#salvamentoAviso','Não foi possível salvar');
 assert.deepEqual(await storedState(p,account.id),before);assert.deepEqual(await savedGuestBasket(p),visitor);assert.deepEqual(await localAccounts(p),accounts);
 await restoreStateWrites(p);await p.click('#salvarNovamente');await savedNoticeHidden(p);assert.deepEqual((await storedState(p,account.id)).cesta,incrementedBasket(before,target.g));assert.deepEqual(await savedGuestBasket(p),visitor);assert.deepEqual(await localAccounts(p),accounts);assert.equal(await localSession(p),account.id);
});
scenario('reutilizacao com falha informa estado temporario e retry grava a lista reutilizada',async p=>{
 const {before,displayed}=await shoppingForReuse(p);await failStateWrites(p);await p.click('#reutilizarLista');await p.alert(/Reutilizar esta lista/);await p.element('#catalogo');await p.waitText('#salvamentoAviso','só na memória desta aba');
 assert.deepEqual(await savedGuestBasket(p),before);assert.deepEqual(await visibleBasket(p),displayed);
 await restoreStateWrites(p);await p.click('#salvarNovamente');await savedNoticeHidden(p);assert.deepEqual(await savedGuestBasket(p),reusedState(before));
 await p.driver.navigate().refresh();await p.element('#catalogo');assert.deepEqual(await savedGuestBasket(p),reusedState(before));
});
scenario('falha ao remover sessao mantem usuario e informa nova tentativa de sair',async p=>{
 await guest(p);await basket(p);const before=await savedGuestBasket(p);
 await p.driver.executeScript('const original=Storage.prototype.removeItem;window.__qaRemoveItem=original;Storage.prototype.removeItem=function(key){if(key==="pila.sessao")throw new DOMException("QA denied","SecurityError");return original.call(this,key)}');
 await p.click('#sair');await p.waitText('#salvamentoAviso','Não foi possível encerrar a sessão local');assert.equal(await localSession(p),'visitante');assert.deepEqual(await savedGuestBasket(p),before);assert.match(await p.driver.getCurrentUrl(),/#\/casa\/cesta$/);assert.equal(await p.driver.executeScript('return document.getElementById("salvarNovamente").hidden'),true);
 await p.driver.executeScript('Storage.prototype.removeItem=window.__qaRemoveItem');await p.click('#sair');await p.element('#formEntrar');assert.equal(await localSession(p),null);assert.deepEqual(await savedGuestBasket(p),before);
});
