import { scenario, assert } from './support.js';
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
 await p.click('#sair');await p.element('#formEntrar');
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
 await p.click('#sair');await p.element('#formEntrar');await p.click('#abaCriar');
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
 assert.match(await p.driver.getCurrentUrl(),/#\/entrar$/);
});
