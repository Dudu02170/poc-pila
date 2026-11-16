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
