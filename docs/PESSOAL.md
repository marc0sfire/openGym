# openGym de Marcos e Marih

Adaptação pessoal do openGym de Duarte Santos, preservando React, Zustand, PWA, autenticação,
catálogo, vídeos, registro de séries, progressão, histórico e componentes Capacitor/iOS/watchOS.
Código AGPL-3.0-or-later; mídia Gym visual preservada sem alteração, somente 180 px.
Veja LICENSE e NOTICE.md. O código desta distribuição está em https://github.com/marc0sfire/openGym.

## Usar

Acesse https://opengym-pessoal-ten.vercel.app. No iPhone: Safari → Compartilhar → Adicionar à Tela de Início.
Escolha Marcos ou Marih, depois crie a conta com o convite pessoal entregue separadamente.
O convite só aceita o nome correspondente. Escolha senha própria ou uma chave de acesso.
Selecionar o nome na abertura não autentica nem troca a sessão. Para trocar de conta, saia em Configurações
e autentique a outra conta. Não criamos senhas nem consentimento em nome de vocês.

Cada pessoa autoriza o armazenamento de saúde individualmente. Senhas são verificadas por scrypt;
cookies têm assinatura e proteção HTTPS. Não existe modo convidado no servidor publicado.
Nenhuma das duas contas recebe privilégios de administração, que permitiriam ver dados alheios.

Em Início → Preparar meu treino, escolha Academia do prédio ou Calistenia em casa.
Defina nível, objetivo, duração e dias de força. Os outros dias oferecem mobilidade ou descanso.
Uma sessão de força registrada hoje ou ontem troca a sugestão de hoje por recuperação.
O sistema não agenda automaticamente treino intenso diário, mesmo marcando todos os dias.

O inventário começa vazio e exige confirmação. Cadastre os equipamentos reais. Máquinas têm
requisitos específicos; uma extensora não libera outras máquinas. Equipamentos apenas anotados
ficam fora das sugestões até o cadastro dos respectivos movimentos. O planejador usa um conjunto
conservador de exercícios do catálogo original, com instruções, vídeos e substituições compatíveis.
Em casa usa apenas movimentos sem acessórios. Os ajustes são por conta, inclusive o inventário;
como é a mesma academia, cada pessoa confirma o mesmo equipamento no seu perfil.

Iniciar treino abre o registrador original de séries. Registre cada série e conclua o treino.
Histórico e Estatísticas mostram a evolução. As dicas de progressão de calistenia explicam como
avançar; mudanças de dificuldade são escolhas explícitas. Cargas iniciais não são presumidas.
As durações são estimativas incluindo aquecimento e pausas. A biblioteca completa e o editor
original continuam acessíveis; treinos criados livremente precisam de sua própria conferência.

## Hospedagem e dados

- Vercel: projeto `opengym-pessoal`, conta Marcos Vinícius. Fonte: `marc0sfire/openGym`, ramo `main`.
- Neon: organização gratuita já existente, gerenciada pela Vercel. Ela impede criar novos projetos
  pelo Neon CLI. Foi criado o ramo separado `opengym-pessoal` no projeto existente `projettatrello-db`
  (`autumn-lab-89277494`), sem copiar os registros. Banco `opengym`, papel `opengym`.
- Banco `opengym_validation` é exclusivamente para dados fictícios dos testes. Preview e produção
  usam bancos separados. Não use Preview para dados pessoais reais.
- Segredos somente em variáveis criptografadas da Vercel e arquivos locais ignorados pelo Git.
- Nenhum serviço pago contratado. O consumo continua sujeito às cotas gratuitas das contas.

`api/index.js` é a única função Vercel. `api/cloud.js` usa PostgreSQL e um bloqueio transacional
compartilhado entre instâncias. `api/storage-fs.js` conserva a interface síncrona que a API original
usa, mas seus documentos ficam em memória por requisição e são confirmados em PostgreSQL antes
da resposta. Não são persistidos no filesystem da função. Cada documento/estado é uma linha na
tabela `opengym_documents`; inclui usuários, senhas derivadas, segredo da sessão e estados por uid.
Desafios WebAuthn, códigos de pareamento e limitadores também sobrevivem à troca da instância.
A revisão e a resposta 409 do sincronizador original são preservadas.

É uma arquitetura intencionalmente simples para duas pessoas: requisições ao banco são
serializadas. Não é uma plataforma multiacademia. O backend confere o usuário na sessão, ignora
uid fornecido pelo cliente e exige consentimento pertencente à conta para gravar dados.
Falhas de transação não retornam sucesso. Backups precisam proteger a tabela inteira, incluindo
segredos e credenciais. Não exponha essa tabela nem a conexão ao frontend.

Nesta hospedagem ficam desativados uploads particulares, Coach remoto e push agendado do servidor;
eles dependem de arquivos, processos ou timers duradouros. Vídeos licenciados do catálogo são
arquivos estáticos. O registro básico, histórico e dados corporais usam o banco. Não configure
coach/API keys no servidor desta distribuição sem implementar um armazenamento próprio para isso.

A instalação começa vazia, conforme informado por Marcos. Não havia histórico a migrar.
Para uma futura migração de instalação original, faça backup e execute, antes de inicializar
qualquer dado no banco de destino:

```
DATABASE_URL='obtida de forma segura' node api/scripts/import-files.mjs /caminho/do/backup/data
```

O importador preserva arquivos originais, valida JSON e recusa banco não vazio. Havendo uploads,
recusa a migração até existir destino de objetos, sem descartar arquivos silenciosamente.
Passkeys antigas só continuam válidas se o domínio/RP_ID original for preservado. Nunca altere
RP_ID de uma instalação em uso sem preparar uma outra forma de login.

## iPhone e Apple Watch: componente separado

A PWA funciona sem app nativo. Safari/PWA não tem acesso ao HealthKit nem instala app no relógio.
O componente nativo permanece em `frontend/ios`, fora do deploy web. Este Mac possui apenas
Command Line Tools, sem Xcode completo: não foi realizada compilação iOS nem instalação em aparelho.

Para compilar:

1. Instale Xcode oficial e abra ao menos uma vez. Configure sua equipe de assinatura Apple.
2. Use Node 24. Rode `npm ci --prefix frontend` e `npm ci --prefix api --omit=optional`.
3. Em `frontend`, rode `npm run build:mobile` e `npx cap open ios`.
4. No Xcode, configure Bundle IDs próprios e assinatura de App, Watch, widgets e App Groups,
   mantendo IDs/entitlements coerentes entre alvos. Confira `docs/MOBILE.md` e `docs/WATCH_IOS.md`
   se presente. Recursos HealthKit/App Groups podem exigir equipe com capacidades adequadas;
   não foi comprada assinatura Apple Developer.
5. Selecione o iPhone físico e o Apple Watch pareado de Marcos. Compile e instale os alvos.
6. No app, escolha conectar ao servidor. Na web autenticada, gere o código de pareamento em
   Configurações e use a URL publicada. Cada pessoa pareia sua própria conta no próprio iPhone.
7. Conceda somente as permissões de saúde desejadas. Apple Watch é opcional, desligado inicialmente
   nesta distribuição, e só envia/aplica dados na conta Marcos após seu consentimento.

Preferências Apple Watch e consentimentos/cursor de saúde ficam separados por proprietário.
O Apple Saúde de um celular fica vinculado ao primeiro proprietário que o ativa; a outra conta
não pode ativar a leitura nesse mesmo celular. Use um iPhone por pessoa. Trocar o dono do celular
exige reinstalação/limpeza consciente dos dados locais e novo pareamento. O banco do servidor
não é apagado por uma reinstalação. Eventos repetidos do relógio usam os IDs existentes;
eventos destinados a Marcos não são aplicados à conta Marih.

## Xiaomi Mi Body Composition Scale 2: validação ainda necessária

Primeira rota a testar: balança → Zepp Life → Apple Saúde → app nativo openGym → PostgreSQL.
A Xiaomi confirma o Zepp Life como aplicativo oficial da Scale 2:
https://www.mi.com/ph/support/faq/details/KA-492795/

No iPhone de cada proprietário, pese-se no perfil correto do Zepp Life. Autorize a escrita de peso
no Apple Saúde, se oferecida pela versão instalada. Confira uma medição nova em Saúde → Peso →
Mostrar todos os dados, verificando horário, valor e fonte. Só então ative a leitura de peso no
app nativo openGym, abra o app e espere a sincronização com o servidor. Confira o valor também
na web; repita a abertura e verifique que ele não duplicou. Faça isso separadamente para Marih.
A conta de família do Zepp Life deve encaminhar a cada Apple Saúde apenas o peso do proprietário.
O openGym não identifica quem subiu numa balança compartilhada pela proximidade do peso.

A ponte existente importa peso em kg, mantém o valor manual como prioritário e consolida
medições importadas em um registro por dia. Mantém cursor e IDs de origem no aparelho para evitar
reimportação. Não importa todas as estimativas de composição corporal nem mede por Bluetooth na web.
Não foi testada na balança física; suporte documental e testes simulados não confirmam essa rota.

Se o Zepp Life instalado não gravar no Saúde, a alternativa automática candidata é BLE Scale Sync
no Mac perto da balança, com exportador local para a API autenticada. O projeto declara suporte
à Scale 2 e webhooks: https://blescalesync.dev/ . Isso exige serviço Bluetooth local ligado e
confirmação explícita do proprietário para medições ambíguas; não foi instalado nem testado aqui.
Não envolve Vercel tentando alcançar Bluetooth. A opção imediata continua sendo lançar o peso
manualmente, claramente sem considerar a integração concluída. Nenhum aplicativo pago foi comprado.

## Garmin e Apple Watch: escopo das métricas

A API oficial Garmin Connect exige aprovação no programa de desenvolvedores. Não é um endpoint
pessoal liberado só por ter o relógio. Não cadastramos app fictício nem coletamos senha Garmin.
Documentação: https://developer.garmin.com/gc-developer-program/health-api/

No iPhone 14 Plus de Marih: Venu 3S → Garmin Connect → Apple Saúde. A Garmin documenta que a
transferência acontece com Connect em primeiro plano após sincronizar o dispositivo. A ponte
é Garmin → Saúde; Garmin Connect não recebe dados do Apple Saúde. Frequência cardíaca de
atividades pode ser limitada aos extremos, portanto séries no openGym podem não ter amostras
suficientes. Fonte: https://support.garmin.com/en-US/?faq=lK5FPB9iPF5PXFkIpFlFPA

| Fluxo | Implementação existente reutilizada | Estado real |
|---|---|---|
| openGym iPhone → Apple Saúde | Treinos concluídos e peso; IDs estáveis substituem duplicatas | Exige build, permissões e teste físico |
| Apple Saúde → openGym | Peso e FC durante treinos já registrados no openGym | Exige build e teste físico; não importa sessões externas completas |
| iPhone ↔ Apple Watch Series 9 | Rotinas/séries/pausas para o relógio; séries, esforço e FC de volta | Código preservado; proprietário Marcos; não instalado/testado |
| Garmin → Connect → Apple Saúde | Ponte oficial no iPhone da Marih | Depende de configuração e medição real |
| Saúde/Garmin → openGym, sessões completas | Não implementado pelo leitor atual | Pendente; não anunciado como funcional |
| openGym → Garmin Connect/Venu | Sem API aprovada/ponte de escrita instalada | Não implementado |
| Passos, sono, estresse, Body Battery, SpO2 | Fora do modelo atual | Não sincronizados |

Abertura e retorno ao primeiro plano disparam leituras. O leitor limita a frequência e procura FC
nos treinos do último dia; peso começa pela janela dos últimos 30 dias. Não há promessa de tempo
real ou execução contínua em segundo plano. Importar dados não instala aplicativo Garmin Connect IQ.

## Verificações

`npm test --prefix api`: regressões da API. O teste PostgreSQL é opt-in e recusa qualquer banco
cujo nome não termine em `_validation`:

```
TEST_DATABASE_URL='conexão do banco de validação' node --test api/test/cloud-postgres.test.js
npm test --prefix frontend -- --maxWorkers=4
npm run build --prefix frontend
```

O teste real verifica cadastro, convite por nome, login, isolamento por sessão, consentimento,
conflito 409 e sobrevivência de treino/peso/desafio WebAuthn após reiniciar a API. Os testes de
saúde usam plugins simulados; não são testes de iPhone, balança ou relógio.
