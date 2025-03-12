# WhatsApp Poll

Sistema de enquetes para WhatsApp usando Node.js, Express, TypeScript e Baileys.

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- NPM ou Yarn
- SQLite3

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_SEU_REPOSITORIO]
cd poc-poll
```

2. Instale as dependências:
```bash
npm install
```

3. Crie o banco de dados SQLite:
```bash
npm run typeorm migration:run
```

## ⚙️ Configuração

1. Crie um arquivo `.env` na raiz do projeto (opcional):
```env
PORT=3001
NODE_ENV=development
```

2. O sistema criará automaticamente uma pasta `auth` para armazenar as credenciais do WhatsApp.

## 🏃‍♂️ Executando o projeto

1. Inicie o servidor:
```bash
npm run start
```

2. Acesse a aplicação:
- Abra o navegador e acesse: `http://localhost:3001`
- Clique em "Conectar WhatsApp"
- Escaneie o QR Code com seu WhatsApp

## 📱 Funcionalidades

- Conexão com WhatsApp via QR Code
- Persistência da conexão
- Interface web para gerenciamento
- Sistema de enquetes (em desenvolvimento)

## 🗂️ Estrutura do Projeto

```
poc-poll/
├── src/
│   ├── controllers/    # Controladores da aplicação
│   ├── models/        # Modelos do banco de dados
│   ├── routes/        # Rotas da aplicação
│   ├── services/      # Serviços (WhatsApp, etc)
│   └── app.ts         # Arquivo principal
├── public/
│   ├── css/          # Arquivos de estilo
│   └── js/           # JavaScript do cliente
├── views/            # Templates EJS
└── package.json
```

## 🔒 Arquivos Ignorados

Os seguintes arquivos/pastas são ignorados no controle de versão por conterem dados sensíveis:

- `auth/` - Credenciais do WhatsApp
- `database.sqlite` - Banco de dados local
- `.env` - Variáveis de ambiente

## 🛠️ Desenvolvimento

Para desenvolvimento, você pode usar o modo de desenvolvimento que atualiza automaticamente quando há mudanças:

```bash
npm run dev
```

## ⚠️ Notas Importantes

1. Não compartilhe a pasta `auth` - ela contém suas credenciais do WhatsApp
2. Cada desenvolvedor deve criar seu próprio banco de dados local
3. A conexão com WhatsApp é única por instância

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'feat: Adicionando nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request